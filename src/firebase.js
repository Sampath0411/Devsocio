// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
// The web API key is safe to ship in the client; access is gated by
// Firestore Security Rules, not by hiding this config.
// Values are read from environment variables (Vite requires VITE_ prefix).
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Env vars take precedence (for new deployments / local dev). If not set,
// fall back to the existing Firebase web-app config (for the already-deployed
// static site at devsocio-8f0c0.web.app, where rebuilds require explicit
// env var injection). Both are public client-side keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCp0aAVeKzptv4HqSicEghuX8KEP4rVjFQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'devsocio-8f0c0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'devsocio-8f0c0',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'devsocio-8f0c0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '340656300838',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:340656300838:web:43b7a0334098736e1057e7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-9K4M5GTKC1',
}

// Warn (but don't crash) if Firebase config is missing — the deployed
// Firebase web app (devsocio-8f0c0.web.app) was built before env vars
// were required, so we fall back to a helpful error overlay instead of
// a white screen. For new deployments, set VITE_FIREBASE_* in .env.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.warn('[DevSocio] Firebase config is empty. Set VITE_FIREBASE_API_KEY etc. in .env. See .env.example.')
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
