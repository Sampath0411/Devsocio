// Client helper for trusted credit EARNING via the serverless function.
// The server defines the amount per action; we only send the action name and
// the caller's Firebase ID token. Falls back to the caller's local handler if
// the server isn't configured yet, so the app keeps working pre-lockdown.
import { auth } from '../firebase'

export async function earnCredits(action, extra = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Credit server error (${res.status})`)
  }
  return res.json() // { credits, awarded }
}

// Claim a like milestone reward (post_10_likes | post_50_likes) for a specific post.
// Called client-side when the post owner's post reaches a like threshold.
export async function claimPostMilestone(action, postId) {
  const user = auth.currentUser
  if (!user) return
  const token = await user.getIdToken()
  const res = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, postId }),
  })
  return res.ok ? res.json() : null
}

// Spend credits via the trusted server. Server verifies the balance and
// decrements atomically; returns { ok, credits } where ok=false means
// insufficient funds. Throws only on network/auth failure.
export async function spendCreditsRemote(amount, description = 'Credits spent') {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'spend', amount, description }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Spend failed (${res.status})`)
  }
  return res.json() // { credits, awarded, ok }
}
