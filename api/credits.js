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

    // --- Daily login (+5, once per ~day) ---
    if (action === 'daily_login') {
      const out = await db.runTransaction(async (tx) => {
        const d = (await tx.get(ref)).data() || {}
        const last = d.lastDailyAt?.toMillis ? d.lastDailyAt.toMillis() : 0
        if (Date.now() - last < 20 * 60 * 60 * 1000) return { credits: d.credits || 0, awarded: 0 }
        tx.update(ref, { credits: inc(5), lastDailyAt: now() })
        return { credits: (d.credits || 0) + 5, awarded: 5 }
      })
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
      res.status(200).json(out)
      return
    }

    res.status(400).json({ error: 'Unknown credit action' })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Credit request failed' })
  }
}
