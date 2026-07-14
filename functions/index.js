// DevSocio Cloud Functions (2nd gen). Reached via Firebase Hosting rewrites:
//   /api/ai       -> ai       (OpenRouter proxy; key stays server-side)
//   /api/credits  -> credits  (trusted credit earning + referrals)
//
// Admin access is automatic here (default service account) — no key file needed.
// Set the OpenRouter key in functions/.env: OPENROUTER_API_KEY=sk-or-...
//
// SECURITY: All handlers now require a valid Firebase ID token (was previously
// open via CORS only). Messages array is size-capped and per-message content
// length is capped. Temperature and maxTokens are clamped. Rate-limited per
// uid (best-effort in-memory; production should use a shared store).
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

// Hard limits — keep tight to prevent cost amplification.
const MAX_MESSAGES = 50
const MAX_MESSAGE_BYTES = 4 * 1024
const MAX_TOTAL_BYTES = 32 * 1024
const MAX_TEMPERATURE = 2
const MAX_TOKENS = 2000
const RATE_BUCKET = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 60
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://devsocio.app'

function applyCors(req, res) {
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin && (origin === CORS_ORIGIN || /\.devsocio\.app$/.test(new URL(origin).host))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  }
}

function rateLimit(uid) {
  if (!uid) return true
  const bucket = RATE_BUCKET.get(uid) || []
  const now = Date.now()
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS)
  if (fresh.length >= RATE_MAX) {
    RATE_BUCKET.set(uid, fresh)
    return false
  }
  fresh.push(now)
  RATE_BUCKET.set(uid, fresh)
  return true
}

async function verifyAuth(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) {
    res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Missing auth token' } })
    return null
  }
  try {
    return await admin.auth().verifyIdToken(token, true)
  } catch {
    res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Invalid or expired token' } })
    return null
  }
}

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
    const err = new Error(`OpenRouter ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty_response')
  return text
}

exports.ai = onRequest({ cors: false, region: 'us-central1' }, async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 'method_not_allowed', message: 'Method not allowed' } })
  if (!OPENROUTER_KEY) return res.status(500).json({ ok: false, error: { code: 'server_misconfigured', message: 'AI not configured' } })

  const decoded = await verifyAuth(req, res)
  if (!decoded) return
  if (!rateLimit(`ai:${decoded.uid}`)) {
    return res.status(429).json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } })
  }

  try {
    const body = req.body || {}
    const { messages } = body
    let { temperature = 0.7, maxTokens = 500 } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'messages[] is required' } })
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ ok: false, error: { code: 'bad_request', message: `Too many messages (max ${MAX_MESSAGES})` } })
    }
    let totalBytes = 0
    for (const m of messages) {
      if (!m || typeof m !== 'object') {
        return res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'Each message must be an object' } })
      }
      if (m.role !== 'user' && m.role !== 'system' && m.role !== 'assistant') {
        return res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'message.role must be user|system|assistant' } })
      }
      const content = m.content
      if (typeof content !== 'string') {
        return res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'message.content must be a string' } })
      }
      const bytes = Buffer.byteLength(content, 'utf8')
      if (bytes > MAX_MESSAGE_BYTES) {
        return res.status(400).json({ ok: false, error: { code: 'bad_request', message: `Message too long (max ${MAX_MESSAGE_BYTES} bytes)` } })
      }
      totalBytes += bytes
      if (totalBytes > MAX_TOTAL_BYTES) {
        return res.status(400).json({ ok: false, error: { code: 'bad_request', message: `Total messages too long (max ${MAX_TOTAL_BYTES} bytes)` } })
      }
    }

    const tNum = Number(temperature)
    temperature = Number.isFinite(tNum) ? Math.max(0, Math.min(MAX_TEMPERATURE, tNum)) : 0.7
    const mNum = Number(maxTokens)
    maxTokens = Number.isFinite(mNum) ? Math.max(1, Math.min(MAX_TOKENS, Math.round(mNum))) : 500

    const candidates = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)]
    let lastErr
    for (const model of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return res.status(200).json({ ok: true, text: await callModel(model, messages, temperature, maxTokens) })
        } catch (err) {
          lastErr = err
          if (err.status === 429 && attempt === 0) { await sleep(1200); continue }
          break
        }
      }
    }
    return res.status(502).json({ ok: false, error: { code: 'upstream_failed', message: 'All AI models are currently unavailable' } })
  } catch (err) {
    console.error('ai handler error:', err?.message || err)
    return res.status(500).json({ ok: false, error: { code: 'internal_error', message: 'AI request failed' } })
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

exports.credits = onRequest({ cors: false, region: 'us-central1' }, async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 'method_not_allowed', message: 'Method not allowed' } })
  const decoded = await verifyAuth(req, res)
  if (!decoded) return
  if (!rateLimit(`credits:${decoded.uid}`)) {
    return res.status(429).json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } })
  }
  try {
    const { uid } = decoded
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
      return res.status(200).json({ ok: true, ...out })
    }

    if (action === 'profile_complete') {
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.profileBonusPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(50), profileBonusPaid: true })
        return { credits: (d.credits || 0) + 50, awarded: 50 }
      })
      return res.status(200).json({ ok: true, ...out })
    }

    if (action === 'referral_signup') {
      const d0 = (await ref.get()).data() || {}
      if (d0.referralPaid || !d0.referredBy) return res.status(200).json({ ok: true, credits: d0.credits || 0, awarded: 0 })
      const refUid = await uidByUsername(d0.referredBy)
      const out = await db().runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.referralPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(150), referralPaid: true })
        if (refUid && refUid !== uid) tx.update(db().collection('users').doc(refUid), { credits: inc(150) })
        return { credits: (d.credits || 0) + 150, awarded: 150 }
      })
      return res.status(200).json({ ok: true, ...out })
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
      return res.status(200).json({ ok: true, ...out })
    }

    return res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'Unknown credit action' } })
  } catch (err) {
    console.error('credits handler error:', err?.message || err)
    return res.status(500).json({ ok: false, error: { code: 'internal_error', message: 'Credit request failed' } })
  }
})
