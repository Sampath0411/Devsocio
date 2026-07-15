// Firebase initialization. Initializes eagerly at module load but catches
// errors gracefully so the app never shows a blank screen.
// Uses eager init (not lazy) because Vite/Rollup bundler doesn't preserve
// live 'export let' bindings in production builds.
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const required = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const hasAllKeys = Object.values(required).every(Boolean)

// Always-available exports. Non-null only if Firebase initialized successfully.
export let auth = null
export let db = null
export let googleProvider = null
export let githubProvider = null
export let firebaseInitialized = false

try {
  if (hasAllKeys) {
    const app = getApps().length ? getApps()[0] : initializeApp(required)
    auth = getAuth(app)
    db = getFirestore(app)
    googleProvider = new GoogleAuthProvider()
    githubProvider = new GithubAuthProvider()
    firebaseInitialized = true
  } else {
    console.warn('[DevSocio] Firebase config missing — set VITE_FIREBASE_* env vars')
  }
} catch (e) {
  console.warn('[DevSocio] Firebase init failed:', e?.message)
}

// Analytics — optional, loaded lazily.
export async function initAnalytics() {
  if (!auth) return null
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) return getAnalytics(getApps()[0])
  } catch { /* non-fatal */ }
  return null
}
