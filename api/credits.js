// Vercel Serverless Function — trusted credit earning + referrals (PRD §5).
//
// Anything the browser can do, a user can replay — so credit EARNING runs here
// with the Firebase Admin SDK (bypasses rules), verifies the caller, and applies
// only server-defined amounts. Referral payouts (+150 each on signup, +50 to the
// referrer on the referred user's first post) are enforced once via flags.
//
// Vercel → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT = <full service-account JSON pasted as one value>

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

// Best-effort: write a credit transaction log entry.
async function logTx(db, uid, amount, description) {
  try {
    await db.collection('users').doc(uid).collection('credits_log').add({
      amount,
      type: amount > 0 ? 'earn' : 'spend',
      description,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch { /* non-fatal */ }
}

async function uidByUsername(db, username) {
  if (!username) return null
  const snap = await db.collection('users').where('username', '==', username).limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const app = getApp()
    const db = app.firestore()

    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) {
      res.status(401).json({ error: 'Missing auth token' })
      return
    }
    const { uid } = await app.auth().verifyIdToken(token)
    const { action } = req.body || {}
    const ref = db.collection('users').doc(uid)

    // --- Daily login (+5, once per ~day) with streak tracking ---
    if (action === 'daily_login') {
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const last = d.lastDailyAt?.toMillis ? d.lastDailyAt.toMillis() : 0
        const nowMs = Date.now()
        if (nowMs - last < 20 * 60 * 60 * 1000) return { credits: d.credits || 0, awarded: 0, streak: d.loginStreak || 0 }

        // Calculate new streak
        const gapMs = nowMs - last
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000
        const prevStreak = d.loginStreak || 0
        const newStreak = gapMs <= twoDaysMs && last > 0 ? prevStreak + 1 : 1

        // Base award + 7-day streak bonus
        let awarded = 5
        let streakBonus = 0
        if (newStreak % 7 === 0) {
          streakBonus = 100
          awarded += 100
        }

        tx.update(ref, {
          credits: inc(awarded),
          lastDailyAt: now(),
          loginStreak: newStreak,
          longestStreak: Math.max(newStreak, d.longestStreak || 0),
        })

        return { credits: (d.credits || 0) + awarded, awarded, streak: newStreak, streakBonus }
      })
      await logTx(db, uid, out.awarded || 0, out.streakBonus ? `Daily login +5 + 7-day streak bonus +100` : 'Daily login')
      res.status(200).json(out)
      return
    }

    // --- Profile completion (+50, once) ---
    if (action === 'profile_complete') {
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.profileBonusPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(50), profileBonusPaid: true })
        return { credits: (d.credits || 0) + 50, awarded: 50 }
      })
      await logTx(db, uid, out.awarded || 0, 'Profile completion bonus')
      res.status(200).json(out)
      return
    }

    // --- Referral signup (+150 to both, once) ---
    if (action === 'referral_signup') {
      const d0 = (await ref.get()).data() || {}
      if (d0.referralPaid || !d0.referredBy) {
        res.status(200).json({ credits: d0.credits || 0, awarded: 0 })
        return
      }
      const refUid = await uidByUsername(db, d0.referredBy)
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        if (d.referralPaid) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(150), referralPaid: true })
        if (refUid && refUid !== uid) tx.update(db.collection('users').doc(refUid), { credits: inc(150) })
        return { credits: (d.credits || 0) + 150, awarded: 150 }
      })
      await logTx(db, uid, out.awarded || 0, 'Referral signup bonus')
      if (refUid && refUid !== uid && out.awarded) await logTx(db, refUid, 150, 'Referral signup bonus (referrer)')
      res.status(200).json(out)
      return
    }

    // --- Post reward (+30) + referrer first-post bonus (+50, once) ---
    if (action === 'post_reward') {
      const pd = (await ref.get()).data() || {}
      const refUid = pd.referredBy && !pd.referralFirstPostPaid ? await uidByUsername(db, pd.referredBy) : null
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const update = { credits: inc(30) }
        let referrerBonus = 0
        if (refUid && refUid !== uid && !d.referralFirstPostPaid) {
          update.referralFirstPostPaid = true
          tx.update(db.collection('users').doc(refUid), { credits: inc(50) })
          referrerBonus = 50
        }
        tx.update(ref, update)
        return { credits: (d.credits || 0) + 30, awarded: 30, referrerBonus }
      })
      await logTx(db, uid, 30, 'Post published')
      if (out.referrerBonus && refUid) await logTx(db, refUid, 50, 'Referral first post bonus')
      res.status(200).json(out)
      return
    }

    // --- Post milestone: 10 likes → +20 credits (once per post) ---
    if (action === 'post_10_likes') {
      const { postId } = req.body || {}
      if (!postId) { res.status(400).json({ error: 'postId required' }); return }
      const postRef = db.collection('posts').doc(postId)
      const out = await db.runTransaction(async (tx) => {
        const p = (await tx.get(postRef)).data() || {}
        if (p.authorUid !== uid) return { credits: 0, awarded: 0 }
        if ((p.likes || 0) < 10) return { credits: 0, awarded: 0 }
        if (p.milestone10Paid) return { credits: 0, awarded: 0 }
        tx.update(postRef, { milestone10Paid: true })
        tx.update(ref, { credits: inc(20) })
        return { awarded: 20 }
      })
      await logTx(db, uid, out.awarded || 0, 'Post hit 10 likes')
      res.status(200).json(out); return
    }

    // --- Post milestone: 50 likes → +50 credits (once per post) ---
    if (action === 'post_50_likes') {
      const { postId } = req.body || {}
      if (!postId) { res.status(400).json({ error: 'postId required' }); return }
      const postRef = db.collection('posts').doc(postId)
      const out = await db.runTransaction(async (tx) => {
        const p = (await tx.get(postRef)).data() || {}
        if (p.authorUid !== uid) return { credits: 0, awarded: 0 }
        if ((p.likes || 0) < 50) return { credits: 0, awarded: 0 }
        if (p.milestone50Paid) return { credits: 0, awarded: 0 }
        tx.update(postRef, { milestone50Paid: true })
        tx.update(ref, { credits: inc(50) })
        return { awarded: 50 }
      })
      await logTx(db, uid, out.awarded || 0, 'Post hit 50 likes')
      res.status(200).json(out); return
    }

    // --- Spend credits (redeem reward / invest in idea / generic) ---
    // Server is authoritative: client passes the amount and a description,
    // we verify the user has enough and decrement atomically. Returns
    // { credits, awarded: -amount, ok: true } on success.
    if (action === 'spend') {
      const amount = Math.max(0, Math.round(Number((req.body || {}).amount) || 0))
      const description = String((req.body || {}).description || 'Credits spent').slice(0, 120)
      if (!amount) { res.status(400).json({ error: 'amount required' }); return }
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const balance = d.credits || 0
        if (balance < amount) return { credits: balance, awarded: 0, ok: false }
        tx.update(ref, { credits: inc(-amount) })
        return { credits: balance - amount, awarded: -amount, ok: true }
      })
      if (out.ok) await logTx(db, uid, -amount, description)
      res.status(200).json(out)
      return
    }

    res.status(400).json({ error: 'Unknown credit action' })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Credit request failed' })
  }
}
