// Vercel Serverless Function — Admin-only credits and user flag management.
// This endpoint provides secure, server-authoritative operations for:
// - User flag management (verified, moderator, banned)
// - Credit adjustments
// - Credit balance setting (for repairs)
//
// SECURITY: All operations require:
// 1. Valid Firebase ID token
// 2. Custom claim `admin: true` (set via Admin SDK; never the email)
// 3. Owner UID is hard-locked — admin actions on the owner are denied
//
// Set in Vercel → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT = <service-account JSON>
//   OWNER_UID               = <your Firebase UID — locks the owner account>
//   ADMIN_ORIGIN            (optional) — defaults to https://devsocio.app

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const db = () => getApp().firestore()
// 🔧 SET THIS: same UID you use in firestore.rules → isOwner().
// Get it from Firebase Console → Authentication → Users → find the owner
// account → copy the UID. Protects the owner from ban/flag-removal.
const OWNER_UID = process.env.OWNER_UID || ''
const ALLOWED_ORIGIN = process.env.ADMIN_ORIGIN || 'https://devsocio.app'

// Firebase UIDs are 28 chars, base64-like alphanumeric (NOT hex).
const UID_RE = /^[A-Za-z0-9]{20,40}$/

// Input validation helpers
function validateUid(uid) {
  if (typeof uid !== 'string' || !UID_RE.test(uid)) {
    throw new Error('Invalid uid format')
  }
  if (OWNER_UID && uid === OWNER_UID) {
    throw new Error('Refusing to operate on the owner account')
  }
  return uid
}

function validateDelta(delta) {
  const num = Number(delta)
  if (!Number.isInteger(num) || Math.abs(num) > 1000000) {
    throw new Error('Invalid delta value (must be an integer between -1000000 and 1000000)')
  }
  return num
}

function validateValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 100000000) {
    throw new Error('Invalid value (must be a non-negative number ≤ 1e8)')
  }
  return Math.round(num)
}

function validateField(field) {
  const allowedFields = ['verified', 'moderator', 'banned']
  if (!allowedFields.includes(field)) {
    throw new Error('Invalid field name (allowed: verified, moderator, banned)')
  }
  return field
}

function validateReason(reason) {
  if (reason === undefined || reason === null) return null
  if (typeof reason !== 'string') throw new Error('reason must be a string')
  return reason.slice(0, 200)
}

async function verifyAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) throw Object.assign(new Error('Missing auth token'), { status: 401 })
  const decoded = await getApp().auth().verifyIdToken(token, true)
  if (decoded.admin !== true) {
    throw Object.assign(new Error('Forbidden: admin claim required'), { status: 403 })
  }
  return { uid: decoded.uid, email: decoded.email }
}

function logResponse(res, status, payload) {
  res.status(status).json(payload)
}

export default async function handler(req, res) {
  // CORS — only allow the admin origin.
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    logResponse(res, 405, { ok: false, error: { code: 'method_not_allowed', message: 'Use POST' } })
    return
  }

  try {
    await verifyAdmin(req)

    const { action, uid, field, value, delta, reason } = req.body || {}

    switch (action) {
      case 'setUserFlag': {
        if (!uid || !field) {
          logResponse(res, 400, { ok: false, error: { code: 'bad_request', message: 'uid and field are required' } })
          return
        }
        validateUid(uid)
        validateField(field)
        const boolValue = Boolean(value)
        validateReason(reason)

        await db().collection('users').doc(uid).update({
          [field]: boolValue,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        logResponse(res, 200, { ok: true, message: `Set ${field}=${boolValue} for user ${uid}` })
        return
      }

      case 'changeCredits': {
        if (!uid || delta === undefined) {
          logResponse(res, 400, { ok: false, error: { code: 'bad_request', message: 'uid and delta are required' } })
          return
        }
        validateUid(uid)
        const validDelta = validateDelta(delta)
        const cleanReason = validateReason(reason)

        const userRef = db().collection('users').doc(uid)
        let result
        await db().runTransaction(async (tx) => {
          const snap = await tx.get(userRef)
          const currentCredits = snap.data()?.credits || 0
          // Allow admin to go negative, but log a warning if the new balance is < 0.
          const newCredits = currentCredits + validDelta
          if (newCredits < 0) {
            console.warn(`admin changeCredits: user ${uid} would go negative (${currentCredits} + ${validDelta} = ${newCredits})`)
          }
          tx.update(userRef, {
            credits: newCredits,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          // Atomic log write — use tx.set on a generated doc ref so the log
          // commit rolls back if the credit update fails.
          const logRef = userRef.collection('credits_log').doc()
          tx.set(logRef, {
            amount: validDelta,
            type: validDelta >= 0 ? 'earn' : 'spend',
            description: cleanReason || `Admin adjustment: ${validDelta >= 0 ? '+' : ''}${validDelta}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            actor: 'admin',
          })
          result = { currentCredits, newCredits }
        })

        logResponse(res, 200, { ok: true, message: `Credits changed for user ${uid}`, ...result })
        return
      }

      case 'setCredits': {
        if (!uid || value === undefined) {
          logResponse(res, 400, { ok: false, error: { code: 'bad_request', message: 'uid and value are required' } })
          return
        }
        validateUid(uid)
        const validValue = validateValue(value)
        const cleanReason = validateReason(reason)

        const userRef = db().collection('users').doc(uid)
        let result
        await db().runTransaction(async (tx) => {
          const snap = await tx.get(userRef)
          const currentCredits = snap.data()?.credits || 0
          tx.update(userRef, {
            credits: validValue,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          // Atomic log write — use tx.set on a generated doc ref.
          const logRef = userRef.collection('credits_log').doc()
          tx.set(logRef, {
            amount: validValue - currentCredits,
            type: validValue >= currentCredits ? 'earn' : 'spend',
            description: cleanReason || `Admin set balance to ${validValue}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            actor: 'admin',
          })
          result = { currentCredits, newCredits: validValue }
        })

        logResponse(res, 200, { ok: true, message: `Credits set to ${validValue} for user ${uid}`, ...result })
        return
      }

      default:
        logResponse(res, 400, { ok: false, error: { code: 'bad_request', message: 'Unknown action. Valid: setUserFlag, changeCredits, setCredits' } })
        return
    }
  } catch (err) {
    const status = err.status || (err.message?.includes('Unauthorized') || err.message?.includes('Forbidden') ? 403 : 400)
    console.error('adminCredits error:', err?.message || err)
    const code = status === 403 ? 'forbidden' : 'bad_request'
    logResponse(res, status, { ok: false, error: { code, message: status === 403 ? 'Forbidden' : 'Bad request' } })
  }
}
