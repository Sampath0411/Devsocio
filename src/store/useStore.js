import { create } from 'zustand'
import {
  updateProfileDoc,
  setPostLike,
  setPostSave,
  setFollow,
  pushNotification,
} from '../lib/db'
import { spendCreditsRemote } from '../lib/credits'

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
  clearAuth: () => set({
    firebaseUser: null,
    user: null,
    likes: {},
    saved: {},
    following: {},
    _pendingLikes: {},
    _lastError: null,
  }),

  // ---- credits (PRD 5) — all writes go through /api/credits ----
  // The server uses the Admin SDK to atomically update Firestore and
  // enforces business rules (once-per-day daily bonus, balance check on
  // spends, etc.). The profile onSnapshot subscription in App.jsx then
  // propagates the authoritative balance back to this store automatically.
  //
  // addCredits is a no-op — earning actions go through earnCredits() in
  // lib/credits.js which calls the server directly. spendCredits makes a
  // server call and returns false if the user has insufficient credits.
  // `spendKey` must match a server-defined SPEND_ACTIONS key (e.g. 'invest_idea').
  addCredits: async (_amount) => { /* no-op: credits are server-authoritative */ },
  spendCredits: async (spendKey, targetId) => {
    try {
      const r = await spendCreditsRemote(spendKey, targetId)
      return !!r?.ok
    } catch {
      return false
    }
  },

  saveProfileFields: async (fields) => {
    const u = get().firebaseUser
    // Capture pre-optimistic state for rollback
    const prev = get().user
    set((s) => (s.user ? { user: { ...s.user, ...fields } } : {}))
    if (u && prev) {
      try {
        await updateProfileDoc(u.uid, fields)
      } catch (err) {
        // Roll back optimistic update to captured previous state.
        set({ user: prev })
        set({ _lastError: { kind: 'profile', message: 'Could not save profile changes' } })
      }
    }
  },

  // ---- feed (real-time from Firestore) ----
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPostLocal: (post) => set((s) => ({ posts: [post, ...s.posts] })),

  // ---- directory of users (real-time from Firestore) ----
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
    if (get()._pendingLikes[postId]) return
    set((s) => ({ _pendingLikes: { ...s._pendingLikes, [postId]: true } }))
    const next = !get().likes[postId]
    set((s) => ({
      likes: { ...s.likes, [postId]: next },
    }))
    setPostLike(postId, u.uid, next)
      .then(() => {
        // Only send the notification AFTER the like is confirmed.
        if (next && authorUid && authorUid !== u.uid) {
          pushNotification(authorUid, {
            type: 'like',
            actorUid: u.uid,
            actor: minimalActor(get().user),
            text: 'liked your post',
            postId,
          }).catch(() => { /* notification is best-effort */ })
        }
      })
      .catch(() => {
        // revert on failure
        set((s) => ({ likes: { ...s.likes, [postId]: !next } }))
        set({ _lastError: { kind: 'like', message: 'Could not update like — try again' } })
      })
      .finally(() => {
        const p = { ...get()._pendingLikes }
        delete p[postId]
        set({ _pendingLikes: p })
      })
  },

  toggleSave: (postId) => {
    const u = get().firebaseUser
    if (!u) return
    const next = !get().saved[postId]
    set((s) => ({ saved: { ...s.saved, [postId]: next } }))
    setPostSave(u.uid, postId, next).catch(() => {
      // Roll back optimistic save on failure.
      set((s) => ({ saved: { ...s.saved, [postId]: !next } }))
      set({ _lastError: { kind: 'save', message: 'Could not update save — try again' } })
    })
  },

  toggleFollow: (uid) => {
    const u = get().firebaseUser
    if (!u) return
    if (uid === u.uid) return
    const next = !get().following[uid]
    set((s) => ({ following: { ...s.following, [uid]: next } }))
    setFollow(u.uid, uid, next)
      .then(() => {
        // Only notify after the follow is confirmed.
        if (next) {
          pushNotification(uid, {
            type: 'follow',
            actorUid: u.uid,
            actor: minimalActor(get().user),
            text: 'started following you',
          }).catch(() => { /* best-effort */ })
        }
      })
      .catch(() => {
        // Roll back optimistic follow on failure.
        set((s) => ({ following: { ...s.following, [uid]: !next } }))
        set({ _lastError: { kind: 'follow', message: 'Could not update follow — try again' } })
      })
  },

  // ---- transient error channel ----
  // Components subscribe to this and surface a toast; App.jsx clears it after
  // showing. Decouples the store from the React toast context.
  _lastError: null,
  setLastError: (err) => set({ _lastError: err }),
  clearLastError: () => set({ _lastError: null }),
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
