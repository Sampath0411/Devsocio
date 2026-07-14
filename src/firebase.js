// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
//
// The Firebase web API key is safe to ship in the client; access is gated
// by Firestore Security Rules, not by hiding this config (see
// https://firebase.google.com/docs/projects/api-keys).
//
// Configuration is read from VITE_FIREBASE_* environment variables.
// Uses lazy init (called from App.jsx on mount) so missing env vars
// show a visible error instead of a blank white screen.
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
const optional = {
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Exported for App.jsx to check and show a visible error.
export const MISSING_FIREBASE_KEYS = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^VITE_/, ''))

// Live bindings — importers see these update when initFirebase() runs.
// eslint-disable-next-line prefer-const
export let auth = null
// eslint-disable-next-line prefer-const
export let db = null
// eslint-disable-next-line prefer-const
export let googleProvider = null
// eslint-disable-next-line prefer-const
export let githubProvider = null

// Initialize Firebase. Returns false if config is missing (caller shows error).
// Safe to call multiple times — no-ops if already initialized.
export function initFirebase() {
  if (getApps().length) return true
  if (MISSING_FIREBASE_KEYS.length) return false
  const app = initializeApp({ ...required, ...optional })
  auth = getAuth(app)
  db = getFirestore(app)
  googleProvider = new GoogleAuthProvider()
  githubProvider = new GithubAuthProvider()
  return true
}

// Analytics is optional and only works in supported browser contexts.
export async function initAnalytics() {
  if (!auth) return null
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) return getAnalytics(getApps()[0])
  } catch {
    /* analytics unavailable (e.g. localhost / SSR) — non-fatal */
  }
  return null
}
