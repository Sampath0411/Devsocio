import { Component, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, initAnalytics } from './firebase'
import { ensureProfile, isAdmin, logout } from './lib/auth'
import { reportError } from './lib/errorReporter'
import {
  subscribeProfile,
  subscribePosts,
  subscribeUsers,
  subscribeMyLikes,
  subscribeMySaves,
  subscribeMyFollowing,
  touchPresence,
  markOnboardingDone,
  updateProfileDoc,
} from './lib/db'
import { useStore } from './store/useStore'
import { ToastProvider } from './components/Toast'
import PageLoader from './components/PageLoader'
import Layout from './components/Layout'
import OnboardingTour from './components/OnboardingTour'

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
import Settings from './pages/Settings'

// Catch render-time crashes anywhere in the tree, log them for the Admin
// Copilot, and show a recoverable fallback instead of a white screen.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    reportError('react.render', {
      message: error?.message || String(error),
      stack: (error?.stack || '') + '\n' + (info?.componentStack || ''),
    })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center p-6 text-center">
          <div className="max-w-sm space-y-3">
            <h1 className="font-display text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-text-muted">
              The error was logged for the team. Try reloading the page.
            </p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Auth guard — protected routes redirect to /login (PRD §9).
function Protected({ children, wide }) {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const location = useLocation()
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  return <Layout wide={wide}>{children}</Layout>
}

// Admin-only guard — only the configured ADMIN_EMAIL may view /admin (PRD §9).
function AdminOnly({ children }) {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const location = useLocation()
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin(firebaseUser)) return <Navigate to="/feed" replace />
  return <Layout wide>{children}</Layout>
}

export default function App() {
  const {
    authReady, setAuthReady, setFirebaseUser, setProfile, clearAuth,
    setPosts, setUsers, setLikes, setSaved, setFollowing,
  } = useStore()

  const [showTour, setShowTour] = useState(false)

  // Real-time auth state (PRD §3.1.2) + live profile, feed, directory & graph.
  useEffect(() => {
    initAnalytics()
    const claimedMilestones = new Set()
    const unsubPosts = subscribePosts((posts) => {
      setPosts(posts)
      // Feature 5: Check if any post owned by the current user just crossed
      // 10 or 50 likes — if so, silently claim milestone credits on their behalf.
      const { firebaseUser: u } = useStore.getState()
      if (!u) return
      const mine = posts.filter((p) => p.authorUid === u.uid)
      for (const p of mine) {
        if (p.likes >= 10 && !p.milestone10Paid && !claimedMilestones.has(p.postId + '_10')) {
          claimedMilestones.add(p.postId + '_10')
          import('./lib/credits').then(({ claimPostMilestone }) =>
            claimPostMilestone('post_10_likes', p.postId).catch(() => {
              claimedMilestones.delete(p.postId + '_10')
            })
          )
        }
        if (p.likes >= 50 && !p.milestone50Paid && !claimedMilestones.has(p.postId + '_50')) {
          claimedMilestones.add(p.postId + '_50')
          import('./lib/credits').then(({ claimPostMilestone }) =>
            claimPostMilestone('post_50_likes', p.postId).catch(() => {
              claimedMilestones.delete(p.postId + '_50')
            })
          )
        }
      }
    })
    const unsubUsers = subscribeUsers(setUsers)
    let unsubProfile = null
    let unsubGraph = []

    const stopGraph = () => { unsubGraph.forEach((fn) => fn?.()); unsubGraph = [] }

    let presenceTimer = null
    const stopPresence = () => { if (presenceTimer) clearInterval(presenceTimer); presenceTimer = null }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubProfile?.()
      unsubProfile = null
      stopGraph()
      stopPresence()
      setFirebaseUser(u)
      if (u) {
        // Heartbeat: stamp lastActiveAt now and every ~60s for online status.
        touchPresence(u.uid)
        presenceTimer = setInterval(() => touchPresence(u.uid), 60 * 1000)
        // Live social graph for the signed-in user.
        unsubGraph = [
          subscribeMyLikes(u.uid, setLikes),
          subscribeMySaves(u.uid, setSaved),
          subscribeMyFollowing(u.uid, (followingMap) => {
            setFollowing(followingMap)
            const actualCount = Object.keys(followingMap).length
            const currentProfile = useStore.getState().user
            if (currentProfile && currentProfile.followingCount !== actualCount) {
              updateProfileDoc(u.uid, { followingCount: actualCount }).catch(() => {})
            }
          }),
        ]
        try {
          const initial = await ensureProfile(u) // create doc on first sign-in
          if (initial.banned && !isAdmin(u)) { await logout(); return }
          setProfile(initial)
          // Live profile — also enforces bans applied while the user is online.
          unsubProfile = subscribeProfile(u.uid, (p) => {
            if (p.banned && !isAdmin(u)) { logout(); return }
            setProfile(p)
          })
          // Feature 12: show onboarding tour for new users only
          if (!initial.onboardingDone) setShowTour(true)
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
        setShowTour(false)
      }
      setAuthReady(true)
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
      unsubPosts?.()
      unsubUsers?.()
      stopGraph()
      stopPresence()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ToastProvider>
      <AnimatePresence>
        {!authReady && <PageLoader key="loader" onDone={() => {}} />}
      </AnimatePresence>

      {showTour && (
        <OnboardingTour onDone={() => {
          setShowTour(false)
          if (auth.currentUser) markOnboardingDone(auth.currentUser.uid)
        }} />
      )}

      {authReady && (
        <ErrorBoundary>
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
          <Route path="/settings" element={<Protected wide><Settings /></Protected>} />
          <Route path="/post/:id" element={<Protected><PostDetail /></Protected>} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      )}
    </ToastProvider>
  )
}
