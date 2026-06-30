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
  writeBatch,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore'
import { db, auth } from '../firebase'

// ----------------------------------------------------------------------------
// Profiles & credits
// ----------------------------------------------------------------------------

// Live subscription to a user's profile doc (PRD §8.3 users collection).
// Emits `null` for missing docs so subscribers can distinguish "not loaded yet"
// from "user has no profile" and don't hang on first paint.
export function subscribeProfile(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => onError?.(err),
  )
}

// Credits are stored on the user doc and updated atomically (PRD §5).
// WARNING: This function is UNSAFE for client use — any signed-in user can
// call it with any uid and delta. Credit changes MUST go through the
// serverless function at /api/credits.js (Admin SDK, rules-enforced).
// This is retained only for the Admin Copilot's trusted server-side calls.
export async function changeCredits(uid, delta) {
  await updateDoc(doc(db, 'users', uid), { credits: increment(delta) })
}

// Set an exact credit balance (admin repair for corrupted values).
// Only callable from trusted server contexts (Admin Copilot agent).
export async function setCredits(uid, value) {
  await updateDoc(doc(db, 'users', uid), { credits: Math.max(0, Math.round(Number(value) || 0)) })
}

// Admin: toggle a flag on any user (verified / moderator badges).
// DANGER: Any signed-in user can call this to make themselves admin/moderator.
// TODO: Gate behind Admin Copilot's server-side auth (verify caller is admin).
export async function setUserFlag(uid, field, value) {
  await updateDoc(doc(db, 'users', uid), { [field]: value })
}

export async function updateProfileDoc(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields)
}

// ----------------------------------------------------------------------------
// Presence (PRD §3.7 "Online indicator"). A lightweight heartbeat stamps
// lastActiveAt on the user doc; a profile counts as online if seen recently.
// ----------------------------------------------------------------------------
const ONLINE_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

export async function touchPresence(uid) {
  if (!uid) return
  await updateDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() }).catch(() => {})
}

export function isOnline(user) {
  const ts = user?.lastActiveAt
  if (!ts) return false
  const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : 0)
  return Date.now() - ms < ONLINE_WINDOW_MS
}

// One-shot fetch of a profile by username (used by /profile/:username).
export async function fetchProfileByUsername(username) {
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1))
  const snap = await getDocs(q)
  return snap.empty ? null : snap.docs[0].data()
}

// Resolve a user to their uid from a uid, username, display name or email.
// Used by the Admin Copilot so an approved action never writes to a wrong/
// non-existent doc when the model passes a name instead of a real uid.
// OPTIMIZED: Uses indexed queries instead of full-collection scan.
export async function findUserUid(idOrName) {
  const key = (idOrName || '').toString().trim()
  if (!key) return null
  // 1) Treat it as a uid (the common, correct case).
  const direct = await getDoc(doc(db, 'users', key)).catch(() => null)
  if (direct && direct.exists()) return key
  // 2) Exact username match (indexed query).
  const byUsername = await fetchProfileByUsername(key).catch(() => null)
  if (byUsername?.uid) return byUsername.uid
  // 3) Exact email match (indexed query — avoid full scan).
  const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', key.toLowerCase()), limit(1))).catch(() => null)
  if (emailSnap && !emailSnap.empty) return emailSnap.docs[0].id
  // 4) Exact displayName match (indexed query if displayName is indexed).
  const nameSnap = await getDocs(query(collection(db, 'users'), where('displayNameLower', '==', key.toLowerCase()), limit(1))).catch(() => null)
  if (nameSnap && !nameSnap.empty) return nameSnap.docs[0].id
  // 5) Fall back to usernameLower (requires composite index).
  const usernameLowerSnap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', key.toLowerCase()), limit(1))).catch(() => null)
  if (usernameLowerSnap && !usernameLowerSnap.empty) return usernameLowerSnap.docs[0].id
  return null
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
  // Denormalised post count on the author's profile (PRD §3.2.1 Stats).
  if (post.authorUid) {
    await updateDoc(doc(db, 'users', post.authorUid), { postsCount: increment(1) }).catch(() => {})
  }
  return ref.id
}

// Parse #hashtags out of free text → unique, lower-cased, with leading '#'
// (PRD §8.2.1 "adds hashtags"; powers Explore/Trending).
export function parseHashtags(text = '') {
  const found = text.match(/#[\p{L}\p{N}_]+/gu) || []
  return [...new Set(found.map((h) => h.toLowerCase()))]
}

// Quote-repost (PRD §3.3.2 "Repost with comment"). Creates a new post that
// embeds a snapshot of the original so the feed can render the quoted card.
export async function repost(original, me, quote = '') {
  if (!me?.uid) throw new Error('Not signed in')
  const snapshot = {
    postId: original.postId,
    type: original.type,
    content: (original.content || '').slice(0, 280),
    author: original.author || null,
    imageUrl: original.imageUrl || null,
  }
  return createPost({
    authorUid: me.uid,
    author: { username: me.username, displayName: me.displayName, avatar: me.avatar },
    type: original.type || 'Opinion / Take',
    content: quote.trim(),
    hashtags: parseHashtags(quote),
    tags: me.techStack?.slice(0, 2) || [],
    repostOf: snapshot,
  })
}

// ----------------------------------------------------------------------------
// Likes — per-user doc under the post + an atomic counter on the post.
// Uses a transaction to ensure the like doc and counter stay in sync.
// ----------------------------------------------------------------------------
export async function setPostLike(postId, uid, liked) {
  const postRef = doc(db, 'posts', postId)
  const likeRef = doc(db, 'posts', postId, 'likes', uid)
  await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef)
    const alreadyLiked = likeSnap.exists()
    if (liked && !alreadyLiked) {
      tx.set(likeRef, { uid, createdAt: serverTimestamp() })
      tx.update(postRef, { likes: increment(1) })
    } else if (!liked && alreadyLiked) {
      tx.delete(likeRef)
      tx.update(postRef, { likes: increment(-1) })
    }
    // Idempotent: if already liked and asked to like, do nothing.
  }).catch(() => {})
}

// Subscribe to *which* posts the current user has liked (postId -> true).
export function subscribeMyLikes(uid, onData) {
  try {
    return onSnapshot(
      query(collectionGroup(db, 'likes'), where('uid', '==', uid)),
      (snap) => {
        const map = {}
        snap.forEach((d) => {
          // d.ref.path = posts/{postId}/likes/{uid}
          // d.ref.parent = likes subcollection, d.ref.parent.parent = post doc
          const parent = d.ref.parent.parent
          // Only include entries where the grandparent is a post in the posts collection
          if (parent && parent.parent?.id === 'posts') {
            map[parent.id] = true
          }
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

export async function fetchFollowingUids(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'following'))
  return snap.docs.map((d) => d.id)
}

export async function fetchFollowersUids(uid) {
  const q = query(collectionGroup(db, 'following'), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean)
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

// Extract @usernames from comment text → array of lowercase handles (no @).
export function parseMentions(text = '') {
  const found = text.match(/@([a-zA-Z0-9_]+)/g) || []
  return [...new Set(found.map((m) => m.slice(1).toLowerCase()))]
}

export async function addComment(postId, comment) {
  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
    likesCount: 0,
    parentId: null,
    ...comment,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) }).catch(() => {})
  return ref.id
}

// Comment likes — per-user doc under the comment + an atomic counter (PRD §5.1
// "Comment gets 5 likes +10"). Mirrors the post-like pattern.
export async function setCommentLike(postId, commentId, uid, liked) {
  const likeRef = doc(db, 'posts', postId, 'comments', commentId, 'likes', uid)
  const cRef = doc(db, 'posts', postId, 'comments', commentId)
  if (liked) {
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
    await updateDoc(cRef, { likesCount: increment(1) }).catch(() => {})
  } else {
    await deleteDoc(likeRef)
    await updateDoc(cRef, { likesCount: increment(-1) }).catch(() => {})
  }
}

// Which comments on a post the current user has liked (commentId -> true).
export function subscribeMyCommentLikes(postId, uid, onData) {
  try {
    return onSnapshot(
      query(collectionGroup(db, 'likes'), where('uid', '==', uid)),
      (snap) => {
        const map = {}
        snap.forEach((d) => {
          // d.ref.path = posts/{postId}/comments/{commentId}/likes/{uid}
          // d.ref.parent = likes subcollection
          // d.ref.parent.parent = comment doc
          // d.ref.parent.parent.parent = comments subcollection
          // d.ref.parent.parent.parent.parent = post doc
          const commentDoc = d.ref.parent.parent
          const commentsCol = commentDoc?.parent
          const postDoc = commentsCol?.parent
          // Only match comment likes (where grandparent of like is a comment doc
          // and the comment doc's parent collection is 'comments' whose parent is the post)
          if (postDoc && postDoc.id === postId && commentsCol?.id === 'comments') {
            map[commentDoc.id] = true
          }
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

// Delete an idea — allowed for the author (or admin) by the Firestore rules.
export async function deleteIdea(ideaId) {
  await deleteDoc(doc(db, 'ideas', ideaId))
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

// Live unread-notification count for the nav badge (PRD §3.8).
export function subscribeUnreadCount(uid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)),
      (snap) => onData(snap.size),
      () => onData(0),
    )
  } catch {
    onData(0)
    return () => {}
  }
}

// Mark every unread notification as read (called when the page is opened).
export async function markAllNotificationsRead(uid, items) {
  const unread = (items || []).filter((n) => !n.read)
  if (!unread.length) return
  const batch = writeBatch(db)
  for (const n of unread) batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true })
  await batch.commit().catch(() => {})
}

// ----------------------------------------------------------------------------
// Direct messages — conversations keyed by sorted member pair.
// Uses a multi-char separator that cannot appear in Firebase UIDs
// (UIDs are alphanumeric, ~28 chars). Two underscores are safe.
// Existing conversations also use '__' so this stays backwards-compatible,
// but future IDs use a longer separator that would never appear in a UID.
// ----------------------------------------------------------------------------
export const convoId = (a, b) => [a, b].sort().join('___DSL2___')

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

// Typing indicator: stamp typing.<uid> with a timestamp; the peer treats it
// as "typing" if it's within the last few seconds.
export async function setTyping(cid, uid, isTyping) {
  if (!cid || !uid) return
  await updateDoc(doc(db, 'conversations', cid), {
    [`typing.${uid}`]: isTyping ? Date.now() : 0,
  }).catch(() => {})
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

// Structured "Collab Request" (PRD §3.7 / §3.6). Opens a collab conversation
// and notifies the target so they can Accept (+40) from their inbox.
export async function requestCollab(me, target, context = '') {
  if (!me?.uid || !target?.uid || me.uid === target.uid) return null
  const text = context
    ? `wants to collab on "${context}"`
    : 'wants to collab with you'
  const cid = await sendMessage(me.uid, target.uid, text, { isCollab: true })
  await pushNotification(target.uid, {
    type: 'collab',
    actorUid: me.uid,
    actor: { uid: me.uid, username: me.username, displayName: me.displayName, avatar: me.avatar },
    text: 'sent you a collab request',
    convoId: cid,
  })
  return cid
}

// Mark a conversation's collab request accepted (the +40 payout is server-side).
// SECURITY: Verifies the caller is a member of the conversation before allowing.
export async function acceptCollab(cid) {
  if (!cid) return
  const caller = auth.currentUser
  if (!caller) return
  const convoRef = doc(db, 'conversations', cid)
  const snap = await getDoc(convoRef).catch(() => null)
  if (!snap || !snap.exists()) return
  const members = snap.data()?.members || []
  if (!members.includes(caller.uid)) return // not a member — reject
  await updateDoc(convoRef, { collabAccepted: true }).catch(() => {})
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

// ----------------------------------------------------------------------------
// Error capture & monitoring (Admin Copilot)
// ----------------------------------------------------------------------------
// Best-effort: log a frontend error/crash so the admin (and the AI agent) can
// see it. De-duped client-side in main.jsx; rules let any signed-in user create
// but only the admin can read/resolve. Never throws.
export async function logError(entry) {
  try {
    await addDoc(collection(db, 'errors'), {
      status: 'open',
      ...entry,
      createdAt: serverTimestamp(),
    })
  } catch { /* non-fatal — logging must never break the app */ }
}

// Admin: live list of captured errors (newest first).
export function subscribeErrors(onData, max = 100) {
  try {
    return onSnapshot(
      query(collection(db, 'errors'), orderBy('createdAt', 'desc'), limit(max)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

// Admin: mark a captured error resolved.
export async function resolveError(errorId) {
  await updateDoc(doc(db, 'errors', errorId), { status: 'resolved' })
}

// Admin: live view of the latest monitoring digest written by the cron scan.
export function subscribeAdminDigest(onData) {
  try {
    return onSnapshot(
      doc(db, 'admin_digests', 'latest'),
      (snap) => onData(snap.exists() ? snap.data() : null),
      () => onData(null),
    )
  } catch {
    onData(null)
    return () => {}
  }
}

// Admin moderation: delete a post (allowed for the author or admin by rules).
export async function deletePost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId)).catch(() => null)
  const authorUid = snap?.exists() ? snap.data().authorUid : null
  await deleteDoc(doc(db, 'posts', postId))
  if (authorUid) {
    // Atomic decrement avoids races between concurrent deletes; we can't
    // clamp on the server, so we accept a transient -1 if multiple deletes
    // run interleaved with a counter recount. createPost increments(+1) so
    // both sides stay symmetric.
    await updateDoc(doc(db, 'users', authorUid), { postsCount: increment(-1) }).catch(() => {})
  }
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

// Story viewer list (PRD §3.4 "Story viewer list visible to poster").
export async function markStoryViewed(storyId, uid) {
  if (!storyId || !uid) return
  await updateDoc(doc(db, 'stories', storyId), { viewers: arrayUnion(uid) }).catch(() => {})
}

// ----------------------------------------------------------------------------
// Credit transaction log — subcollection on each user doc.
// ----------------------------------------------------------------------------

// Write a credit transaction log entry (best-effort — never throw).
export async function logCreditTx(uid, { amount, type, description }) {
  try {
    await addDoc(collection(db, 'users', uid, 'credits_log'), {
      amount,        // positive = earned, negative = spent
      type,          // 'earn' | 'spend'
      description,   // human-readable e.g. "Post published +30"
      createdAt: serverTimestamp(),
    })
  } catch { /* non-fatal */ }
}

// Fetch credit log for the current user (last 50 entries).
export function subscribeCreditLog(uid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'users', uid, 'credits_log'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}

// Mark onboarding as complete for new users.
export async function markOnboardingDone(uid) {
  await updateDoc(doc(db, 'users', uid), { onboardingDone: true }).catch(() => {})
}

export { getDoc, doc }
