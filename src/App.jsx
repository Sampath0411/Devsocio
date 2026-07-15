import { Component, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseInitialized, initAnalytics } from './firebase'
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
import { claimPostMilestone } from './lib/credits'
import { useToast, ToastProvider } from './components/Toast'
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

// ---- Error Boundary ----
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
        <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
          <div className="max-w-sm space-y-3">
            <h1 className="font-display text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-text-muted">The error was logged. Try reloading.</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Guards ----
function Protected({ children, wide }) {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const location = useLocation()
  if (!firebaseInitialized) return <Navigate to="/" replace />
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  return <Layout wide={wide}>{children}</Layout>
}

function AdminOnly({ children }) {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const location = useLocation()
  if (!firebaseInitialized) return <Navigate to="/" replace />
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin(firebaseUser)) return <Navigate to="/feed" replace />
  return <Layout wide>{children}</Layout>
}

// ---- Auth-gated Login/Signup wrappers ----
function LoginGate() {
  const firebaseUser = useStore((s) => s.firebaseUser)
  if (!firebaseInitialized) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-xl font-bold text-white">Firebase not configured</h1>
          <p className="text-sm text-text-muted">
            Set <code className="text-primary">VITE_FIREBASE_*</code> env vars in Vercel to enable authentication.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }
  if (firebaseUser) return <Navigate to="/feed" replace />
  return <Login />
}

function SignupGate() {
  const firebaseUser = useStore((s) => s.firebaseUser)
  if (!firebaseInitialized) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-xl font-bold text-white">Firebase not configured</h1>
          <p className="text-sm text-text-muted">
            Set <code className="text-primary">VITE_FIREBASE_*</code> env vars in Vercel to enable authentication.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }
  if (firebaseUser) return <Navigate to="/feed" replace />
  return <Signup />
}

// ---- App ----
export default function App() {
  const {
    authReady, setAuthReady, setFirebaseUser, setProfile, clearAuth,
    setPosts, setUsers, setLikes, setSaved, setFollowing,
  } = useStore()
  const toast = useToast()

  const [showTour, setShowTour] = useState(false)
  const claimedMilestones = useRef(new Set())

  // Surface store errors as toasts.
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      const err = state._lastError
      if (err && err !== prev._lastError) {
        toast(err.message || 'Something went wrong', { tone: 'warning' })
        useStore.getState().clearLastError()
      }
    })
    return unsub
  }, [toast])

  // Init Firebase + auth + subscriptions.
  useEffect(() => {
    firebaseInitialized
    initAnalytics()
    const unsubPosts = subscribePosts((posts) => {
      setPosts(posts)
      const { firebaseUser: u } = useStore.getState()
      if (!u) return
      const mine = posts.filter((p) => p.authorUid === u.uid)
      const set = claimedMilestones.current
      for (const p of mine) {
        if (p.likes >= 10 && !p.milestone10Paid && !set.has(p.postId + '_10')) {
          set.add(p.postId + '_10')
          claimPostMilestone('post_10_likes', p.postId)
            .then((r) => { if (!r?.awarded) set.delete(p.postId + '_10') })
            .catch(() => set.delete(p.postId + '_10'))
        }
        if (p.likes >= 50 && !p.milestone50Paid && !set.has(p.postId + '_50')) {
          set.add(p.postId + '_50')
          claimPostMilestone('post_50_likes', p.postId)
            .then((r) => { if (!r?.awarded) set.delete(p.postId + '_50') })
            .catch(() => set.delete(p.postId + '_50'))
        }
      }
    })
    let unsubUsers = null
    let unsubProfile = null
    let unsubGraph = []

    const stopGraph = () => { unsubGraph.forEach((fn) => fn?.()); unsubGraph = [] }

    let presenceTimer = null
    const stopPresence = () => { if (presenceTimer) clearInterval(presenceTimer); presenceTimer = null }

    const unsubAuth = auth ? onAuthStateChanged(auth, async (u) => {
      unsubProfile?.()
      unsubProfile = null
      if (!unsubUsers) unsubUsers = subscribeUsers(setUsers)
      stopGraph()
      stopPresence()
      setFirebaseUser(u)
      if (u) {
        touchPresence(u.uid)
        presenceTimer = setInterval(() => touchPresence(u.uid), 60 * 1000)
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
          const initial = await ensureProfile(u)
          if (initial.banned && !isAdmin(u)) { await logout(); return }
          setProfile(initial)
          unsubProfile = subscribeProfile(u.uid, (p) => {
            if (!p) return
            if (p.banned && !isAdmin(u)) { logout(); return }
            setProfile(p)
          })
          if (!initial.onboardingDone) setShowTour(true)
        } catch {
          setProfile({
            uid: u.uid,
            username: (u.email || u.uid).split('@')[0],
            displayName: u.displayName || 'Developer',
            avatar: u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}&backgroundColor=007991`,
            devLevel: 'Builder', techStack: ['React'], credits: 100, links: {},
          })
        }
      } else {
        clearAuth()
        setShowTour(false)
      }
      setAuthReady(true)
    }) : (() => { setAuthReady(true); return undefined })()

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
        {!authReady && <PageLoader key="loader" />}
      </AnimatePresence>

      {showTour && (
        <OnboardingTour onDone={() => {
          setShowTour(false)
          if (auth?.currentUser) markOnboardingDone(auth.currentUser.uid).catch(() => {})
        }} />
      )}

      {authReady && (
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginGate />} />
          <Route path="/signup" element={<SignupGate />} />
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
