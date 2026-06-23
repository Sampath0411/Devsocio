import { create } from 'zustand'
import {
  changeCredits,
  updateProfileDoc,
  setPostLike,
  setPostSave,
  setFollow,
  pushNotification,
  logCreditTx,
} from '../lib/db'

// Global state. Auth/profile/credits AND the social graph (likes/saves/follows)
// are backed by Firebase and kept in sync in real time via onAuthStateChanged +
// Firestore onSnapshot (wired up in App). The likes/saves/following maps are
// hydrated from per-user subscriptions; toggles write through optimistically.
export const useStore = create((set, get) => ({
  // ---- auth (driven by Firebase) ----
  authReady: false, // true once the first onAuthStateChanged has fired
  firebaseUser: null, // raw Firebase user
  user: null, // Firestore profile doc (users/{uid})

  setAuthReady: (v) => set({ authReady: v }),
  setFirebaseUser: (u) => set({ firebaseUser: u }),
  setProfile: (p) => set({ user: p }),
  clearAuth: () => set({ firebaseUser: null, user: null, likes: {}, saved: {}, following: {} }),

  // ---- credits (PRD §5) — write-through to Firestore ----
  addCredits: async (amount) => {
    const u = get().firebaseUser
    // optimistic local bump; onSnapshot will reconcile
    set((s) => (s.user ? { user: { ...s.user, credits: (s.user.credits || 0) + amount } } : {}))
    if (u) {
      try {
        await changeCredits(u.uid, amount)
        if (amount > 0) logCreditTx(u.uid, { amount, type: 'earn', description: `Credits earned (+${amount})` })
      } catch {
        /* offline / rules — keep optimistic value */
      }
    }
  },
  spendCredits: async (amount) => {
    const profile = get().user
    const u = get().firebaseUser
    if (!profile || profile.credits < amount) return false
    set({ user: { ...profile, credits: profile.credits - amount } })
    if (u) {
      try {
        await changeCredits(u.uid, -amount)
        logCreditTx(u.uid, { amount: -amount, type: 'spend', description: `Credits spent (-${amount})` })
      } catch {
        /* ignore */
      }
    }
    return true
  },

  saveProfileFields: async (fields) => {
    const u = get().firebaseUser
    set((s) => (s.user ? { user: { ...s.user, ...fields } } : {}))
    if (u) {
      try {
        await updateProfileDoc(u.uid, fields)
      } catch {
        /* ignore */
      }
    }
  },

  // ---- feed (real-time from Firestore, mock fallback) ----
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPostLocal: (post) => set((s) => ({ posts: [post, ...s.posts] })),

  // ---- directory of users (real-time from Firestore, mock fallback) ----
  users: [],
  setUsers: (users) => set({ users }),

  // ---- social graph (hydrated from Firestore subscriptions) ----
  likes: {}, // postId -> bool
  saved: {}, // postId -> bool
  following: {}, // uid -> bool
  setLikes: (likes) => set({ likes }),
  setSaved: (saved) => set({ saved }),
  setFollowing: (following) => set({ following }),

  // Like a post — optimistic flip, write-through, notify the author.
  // Debounced via a pending map to prevent race conditions on rapid double-clicks.
  _pendingLikes: {},
  toggleLike: (postId, authorUid) => {
    const u = get().firebaseUser
    if (!u) return
    // Prevent concurrent calls on the same post
    const pending = get()._pendingLikes
    if (pending[postId]) return
    pending[postId] = true
    set({ _pendingLikes: { ...pending } })
    const next = !get().likes[postId]
    set((s) => ({
      likes: { ...s.likes, [postId]: next },
    }))
    setPostLike(postId, u.uid, next)
      .catch(() => {
        // revert on failure
        set((s) => ({ likes: { ...s.likes, [postId]: !next } }))
      })
      .finally(() => {
        const p = { ...get()._pendingLikes }
        delete p[postId]
        set({ _pendingLikes: p })
      })
    if (next && authorUid && authorUid !== u.uid) {
      pushNotification(authorUid, {
        type: 'like',
        actorUid: u.uid,
        actor: minimalActor(get().user),
        text: 'liked your post',
        postId,
      })
    }
  },

  toggleSave: (postId) => {
    const u = get().firebaseUser
    const next = !get().saved[postId]
    set((s) => ({ saved: { ...s.saved, [postId]: next } }))
    if (u) setPostSave(u.uid, postId, next).catch(() => {})
  },

  toggleFollow: (uid) => {
    const u = get().firebaseUser
    const next = !get().following[uid]
    set((s) => ({ following: { ...s.following, [uid]: next } }))
    if (!u) return
    setFollow(u.uid, uid, next).catch(() => {})
    if (next && uid !== u.uid) {
      pushNotification(uid, {
        type: 'follow',
        actorUid: u.uid,
        actor: minimalActor(get().user),
        text: 'started following you',
      })
    }
  },
}))

// Trim a profile to the fields a notification needs to render an avatar + link.
function minimalActor(user) {
  if (!user) return null
  return {
    uid: user.uid,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
  }
}
