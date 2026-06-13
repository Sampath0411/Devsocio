import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, initAnalytics } from './firebase'
import { ensureProfile } from './lib/auth'
import {
  subscribeProfile,
  subscribePosts,
  subscribeUsers,
  subscribeMyLikes,
  subscribeMySaves,
  subscribeMyFollowing,
} from './lib/db'
import { useStore } from './store/useStore'
import { ToastProvider } from './components/Toast'
import PageLoader from './components/PageLoader'
import Layout from './components/Layout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import Ideas from './pages/Ideas'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Credits from './pages/Credits'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import PostDetail from './pages/PostDetail'
import Admin from './pages/Admin'

// Auth guard — protected routes redirect to /login (PRD §9).
function Protected({ children, wide }) {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const location = useLocation()
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  return <Layout wide={wide}>{children}</Layout>
}

export default function App() {
  const {
    authReady, setAuthReady, setFirebaseUser, setProfile, clearAuth,
    setPosts, setUsers, setLikes, setSaved, setFollowing,
  } = useStore()

  // Real-time auth state (PRD §3.1.2) + live profile, feed, directory & graph.
  useEffect(() => {
    initAnalytics()
    const unsubPosts = subscribePosts(setPosts)
    const unsubUsers = subscribeUsers(setUsers)
    let unsubProfile = null
    let unsubGraph = []

    const stopGraph = () => { unsubGraph.forEach((fn) => fn?.()); unsubGraph = [] }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubProfile?.()
      unsubProfile = null
      stopGraph()
      setFirebaseUser(u)
      if (u) {
        // Live social graph for the signed-in user.
        unsubGraph = [
          subscribeMyLikes(u.uid, setLikes),
          subscribeMySaves(u.uid, setSaved),
          subscribeMyFollowing(u.uid, setFollowing),
        ]
        try {
          const initial = await ensureProfile(u) // create doc on first sign-in
          setProfile(initial)
          unsubProfile = subscribeProfile(u.uid, setProfile)
        } catch {
          // Firestore unreadable (rules) — fall back to a minimal profile.
          setProfile({
            uid: u.uid,
            username: (u.email || u.uid).split('@')[0],
            displayName: u.displayName || 'Developer',
            avatar: u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}&backgroundColor=6c63ff`,
            devLevel: 'Builder',
            techStack: ['React'],
            credits: 100,
            links: {},
          })
        }
      } else {
        clearAuth()
      }
      setAuthReady(true)
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
      unsubPosts?.()
      unsubUsers?.()
      stopGraph()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ToastProvider>
      <AnimatePresence>
        {!authReady && <PageLoader key="loader" onDone={() => {}} />}
      </AnimatePresence>

      {authReady && (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/feed" element={<Protected><Feed /></Protected>} />
          <Route path="/explore" element={<Protected><Explore /></Protected>} />
          <Route path="/ideas" element={<Protected><Ideas /></Protected>} />
          <Route path="/profile/edit" element={<Protected wide><EditProfile /></Protected>} />
          <Route path="/profile/:username" element={<Protected><Profile /></Protected>} />
          <Route path="/messages" element={<Protected wide><Messages /></Protected>} />
          <Route path="/messages/:id" element={<Protected wide><Messages /></Protected>} />
          <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
          <Route path="/credits" element={<Protected wide><Credits /></Protected>} />
          <Route path="/post/:id" element={<Protected><PostDetail /></Protected>} />
          <Route path="/admin" element={<Protected wide><Admin /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </ToastProvider>
  )
}
