// Auth + user-profile helpers built on Firebase Auth and Firestore.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, githubProvider } from '../firebase'

const avatarFor = (seed) =>
  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6c63ff`

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
export async function ensureProfile(user, extra = {}) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const profile = defaultProfile(user, extra)
    await setDoc(ref, profile)
    return profile
  }
  return snap.data()
}

export async function emailSignup({ email, password, username, displayName, devLevel, techStack }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(cred.user, { displayName })
  await ensureProfile(cred.user, { username, displayName, devLevel, techStack })
  return cred.user
}

export async function emailLogin({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureProfile(cred.user)
  return cred.user
}

export async function googleLogin() {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureProfile(cred.user)
  return cred.user
}

export async function githubLogin() {
  const cred = await signInWithPopup(auth, githubProvider)
  await ensureProfile(cred.user)
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
