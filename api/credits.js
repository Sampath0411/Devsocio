// Vercel Serverless Function — trusted credit earning + referrals (PRD §5).
//
// Anything the browser can do, a user can replay — so credit EARNING runs here
// with the Firebase Admin SDK (bypasses rules), verifies the caller, and applies
// only server-defined amounts. Referral payouts (+150 each on signup, +50 to the
// referrer on the referred user's first post) are enforced once via flags.
//
// SECURITY: Spend amounts are server-defined via an action enum — clients
// cannot pick the cost or description. All credit-log writes happen inside
// the same transaction as the credit update, so a failure cannot leave the
// log out of sync with the balance.
//
// Vercel → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT = <full service-account JSON pasted as one value>
//   ALLOWED_ORIGIN           (optional) — defaults to https://devsocio.app

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const inc = (n) => admin.firestore.FieldValue.increment(n)
const now = () => admin.firestore.FieldValue.serverTimestamp()
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://devsocio.app'

// In-memory rate limit bucket (per-process, fine for free tier).
const RATE_BUCKET = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_UID = 30

function rateLimit(uid) {
  if (!uid) return true
  const now = Date.now()
  const bucket = RATE_BUCKET.get(uid) || []
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS)
  if (fresh.length >= RATE_MAX_PER_UID) {
    RATE_BUCKET.set(uid, fresh)
    return false
  }
  fresh.push(now)
  RATE_BUCKET.set(uid, fresh)
  return true
}

// Server-defined spend actions. Client must specify the action key + the
// target id; amount and description are looked up here.
const SPEND_ACTIONS = {
  invest_idea: { cost: 50, description: 'Invested in idea' },
  redeem_featured: { cost: 200, description: 'Redeemed: Featured Post (24h)' },
  redeem_profile_boost: { cost: 150, description: 'Redeemed: Profile Boost (48h)' },
  redeem_verified_badge: { cost: 500, description: 'Redeemed: Verified Badge (manual review)' },
  redeem_ai_persona: { cost: 300, description: 'Redeemed: Custom AI Persona' },
  redeem_extra_credits: { cost: 80, description: 'Redeemed: +50 Credits' },
  redeem_theme: { cost: 100, description: 'Redeemed: Premium Theme' },
  redeem_top_dev: { cost: 1000, description: 'Redeemed: Top Dev Badge' },
}

const TARGET_ID_RE = /^[A-Za-z0-9_\-]{1,80}$/

function applyCors(req, res) {
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  }
}

function bad(res, status, code, message) {
  res.status(status).json({ ok: false, error: { code, message } })
}

async function uidByUsername(db, username) {
  if (!username) return null
  const snap = await db.collection('users').where('username', '==', username).limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') {
    bad(res, 405, 'method_not_allowed', 'Use POST')
    return
  }

  try {
    const app = getApp()
    const db = app.firestore()

    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) { bad(res, 401, 'unauthorized', 'Missing auth token'); return }

    let decoded
    try {
      decoded = await app.auth().verifyIdToken(token, true)
    } catch {
      bad(res, 401, 'unauthorized', 'Invalid or expired token')
      return
    }
    const uid = decoded.uid
    if (!rateLimit(uid)) {
      bad(res, 429, 'rate_limited', 'Too many credit requests.')
      return
    }
    const ref = db.collection('users').doc(uid)
    const { action } = req.body || {}

    // --- Daily login (+5, with streak tracking; 7-day streak = +100 bonus) ---
    if (action === 'daily_login') {
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const last = d.lastDailyAt?.toMillis ? d.lastDailyAt.toMillis() : 0
        const nowMs = Date.now()
        if (nowMs - last < 20 * 60 * 60 * 1000) {
          return { credits: d.credits || 0, awarded: 0, streak: d.loginStreak || 0 }
        }
        const gapMs = nowMs - last
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000
        const prevStreak = d.loginStreak || 0
        const newStreak = gapMs <= twoDaysMs && last > 0 ? prevStreak + 1 : 1
        let awarded = 5
        let streakBonus = 0
        if (newStreak % 7 === 0) { streakBonus = 100; awarded += 100 }
        tx.update(ref, {
          credits: inc(awarded),
          lastDailyAt: now(),
          loginStreak: newStreak,
          longestStreak: Math.max(newStreak, d.longestStreak || 0),
        })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: awarded,
          type: 'earn',
          description: streakBonus ? `Daily login +5 + 7-day streak bonus +100` : 'Daily login',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { credits: (d.credits || 0) + awarded, awarded, streak: newStreak, streakBonus }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Profile completion (+50, once) ---
    if (action === 'profile_complete') {
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.profileBonusPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(50), profileBonusPaid: true })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: 50,
          type: 'earn',
          description: 'Profile completion bonus',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { credits: (d.credits || 0) + 50, awarded: 50 }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Referral signup (+150 to both, once) ---
    if (action === 'referral_signup') {
      const d0 = (await ref.get()).data() || {}
      if (d0.referralPaid || !d0.referredBy) {
        res.status(200).json({ ok: true, credits: d0.credits || 0, awarded: 0 })
        return
      }
      const refUid = await uidByUsername(db, d0.referredBy)
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.referralPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(150), referralPaid: true })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: 150,
          type: 'earn',
          description: 'Referral signup bonus',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        if (refUid && refUid !== uid) {
          tx.update(db.collection('users').doc(refUid), { credits: inc(150) })
          const refLogRef = db.collection('users').doc(refUid).collection('credits_log').doc()
          tx.set(refLogRef, {
            amount: 150,
            type: 'earn',
            description: 'Referral signup bonus (referrer)',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
        return { credits: (d.credits || 0) + 150, awarded: 150 }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Post reward (+30, once per user) + referrer first-post bonus (+50, once) ---
    if (action === 'post_reward') {
      const pd = (await ref.get()).data() || {}
      if (pd.postRewardPaid) {
        res.status(200).json({ ok: true, credits: pd.credits || 0, awarded: 0 })
        return
      }
      const refUid = pd.referredBy && !pd.referralFirstPostPaid ? await uidByUsername(db, pd.referredBy) : null
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.postRewardPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(30), postRewardPaid: true })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: 30,
          type: 'earn',
          description: 'Post published',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        if (refUid && refUid !== uid && !d.referralFirstPostPaid) {
          tx.update(db.collection('users').doc(refUid), { credits: inc(50), referralFirstPostPaid: true })
          const refLogRef = db.collection('users').doc(refUid).collection('credits_log').doc()
          tx.set(refLogRef, {
            amount: 50,
            type: 'earn',
            description: 'Referral first post bonus',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          return { credits: (d.credits || 0) + 30, awarded: 30, referrerBonus: 50 }
        }
        return { credits: (d.credits || 0) + 30, awarded: 30, referrerBonus: 0 }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Post milestone: 10 likes → +20 credits (once per post) ---
    if (action === 'post_10_likes') {
      const { postId } = req.body || {}
      if (!postId) { bad(res, 400, 'bad_request', 'postId required'); return }
      const postRef = db.collection('posts').doc(postId)
      const out = await db.runTransaction(async (tx) => {
        const p = (await tx.get(postRef)).data() || {}
        if (p.authorUid !== uid) return { credits: 0, awarded: 0 }
        if ((p.likes || 0) < 10) return { credits: 0, awarded: 0 }
        if (p.milestone10Paid) return { credits: 0, awarded: 0 }
        tx.update(postRef, { milestone10Paid: true })
        tx.update(ref, { credits: inc(20) })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: 20,
          type: 'earn',
          description: 'Post hit 10 likes',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { awarded: 20 }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Post milestone: 50 likes → +50 credits (once per post) ---
    if (action === 'post_50_likes') {
      const { postId } = req.body || {}
      if (!postId) { bad(res, 400, 'bad_request', 'postId required'); return }
      const postRef = db.collection('posts').doc(postId)
      const out = await db.runTransaction(async (tx) => {
        const p = (await tx.get(postRef)).data() || {}
        if (p.authorUid !== uid) return { credits: 0, awarded: 0 }
        if ((p.likes || 0) < 50) return { credits: 0, awarded: 0 }
        if (p.milestone50Paid) return { credits: 0, awarded: 0 }
        tx.update(postRef, { milestone50Paid: true })
        tx.update(ref, { credits: inc(50) })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: 50,
          type: 'earn',
          description: 'Post hit 50 likes',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { awarded: 50 }
      })
      res.status(200).json({ ok: true, ...out })
      return
    }

    // --- Spend credits (server-defined cost; no free-form amounts) ---
    if (action === 'spend') {
      const { spendKey, targetId } = req.body || {}
      const rule = SPEND_ACTIONS[spendKey]
      if (!rule) { bad(res, 400, 'bad_request', 'Unknown spend action'); return }
      if (targetId && !TARGET_ID_RE.test(targetId)) {
        bad(res, 400, 'bad_request', 'Invalid targetId')
        return
      }
      const description = targetId ? `${rule.description} (${targetId})` : rule.description
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const balance = d.credits || 0
        if (balance < rule.cost) return { credits: balance, awarded: 0, ok: false, reason: 'insufficient_funds' }
        tx.update(ref, { credits: inc(-rule.cost) })
        const logRef = ref.collection('credits_log').doc()
        tx.set(logRef, {
          amount: -rule.cost,
          type: 'spend',
          description,
          spendKey,
          targetId: targetId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { credits: balance - rule.cost, awarded: -rule.cost, ok: true, spendKey }
      })
      if (!out.ok) {
        bad(res, 402, 'insufficient_funds', 'Not enough credits')
        return
      }
      res.status(200).json({ ok: true, ...out })
      return
    }

    bad(res, 400, 'bad_request', 'Unknown credit action')
  } catch (err) {
    console.error('credits handler error:', err?.message || err)
    bad(res, 500, 'internal_error', 'Credit request failed')
  }
}
