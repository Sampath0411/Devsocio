// Firebase initialization (PRD §8.1 — Firebase Auth + Firestore).
// The web API key is safe to ship in the client; access is gated by
// Firestore Security Rules, not by hiding this config.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCp0aAVeKzptv4HqSicEghuX8KEP4rVjFQ',
  authDomain: 'devsocio-8f0c0.firebaseapp.com',
  projectId: 'devsocio-8f0c0',
  storageBucket: 'devsocio-8f0c0.firebasestorage.app',
  messagingSenderId: '340656300838',
  appId: '1:340656300838:web:43b7a0334098736e1057e7',
  measurementId: 'G-9K4M5GTKC1',
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
