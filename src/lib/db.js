// Firestore data layer: real-time profiles, credits, posts, social graph,
// comments, ideas, notifications and DMs. All reads return live data only —
// empty when a collection has no documents (no demo/mock fallback).
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  increment,
  collection,
  collectionGroup,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// ----------------------------------------------------------------------------
// Profiles & credits
// ----------------------------------------------------------------------------

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

// One-shot fetch of a profile by username (used by /profile/:username).
export async function fetchProfileByUsername(username) {
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1))
  const snap = await getDocs(q)
  return snap.empty ? null : snap.docs[0].data()
}

// Live list of users (Explore, Suggested, Leaderboard, Admin). Returns REAL
// users only — no mock fallback — so search and Admin reflect actual accounts.
export function subscribeUsers(onData, max = 200) {
  try {
    return onSnapshot(
      query(collection(db, 'users'), limit(max)),
      (snap) => onData(snap.docs.map((d) => d.data())),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

// ----------------------------------------------------------------------------
// Posts & feed
// ----------------------------------------------------------------------------

// Live feed — real posts only, newest first.
export function subscribePosts(onData) {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => ({ postId: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function createPost(post) {
  const ref = await addDoc(collection(db, 'posts'), {
    likes: 0,
    commentsCount: 0,
    ...post,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ----------------------------------------------------------------------------
// Likes — per-user doc under the post + an atomic counter on the post.
// ----------------------------------------------------------------------------
export async function setPostLike(postId, uid, liked) {
  const likeRef = doc(db, 'posts', postId, 'likes', uid)
  if (liked) {
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
    await updateDoc(doc(db, 'posts', postId), { likes: increment(1) }).catch(() => {})
  } else {
    await deleteDoc(likeRef)
    await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) }).catch(() => {})
  }
}

// Subscribe to *which* posts the current user has liked (postId -> true).
export function subscribeMyLikes(uid, onData) {
  try {
    return onSnapshot(
      query(collectionGroup(db, 'likes'), where('uid', '==', uid)),
      (snap) => {
        const map = {}
        snap.forEach((d) => {
          const pid = d.ref.parent.parent?.id
          if (pid) map[pid] = true
        })
        onData(map)
      },
      () => onData({}),
    )
  } catch {
    onData({})
    return () => {}
  }
}

// ----------------------------------------------------------------------------
// Saves — bookmarks live under the user's own doc.
// ----------------------------------------------------------------------------
export async function setPostSave(uid, postId, saved) {
  const ref = doc(db, 'users', uid, 'saves', postId)
  if (saved) await setDoc(ref, { postId, createdAt: serverTimestamp() })
  else await deleteDoc(ref)
}

export function subscribeMySaves(uid, onData) {
  try {
    return onSnapshot(
      collection(db, 'users', uid, 'saves'),
      (snap) => {
        const map = {}
        snap.forEach((d) => { map[d.id] = true })
        onData(map)
      },
      () => onData({}),
    )
  } catch {
    onData({})
    return () => {}
  }
}

// ----------------------------------------------------------------------------
// Follows — edge doc + denormalised counters on both profiles.
// ----------------------------------------------------------------------------
export async function setFollow(meUid, targetUid, following) {
  const edge = doc(db, 'users', meUid, 'following', targetUid)
  const meRef = doc(db, 'users', meUid)
  const targetRef = doc(db, 'users', targetUid)
  if (following) {
    await setDoc(edge, { uid: targetUid, createdAt: serverTimestamp() })
    await updateDoc(meRef, { followingCount: increment(1) }).catch(() => {})
    await updateDoc(targetRef, { followersCount: increment(1) }).catch(() => {})
  } else {
    await deleteDoc(edge)
    await updateDoc(meRef, { followingCount: increment(-1) }).catch(() => {})
    await updateDoc(targetRef, { followersCount: increment(-1) }).catch(() => {})
  }
}

export function subscribeMyFollowing(uid, onData) {
  try {
    return onSnapshot(
      collection(db, 'users', uid, 'following'),
      (snap) => {
        const map = {}
        snap.forEach((d) => { map[d.id] = true })
        onData(map)
      },
      () => onData({}),
    )
  } catch {
    onData({})
    return () => {}
  }
}

// ----------------------------------------------------------------------------
// Comments — subcollection under each post, with a counter on the post.
// ----------------------------------------------------------------------------
export function subscribeComments(postId, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function addComment(postId, comment) {
  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
    ...comment,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) }).catch(() => {})
  return ref.id
}

// ----------------------------------------------------------------------------
// Ideas board (PRD §3.6)
// ----------------------------------------------------------------------------
export function subscribeIdeas(onData) {
  try {
    return onSnapshot(
      query(collection(db, 'ideas'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => onData(snap.docs.map((d) => ({ ideaId: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function createIdea(idea) {
  const ref = await addDoc(collection(db, 'ideas'), {
    invested: 0,
    comments: 0,
    ...idea,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function investInIdea(ideaId, amount) {
  await updateDoc(doc(db, 'ideas', ideaId), { invested: increment(amount) })
}

// ----------------------------------------------------------------------------
// Notifications — per-user subcollection.
// ----------------------------------------------------------------------------
export function subscribeNotifications(uid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

// Fire-and-forget: notify a user of an action (like/follow/comment/collab).
export async function pushNotification(targetUid, notif) {
  if (!targetUid) return
  try {
    await addDoc(collection(db, 'users', targetUid, 'notifications'), {
      read: false,
      ...notif,
      createdAt: serverTimestamp(),
    })
  } catch {
    /* best-effort */
  }
}

// ----------------------------------------------------------------------------
// Direct messages — conversations keyed by sorted member pair.
// ----------------------------------------------------------------------------
export const convoId = (a, b) => [a, b].sort().join('__')

export function subscribeConversations(uid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'conversations'), where('members', 'array-contains', uid)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export function subscribeThread(cid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'conversations', cid, 'messages'), orderBy('createdAt', 'asc'), limit(100)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function sendMessage(meUid, otherUid, text, meta = {}) {
  const cid = convoId(meUid, otherUid)
  const ref = doc(db, 'conversations', cid)
  await setDoc(
    ref,
    { members: [meUid, otherUid], last: text, lastFrom: meUid, updatedAt: serverTimestamp(), ...meta },
    { merge: true },
  )
  await addDoc(collection(db, 'conversations', cid, 'messages'), {
    from: meUid,
    text,
    createdAt: serverTimestamp(),
  })
  return cid
}

// ----------------------------------------------------------------------------
// Reports & moderation (PRD §7.4)
// ----------------------------------------------------------------------------
export async function reportContent(report) {
  await addDoc(collection(db, 'reports'), {
    status: 'pending',
    ...report,
    createdAt: serverTimestamp(),
  })
}

export function subscribeReports(onData) {
  try {
    return onSnapshot(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function resolveReport(reportId, status) {
  await updateDoc(doc(db, 'reports', reportId), { status })
}

// Admin moderation: delete a post (allowed for the author or admin by rules).
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ----------------------------------------------------------------------------
// Stories (PRD §3.4) — 24h disappearing posts.
// ----------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000

export async function createStory(story) {
  const ref = await addDoc(collection(db, 'stories'), {
    ...story,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// Live stories from the last 24h (filtered client-side so no index needed).
export function subscribeStories(onData) {
  try {
    return onSnapshot(
      query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        const cutoff = Date.now() - DAY_MS
        const live = snap.docs
          .map((d) => ({ storyId: d.id, ...d.data() }))
          .filter((s) => {
            const ms = s.createdAt?.toMillis ? s.createdAt.toMillis() : Date.now()
            return ms >= cutoff
          })
        onData(live)
      },
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

export async function reactToStory(storyId, emoji, uid) {
  await updateDoc(doc(db, 'stories', storyId), { [`reactions.${uid}`]: emoji })
}

export { getDoc, doc }
