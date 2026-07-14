// Client wrapper for the server-side admin endpoints.
//
// /api/adminCredits handles all admin-only mutations to user docs (flag
// changes, credit adjustments). The server uses the Firebase Admin SDK
// (bypasses rules) and verifies the `admin: true` custom claim on the
// caller's ID token. This is the ONLY safe place for an admin client to
// mutate user credit / flag fields — the Firestore rules block them too.
import { auth } from '../firebase'

async function post(body) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch('/api/adminCredits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = data?.error?.code || 'admin_request_failed'
    const message = data?.error?.message || `Admin request failed (${res.status})`
    throw new Error(`${code}: ${message}`)
  }
  return data
}

export function setUserFlag(uid, field, value, reason) {
  return post({ action: 'setUserFlag', uid, field, value, reason })
}

export function changeCredits(uid, delta, reason) {
  const n = Number(delta)
  if (!Number.isInteger(n)) throw new Error('delta must be an integer')
  if (Math.abs(n) > 1_000_000) throw new Error('delta out of range')
  return post({ action: 'changeCredits', uid, delta: n, reason })
}

export function setCredits(uid, value, reason) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 1e8) throw new Error('value out of range (0..1e8)')
  return post({ action: 'setCredits', uid, value: n, reason })
}
