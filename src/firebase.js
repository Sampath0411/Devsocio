// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
//
// The Firebase web API key is safe to ship in the client; access is gated
// by Firestore Security Rules, not by hiding this config (see
// https://firebase.google.com/docs/projects/api-keys).
//
// Configuration is read from VITE_FIREBASE_* environment variables. There
// are NO hard-coded fallbacks: missing env vars throw at startup so misconfig
// is caught immediately rather than producing a silent white screen.
//
// Set the variables in .env (see .env.example) for local dev, and in your
// hosting provider's env-var settings for production.
import { initializeApp } from 'firebase/app'
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

const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, '_$&').toUpperCase()}`)
if (missing.length) {
  throw new Error(
    `[DevSocio] Firebase config is incomplete. Set the following env vars and rebuild:\n  - ${missing.join('\n  - ')}\n` +
    `See .env.example for the full list.`
  )
}

const firebaseConfig = { ...required, ...optional }

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
