// Global frontend error capture → Firestore `errors` collection.
//
// Feeds the Admin Copilot and the Admin "Errors" panel. We only log while a
// user is signed in (the rules require it) and de-dupe identical errors within
// a short window so one repeating crash doesn't flood the collection.
import { auth } from '../firebase'
import { logError } from './db'

const seen = new Map() // signature -> last-logged timestamp
const DEDUPE_MS = 60 * 1000

function shouldLog(signature) {
  const now = Date.now()
  const last = seen.get(signature) || 0
  if (now - last < DEDUPE_MS) return false
  seen.set(signature, now)
  // Keep the map small.
  if (seen.size > 200) seen.clear()
  return true
}

export function reportError(source, { message, stack } = {}) {
  const user = auth.currentUser
  if (!user) return // rules require a signed-in user; skip anonymous crashes
  const msg = (message || 'Unknown error').toString().slice(0, 500)
  const signature = `${source}:${msg}`
  if (!shouldLog(signature)) return
  logError({
    source,
    message: msg,
    stack: (stack || '').toString().slice(0, 2000),
    url: typeof location !== 'undefined' ? location.pathname + location.search : '',
    userUid: user.uid,
    userEmail: user.email || '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
  })
}

// Install window-level handlers. Call once at startup.
export function installErrorCapture() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    reportError('window.onerror', {
      message: e?.message || (e?.error && e.error.message),
      stack: e?.error?.stack,
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason
    reportError('unhandledrejection', {
      message: reason?.message || String(reason),
      stack: reason?.stack,
    })
  })
}
