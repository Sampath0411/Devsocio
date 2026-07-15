import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const FieldValue = admin.firestore.FieldValue

/**
 * POST /api/backfill
 * One-shot: backfill Firestore user docs for all Firebase Auth users.
 * Call: curl -X POST https://devsocio-black.vercel.app/api/backfill \
 *   -H "Authorization: Bearer $CRON_SECRET"
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const app = getApp()
  const auth = app.auth ? app.auth() : admin.auth()
  const db = app.firestore ? app.firestore() : admin.firestore()

  const FALLBACK_AVATAR = (uid, name) =>
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}&backgroundColor=007991`

  function defaultProfile(user) {
    const base = (user.email || user.uid).split('@')[0]
    return {
      uid: user.uid,
      username: user.displayName
        ? user.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        : base,
      displayName: user.displayName || base,
      email: (user.email || '').toLowerCase(),
      bio: 'New on DevSocio — building things in public.',
      avatar: user.photoURL || FALLBACK_AVATAR(user.uid, base),
      devLevel: 'Builder',
      techStack: ['React'],
      provider: user.providerData?.[0]?.providerId || 'password',
      credits: 100,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      openToCollab: true,
      lookingForCofounder: false,
      links: {},
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      referralPaid: false,
      streakDays: 0,
      loginStreak: 0,
      longestStreak: 0,
      onboardingDone: true,
      banned: false,
      verified: false,
      moderator: false,
      founder: false,
      topDev: false,
      premiumTheme: null,
    }
  }

  try {
    let created = 0, skipped = 0, failed = 0, pageToken
    do {
      const result = await auth.listUsers(1000, pageToken)
      pageToken = result.pageToken
      for (const user of result.users) {
        try {
          const ref = db.collection('users').doc(user.uid)
          const snap = await ref.get()
          if (snap.exists) { skipped++; continue }
          await ref.set(defaultProfile(user))
          created++
        } catch (err) {
          failed++
          console.error(`Backfill fail: ${user.uid} ${user.email}: ${err.message}`)
        }
      }
    } while (pageToken)
    return res.json({ created, skipped, failed, total: created + skipped + failed })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
