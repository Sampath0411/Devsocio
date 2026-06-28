// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
// The web API key is safe to ship in the client; access is gated by
// Firestore Security Rules, not by hiding this config.
// Values are read from environment variables (Vite requires VITE_ prefix).
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

// Throw early if Firebase config is missing — prevents silent failures
// where auth or Firestore calls would fail with unhelpful errors.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('[DevSocio] Missing Firebase config. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. in your .env file. See .env.example.')
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export const googleProvider = new GoogleAuthProvider()
export const githubProvider = new GithubAuthProvider()

// Analytics is optional and only works in supported browser contexts.
export async function initAnalytics() {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) return getAnalytics(app)
  } catch {
    /* analytics unavailable (e.g. localhost / SSR) — non-fatal */
  }
  return null
}
