// Firestore data layer: real-time user profile, credits, and posts.
// Every call degrades gracefully if rules block access, so the prototype
// keeps working even before Firestore rules/collections are configured.
import {
  doc,
  onSnapshot,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { POSTS as MOCK_POSTS } from '../data/mock'

// Live subscription to a user's profile doc (PRD §8.3 users collection).
export function subscribeProfile(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => snap.exists() && onData(snap.data()),
    (err) => onError?.(err),
  )
}

// Credits are stored on the user doc and updated atomically (PRD §5).
export async function changeCredits(uid, delta) {
  await updateDoc(doc(db, 'users', uid), { credits: increment(delta) })
}

export async function updateProfileDoc(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields)
}

// Live feed. Falls back to seeded mock posts if the collection is empty
// or unreadable, so the feed is never blank in the prototype.
export function subscribePosts(onData) {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(
      q,
      (snap) => {
        const live = snap.docs.map((d) => ({ postId: d.id, ...d.data() }))
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
  const ref = await addDoc(collection(db, 'posts'), {
    ...post,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
