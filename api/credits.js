// Vercel Serverless Function — trusted credit EARNING (PRD §5.1).
//
// Why this exists: anything the browser can do, a user can replay in the
// console — so credits cannot be earned client-side without being cheatable.
// This function runs server-side with the Firebase Admin SDK (which bypasses
// security rules), verifies the caller's identity, and applies ONLY whitelisted
// award amounts that the client cannot tamper with.
//
// Setup (Vercel → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT = <the full service-account JSON, pasted as one value>
//   (Firebase Console → Project settings → Service accounts → Generate new private key)

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

// Server-defined award rules — the client only names an action, never an amount.
const EARN = {
  post_reward: { amount: 30 },
  daily_login: { amount: 5, cooldownMs: 20 * 60 * 60 * 1000, stamp: 'lastDailyAt' },
  profile_complete: { amount: 50, once: 'profileBonusPaid' },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const app = getApp()
    const db = app.firestore()

    const authz = req.headers.authorization || ''
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : ''
    if (!token) {
      res.status(401).json({ error: 'Missing auth token' })
      return
    }
    const decoded = await app.auth().verifyIdToken(token)
    const uid = decoded.uid

    const { action } = req.body || {}
    const rule = EARN[action]
    if (!rule) {
      res.status(400).json({ error: 'Unknown credit action' })
      return
    }

    const ref = db.collection('users').doc(uid)
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) throw new Error('Profile not found')
      const data = snap.data()

      // Once-only awards (e.g. profile completion bonus).
      if (rule.once && data[rule.once]) return { credits: data.credits || 0, awarded: 0 }

      // Cooldown awards (e.g. daily login).
      if (rule.cooldownMs && rule.stamp) {
        const last = data[rule.stamp]?.toMillis ? data[rule.stamp].toMillis() : 0
        if (Date.now() - last < rule.cooldownMs) return { credits: data.credits || 0, awarded: 0 }
      }

      const update = { credits: admin.firestore.FieldValue.increment(rule.amount) }
      if (rule.stamp) update[rule.stamp] = admin.firestore.FieldValue.serverTimestamp()
      if (rule.once) update[rule.once] = true
      tx.update(ref, update)
      return { credits: (data.credits || 0) + rule.amount, awarded: rule.amount }
    })

    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Credit request failed' })
  }
}
