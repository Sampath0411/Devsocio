// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
// The web API key is safe to ship in the client; access is gated by
// Firebase Security Rules, not by hiding this config.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAceETo8ccYoGcyYLCoamNVAlGTfuNn8Pk',
  authDomain: 'devsocio.firebaseapp.com',
  projectId: 'devsocio',
  storageBucket: 'devsocio.firebasestorage.app',
  messagingSenderId: '839165467546',
  appId: '1:839165467546:web:974ff58b551f0db88bf823',
  measurementId: 'G-YK8VDRV31F',
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
