import admin from 'firebase-admin'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    let sa
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (raw) sa = JSON.parse(raw)
    if (!admin.apps.length) {
      admin.initializeApp(sa
        ? { credential: admin.credential.cert(sa) }
        : { credential: admin.credential.applicationDefault() })
    }
    const snap = await admin.firestore().collection('users').limit(3).get()
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const ts = typeof docs[0]?.createdAt?.seconds === 'number' ? 'yes' : 'no'
    const snap2 = await admin.firestore().collection('posts').limit(3).get()
    const postsCount = snap2.size
    res.json({ usersCount: snap.size, postsCount, sample: docs.map(d => d.username || d.displayName), timestamps: ts })
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack?.split('\n').slice(0, 3).join(';') })
  }
}
