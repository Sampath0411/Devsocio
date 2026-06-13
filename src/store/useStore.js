import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { changeCredits, updateProfileDoc } from '../lib/db'

// Global state. Auth/profile/credits are backed by Firebase and kept in sync
// in real time via onAuthStateChanged + Firestore onSnapshot (set up in App).
// Likes / saves / follows are local UI state layered on top of feed data so
// real-time post updates never clobber them.
export const useStore = create(
  persist(
    (set, get) => ({
      // ---- auth (driven by Firebase) ----
      authReady: false, // true once the first onAuthStateChanged has fired
      firebaseUser: null, // raw Firebase user
      user: null, // Firestore profile doc (users/{uid})

      setAuthReady: (v) => set({ authReady: v }),
      setFirebaseUser: (u) => set({ firebaseUser: u }),
      setProfile: (p) => set({ user: p }),
      clearAuth: () => set({ firebaseUser: null, user: null }),

      // ---- credits (PRD §5) — write-through to Firestore ----
      addCredits: async (amount) => {
        const u = get().firebaseUser
        // optimistic local bump; onSnapshot will reconcile
        set((s) => (s.user ? { user: { ...s.user, credits: s.user.credits + amount } } : {}))
        if (u) {
          try {
            await changeCredits(u.uid, amount)
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

      // ---- local UI state ----
      likes: {}, // postId -> bool
      toggleLike: (postId) =>
        set((s) => ({ likes: { ...s.likes, [postId]: !s.likes[postId] } })),

      saved: {},
      toggleSave: (postId) =>
        set((s) => ({ saved: { ...s.saved, [postId]: !s.saved[postId] } })),

      following: {},
      toggleFollow: (uid) =>
        set((s) => ({ following: { ...s.following, [uid]: !s.following[uid] } })),
    }),
    {
      name: 'devsocio-ui',
      // Only persist local UI prefs; auth/profile come from Firebase each load.
      partialize: (s) => ({ likes: s.likes, saved: s.saved, following: s.following }),
    },
  ),
)
