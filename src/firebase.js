// Firebase initialization (PRD §8.1 — Firebase Auth + Realtime Database).
// The web API key is safe to ship in the client; access is gated by
// Realtime Database Security Rules, not by hiding this config.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAceETo8ccYoGcyYLCoamNVAlGTfuNn8Pk',
  authDomain: 'devsocio.firebaseapp.com',
  databaseURL: 'https://devsocio-default-rtdb.firebaseio.com',
  projectId: 'devsocio',
  storageBucket: 'devsocio.firebasestorage.app',
  messagingSenderId: '839165467546',
  appId: '1:839165467546:web:d1a059f8691e81c98bf823',
  measurementId: 'G-C8XFPG5P9W',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

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
