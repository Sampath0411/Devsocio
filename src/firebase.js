// Firebase initialization — resilient to missing env vars.
// Landing page and public content render regardless of config.
// Firebase features silently degrade when env vars aren't set.

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

// eslint-disable-next-line prefer-const
export let auth = null
// eslint-disable-next-line prefer-const
export let db = null
// eslint-disable-next-line prefer-const
export let googleProvider = null
// eslint-disable-next-line prefer-const
export let githubProvider = null

export function initFirebase() {
  if (getApps().length) {
    const app = getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
    googleProvider = new GoogleAuthProvider()
    githubProvider = new GithubAuthProvider()
    return true
  }
  if (!hasAllKeys) return false
  const app = initializeApp(required)
  auth = getAuth(app)
  db = getFirestore(app)
  googleProvider = new GoogleAuthProvider()
  githubProvider = new GithubAuthProvider()
  return true
}

export async function initAnalytics() {
  if (!auth) return null
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) return getAnalytics(getApps()[0])
  } catch { /* non-fatal */ }
  return null
}
