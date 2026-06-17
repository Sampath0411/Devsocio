// Vercel Serverless Function — DevSocio 24/7 monitor (run by Vercel Cron).
//
// This is the "always-on" piece. Vercel can't keep a process running forever,
// so instead a cron schedule (see vercel.json → "crons") hits this endpoint on
// an interval. Each run scans the last 24h of captured errors and the pending
// moderation queue, then writes a compact snapshot to admin_digests/latest.
// The Admin Copilot reads that snapshot via its get_digest tool, and the Admin
// page shows it directly.
//
// Vercel → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT = <service-account JSON>
//   CRON_SECRET              = <random string>   (optional but recommended)
//
// Vercel automatically sends "Authorization: Bearer $CRON_SECRET" on cron
// invocations when CRON_SECRET is set, so we can reject any public calls.

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const DAY_MS = 24 * 60 * 60 * 1000

export default async function handler(req, res) {
  // Only allow Vercel Cron (or a caller who knows the secret) when configured.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  try {
    const app = getApp()
    const db = app.firestore()
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - DAY_MS)

    // --- Recent errors (last 24h) ---
    const errSnap = await db.collection('errors')
      .where('createdAt', '>=', cutoff)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()
      .catch(() => ({ docs: [] }))
    const errors = errSnap.docs.map((d) => d.data())
    const openErrors = errors.filter((e) => (e.status || 'open') === 'open')

    // Group identical messages so the digest shows patterns, not noise.
    const byMessage = {}
    for (const e of openErrors) {
      const key = (e.message || 'Unknown error').slice(0, 140)
      byMessage[key] = (byMessage[key] || 0) + 1
    }
    const topErrors = Object.entries(byMessage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([message, count]) => ({ message, count }))

    // --- Pending reports ---
    const repSnap = await db.collection('reports')
      .where('status', '==', 'pending')
      .limit(200)
      .get()
      .catch(() => ({ size: 0 }))
    const pendingReports = repSnap.size ?? 0

    // --- Totals ---
    const [users, posts] = await Promise.all([
      db.collection('users').count().get().then((s) => s.data().count).catch(() => null),
      db.collection('posts').count().get().then((s) => s.data().count).catch(() => null),
    ])

    const digest = {
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      windowHours: 24,
      totals: { users, posts },
      errors24h: errors.length,
      openErrors: openErrors.length,
      topErrors,
      pendingReports,
      health: openErrors.length === 0 && pendingReports === 0 ? 'all clear' : 'needs attention',
    }

    await db.collection('admin_digests').doc('latest').set(digest, { merge: true })

    res.status(200).json({ ok: true, ...digest, generatedAt: 'server-timestamp' })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Monitor run failed' })
  }
}
