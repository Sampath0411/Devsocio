// Data layer: real-time user profile, credits, and posts on Firebase
// Realtime Database. Every call degrades gracefully if the DB is unreachable,
// so the prototype keeps working even before rules/data are configured.
import {
  ref,
  onValue,
  update,
  push,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
  runTransaction,
  serverTimestamp,
} from 'firebase/database'
import { db } from '../firebase'
import { POSTS as MOCK_POSTS } from '../data/mock'

// Live subscription to a user's profile node (PRD §8.3 users).
// onValue returns its own unsubscribe function.
export function subscribeProfile(uid, onData, onError) {
  return onValue(
    ref(db, `users/${uid}`),
    (snap) => snap.exists() && onData(snap.val()),
    (err) => onError?.(err),
  )
}

// Credits live on the user node and update atomically (PRD §5).
export async function changeCredits(uid, delta) {
  await runTransaction(ref(db, `users/${uid}/credits`), (cur) => (cur || 0) + delta)
}

export async function updateProfileDoc(uid, fields) {
  await update(ref(db, `users/${uid}`), fields)
}

// Live feed. Falls back to seeded mock posts if the node is empty or
// unreadable, so the feed is never blank in the prototype.
export function subscribePosts(onData) {
  try {
    const q = query(ref(db, 'posts'), orderByChild('createdAt'), limitToLast(50))
    return onValue(
      q,
      (snap) => {
        const val = snap.val()
        if (!val) return onData(MOCK_POSTS)
        // RTDB returns an object keyed by id, sorted ascending — newest last.
        const live = Object.entries(val)
          .map(([postId, data]) => ({ postId, ...data }))
          .reverse()
        onData(live.length ? live : MOCK_POSTS)
      },
      () => onData(MOCK_POSTS),
    )
  } catch {
    onData(MOCK_POSTS)
    return () => {}
  }
}

export async function createPost(post) {
  const r = push(ref(db, 'posts'))
  await set(r, { ...post, createdAt: serverTimestamp() })
  return r.key
}

export { get } // re-export for convenience if needed elsewhere
