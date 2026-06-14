// Auth + user-profile helpers built on Firebase Auth and Firestore.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, githubProvider } from '../firebase'

// Only this account can see the Admin panel (PRD §9 — ADMIN role).
export const ADMIN_EMAIL = 'sampathlox@gmail.com'
export const isAdmin = (user) =>
  !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

const avatarFor = (seed) =>
  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6c63ff`

// Which sign-in method created/owns this account: 'google' | 'github' | 'email'.
function providerOf(user) {
  const id = user?.providerData?.[0]?.providerId || ''
  if (id.includes('google')) return 'google'
  if (id.includes('github')) return 'github'
  return 'email'
}

// Default profile written to users/{uid} on first sign-in (PRD §8.3).
function defaultProfile(user, extra = {}) {
  const base = (user.email || user.uid).split('@')[0]
  return {
    uid: user.uid,
    username: extra.username || base,
    displayName: extra.displayName || user.displayName || base,
    email: user.email || '',
    bio: extra.bio || 'New on DevSocio — building things in public.',
    avatar: user.photoURL || avatarFor(extra.username || base),
    devLevel: extra.devLevel || 'Builder',
    techStack: extra.techStack || ['React'],
    provider: providerOf(user), // how they signed up (for Admin analytics)
    referredBy: extra.referredBy || null, // referrer's username (PRD §5.3)
    credits: 100, // +100 on signup (PRD §5.1)
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    openToCollab: true,
    lookingForCofounder: false,
    links: {},
    createdAt: serverTimestamp(),
  }
}

// Create the Firestore profile doc if it doesn't already exist.
// Best-effort: if Firestore is unreachable (DB not created yet, blocked by an
// extension, offline), we DON'T fail sign-in — we return a local default and
// let the app sync the real doc once Firestore is reachable.
export async function ensureProfile(user, extra = {}) {
  const fallback = defaultProfile(user, extra)
  try {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, fallback)
      return fallback
    }
    // Backfill the provider on accounts created before we tracked it, and
    // stamp the last login so Admin analytics stay accurate.
    const data = snap.data()
    const patch = { lastLoginAt: serverTimestamp() }
    if (!data.provider) patch.provider = providerOf(user)
    updateDoc(ref, patch).catch(() => {})
    return { ...data, ...patch }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[DevSocio] Firestore profile unavailable, using local default:', err?.message)
    return fallback
  }
}

export async function emailSignup({ email, password, username, displayName, devLevel, techStack, referredBy }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(cred.user, { displayName })
  await ensureProfile(cred.user, { username, displayName, devLevel, techStack, referredBy })
  return cred.user
}

export async function emailLogin({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureProfile(cred.user)
  return cred.user
}

export async function googleLogin(extra = {}) {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureProfile(cred.user, extra)
  return cred.user
}

export async function githubLogin(extra = {}) {
  const cred = await signInWithPopup(auth, githubProvider)
  await ensureProfile(cred.user, extra)
  return cred.user
}

export function logout() {
  return signOut(auth)
}

// Turn Firebase auth errors into friendly text for toasts.
export function authErrorMessage(err) {
  const code = err?.code || ''
  const map = {
    'auth/invalid-email': 'That email looks invalid.',
    'auth/email-already-in-use': 'An account already exists with that email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/operation-not-allowed': 'This sign-in method isn’t enabled in Firebase yet.',
    'auth/unauthorized-domain': 'This domain isn’t authorized in Firebase Auth settings.',
  }
  return map[code] || err?.message || 'Something went wrong. Please try again.'
}
