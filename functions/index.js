// DevSocio Cloud Functions (2nd gen). Reached via Firebase Hosting rewrites:
//   /api/ai       -> ai       (OpenRouter proxy; key stays server-side)
//   /api/credits  -> credits  (trusted credit earning + referrals)
//
// Admin access is automatic here (default service account) — no key file needed.
// Set the OpenRouter key in functions/.env: OPENROUTER_API_KEY=sk-or-...
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()
const db = () => admin.firestore()
const inc = (n) => admin.firestore.FieldValue.increment(n)
const now = () => admin.firestore.FieldValue.serverTimestamp()

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'
const FALLBACK_MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// AI proxy
// ---------------------------------------------------------------------------
async function callModel(model, messages, temperature, maxTokens) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://devsocio-8f0c0.web.app',
      'X-Title': 'DevSocio',
    },
    body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${detail.slice(0, 160)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter returned an empty response')
  return text
}

exports.ai = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!OPENROUTER_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' })
  try {
    const { messages, temperature = 0.7, maxTokens = 500 } = req.body || {}
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages[] required' })
    const candidates = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)]
    let lastErr
    for (const model of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return res.status(200).json({ text: await callModel(model, messages, temperature, maxTokens) })
        } catch (err) {
          lastErr = err
          if (err.status === 429 && attempt === 0) { await sleep(1200); continue }
          break
        }
      }
    }
    return res.status(502).json({ error: lastErr?.message || 'All models failed' })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'AI request failed' })
  }
})

// ---------------------------------------------------------------------------
// Trusted credit earning + referrals
// ---------------------------------------------------------------------------
async function uidByUsername(username) {
  if (!username) return null
  const snap = await db().collection('users').where('username', '==', username).limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}

exports.credits = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) return res.status(401).json({ error: 'Missing auth token' })
    const { uid } = await admin.auth().verifyIdToken(token)
    const { action } = req.body || {}
    const ref = db().collection('users').doc(uid)

    if (action === 'daily_login') {
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const last = d.lastDailyAt?.toMillis ? d.lastDailyAt.toMillis() : 0
        if (Date.now() - last < 20 * 60 * 60 * 1000) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(5), lastDailyAt: now() })
        return { credits: (d.credits || 0) + 5, awarded: 5 }
      })
      return res.status(200).json(out)
    }

    if (action === 'profile_complete') {
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.profileBonusPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(50), profileBonusPaid: true })
        return { credits: (d.credits || 0) + 50, awarded: 50 }
      })
      return res.status(200).json(out)
    }

    if (action === 'referral_signup') {
      const d0 = (await ref.get()).data() || {}
      if (d0.referralPaid || !d0.referredBy) return res.status(200).json({ credits: d0.credits || 0, awarded: 0 })
      const refUid = await uidByUsername(d0.referredBy)
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.referralPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(150), referralPaid: true })
        if (refUid && refUid !== uid) tx.update(db().collection('users').doc(refUid), { credits: inc(150) })
        return { credits: (d.credits || 0) + 150, awarded: 150 }
      })
      return res.status(200).json(out)
    }

    if (action === 'post_reward') {
      const pd = (await ref.get()).data() || {}
      const refUid = pd.referredBy && !pd.referralFirstPostPaid ? await uidByUsername(pd.referredBy) : null
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const update = { credits: inc(30) }
        if (refUid && refUid !== uid && !d.referralFirstPostPaid) {
          update.referralFirstPostPaid = true
          tx.update(db().collection('users').doc(refUid), { credits: inc(50) })
        }
        tx.update(ref, update)
        return { credits: (d.credits || 0) + 30, awarded: 30 }
      })
      return res.status(200).json(out)
    }

    return res.status(400).json({ error: 'Unknown credit action' })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Credit request failed' })
  }
})
