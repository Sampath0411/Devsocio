/**
 * Backfill Firestore user docs for all Firebase Auth users.
 * Run: node scripts/backfillUsers.mjs
 *
 * Requires:
 *   - FIREBASE_SERVICE_ACCOUNT env var (JSON), OR
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing to a service-account key file
 *   - Admin SDK: npm install firebase-admin (already in deps via vercel)
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)

let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const raw = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
  serviceAccount = JSON.parse(raw)
} else {
  // Fall back to application-default creds (firebase login)
  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    require('os').homedir() + '/.config/gcloud/application_default_credentials.json'
}

const admin = require('firebase-admin')

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'devsocio-8f0c0',
  })
}

const auth = admin.auth()
const db = admin.firestore()

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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    referralPaid: false,
    streakDays: 0,
    loginStreak: 0,
    longestStreak: 0,
    onboardingDone: true, // skip tour for backfilled users
    banned: false,
    verified: false,
    moderator: false,
    founder: false,
    topDev: false,
    premiumTheme: null,
  }
}

async function main() {
  let created = 0
  let skipped = 0
  let failed = 0
  let pageToken

  do {
    const result = await auth.listUsers(1000, pageToken)
    pageToken = result.pageToken

    for (const user of result.users) {
      try {
        const ref = db.collection('users').doc(user.uid)
        const snap = await ref.get()
        if (snap.exists) {
          skipped++
          continue
        }
        const profile = defaultProfile(user)
        await ref.set(profile)
        created++
        if (created % 50 === 0) console.log(`  Created ${created} docs...`)
      } catch (err) {
        console.error(`  Failed for ${user.uid} (${user.email}): ${err.message}`)
        failed++
      }
    }
  } while (pageToken)

  console.log(`\nDone. Created: ${created}, Skipped (exists): ${skipped}, Failed: ${failed}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
