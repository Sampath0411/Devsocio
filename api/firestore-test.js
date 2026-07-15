/** Temporary — test Firestore config + reads. DELETE AFTER USE */
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'text/html')
  let html = '<h1>Firestore Read Test</h1><pre>'

  const required = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
  html += `Config: ${JSON.stringify(required, null, 2)}\n\n`
  html += `API_KEY ends with newline: ${required.apiKey?.endsWith('\n') ? 'YES ⚠️' : 'no'}\n`
  html += `PROJECT_ID ends with newline: ${required.projectId?.endsWith('\n') ? 'YES ⚠️' : 'no'}\n`

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(required)
    const db = getFirestore(app)

    // Try read WITHOUT auth (should fail — rules require signedIn)
    try {
      const snap = await getDocs(collection(db, 'users'))
      html += `\nUsers (no auth): ${snap.size} docs\n`
      snap.docs.slice(0, 3).forEach(d => {
        html += `  ${d.id}: ${d.data().username || '?'}\n`
      })
    } catch (e) {
      html += `\nUsers (no auth) ERROR: ${e.message}\n`
    }

    html += '\n</pre>'
  } catch (e) {
    html += `\nINIT ERROR: ${e.message}\n`
    html += '</pre>'
  }

  res.status(200).send(html)
}
