import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { logout as fbLogout, isAdmin } from '../lib/auth'
import { subscribeUnreadCount } from '../lib/db'
import { formatNum } from '../lib/time'
import { Avatar } from './ui'
import DevSocioLogo from './Logo'
import {
  Home, Compass, Lightbulb, Mail, Bell, Search, Plus,
  User, Coins, Settings, LogOut, ShieldAlert, UserPlus,
} from './icons'

// Live unread-notifications count for the signed-in user.
function useUnreadCount() {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!firebaseUser) return undefined
    return subscribeUnreadCount(firebaseUser.uid, setN)
  }, [firebaseUser])
  return n
}

// Orange notification badge
function Badge({ n }) {
  if (!n) return null
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-black shadow-glow-sm"
    >
      {n > 9 ? '9+' : n}
    </motion.span>
  )
}

// Primary nav items
const NAV = [
  { to: '/feed', label: 'Home', Icon: Home },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/ideas', label: 'Ideas', Icon: Lightbulb },
  { to: '/messages', label: 'Messages', Icon: Mail },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
]

// Avatar button + dropdown
function ProfileMenu() {
  const { user, firebaseUser, clearAuth } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const doLogout = async () => {
    try { await fbLogout() } catch { /* ignore */ }
    clearAuth()
    toast('Logged out', { tone: 'success', icon: LogOut })
    navigate('/')
  }

  if (!user) return null

  const item = 'flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-white transition-colors'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-pill border border-border p-1 pr-2 transition-all duration-200 hover:border-primary/50 hover:shadow-glow-sm"
      >
        <Avatar src={user.avatar} alt={user.displayName} size={30} />
        <span className="hidden max-w-[90px] truncate text-sm font-medium text-text-secondary md:block">
          {user.displayName}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 mt-2 w-64 rounded-card border border-border bg-surface p-1.5 shadow-2xl z-50"
            style={{ background: 'linear-gradient(135deg, #1A2B4E, #14213D)' }}
          >
            {/* Profile header */}
            <Link
              to={`/profile/${user.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-input p-2.5 hover:bg-surface-2 transition-colors"
            >
              <Avatar src={user.avatar} alt={user.displayName} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user.displayName}</p>
                <p className="truncate text-xs text-text-muted">@{user.username}</p>
              </div>
            </Link>

            {/* Credits chip */}
            <Link
              to="/credits"
              onClick={() => setOpen(false)}
              className="my-1.5 flex items-center justify-between rounded-input border border-primary/25 px-3 py-2 transition-all hover:border-primary/50"
              style={{ background: 'rgba(252,163,17,0.08)' }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Coins size={16} /> Credits
              </span>
              <span className="text-sm font-bold text-primary">{formatNum(user.credits)}</span>
            </Link>

            <div className="my-1.5 h-px bg-border" />

            <Link to={`/profile/${user.username}`} onClick={() => setOpen(false)} className={item}>
              <User size={16} /> Profile
            </Link>
            <Link to="/profile/edit" onClick={() => setOpen(false)} className={item}>
              <UserPlus size={16} /> Edit profile
            </Link>
            <Link to="/settings" onClick={() => setOpen(false)} className={item}>
              <Settings size={16} /> Settings
            </Link>
            {isAdmin(firebaseUser) && (
              <Link to="/admin" onClick={() => setOpen(false)} className={item}>
                <ShieldAlert size={16} /> Admin panel
              </Link>
            )}

            <div className="my-1.5 h-px bg-border" />

            <button onClick={doLogout} className={`${item} hover:text-danger`}>
              <LogOut size={16} /> Log out
            </button>
            <p className="px-2.5 pb-1 pt-1 text-[10px] text-text-muted truncate">
              {firebaseUser?.email || 'signed in'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TopNav() {
  const navigate = useNavigate()
  const unread = useUnreadCount()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const runSearch = (e) => {
    e.preventDefault()
    navigate(`/explore?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border backdrop-blur-xl"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        {/* Logo */}
        <Link to="/feed">
          <DevSocioLogo size="md" />
        </Link>

        {/* Search (desktop) */}
        <form onSubmit={runSearch} className="relative hidden flex-1 max-w-sm md:block ml-4">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            className="input pl-9 pr-4 text-sm"
            placeholder="Search devs, stacks, #tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </form>

        <div className="ml-auto flex items-center gap-1">
          {/* Search icon (mobile → Explore) */}
          <Link
            to="/explore"
            aria-label="Search"
            className="grid h-9 w-9 place-items-center rounded-input text-text-muted hover:text-white md:hidden transition-colors"
          >
            <Search size={20} />
          </Link>

          {/* Primary nav (desktop only) */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                title={n.label}
                className={({ isActive }) =>
                  `relative flex flex-col items-center rounded-input px-3 py-2 transition-all duration-200 ${
                    isActive ? 'text-primary' : 'text-text-muted hover:text-white hover:bg-surface-2'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <n.Icon size={20} />
                      {n.to === '/notifications' && <Badge n={unread} />}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute -bottom-[9px] h-0.5 w-6 rounded-full nav-active-indicator"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Create button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/feed?create=1')}
            className="btn-primary hidden !px-4 !py-2 md:inline-flex ml-1"
          >
            <Plus size={16} /> <span>Create</span>
          </motion.button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

// Right rail — suggested devs, trending, leaderboard
function RightPanel() {
  const { following, toggleFollow, users, posts, user: me } = useStore()
  const people = users.filter((u) => u.uid !== me?.uid)
  const leaderboard = [...users]
    .sort((a, b) => (b.credits || 0) - (a.credits || 0))
    .slice(0, 5)
    .map((u, i) => ({ rank: i + 1, user: u, credits: u.credits || 0 }))

  const trendCounts = {}
  for (const p of posts) for (const h of p.hashtags || []) trendCounts[h] = (trendCounts[h] || 0) + 1
  const trending = Object.entries(trendCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, n]) => ({ tag, posts: n }))

  return (
    <aside className="sticky top-[88px] hidden h-fit w-72 shrink-0 space-y-4 lg:block">
      {people.length > 0 && (
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <span className="h-1 w-4 rounded-full bg-primary" />
            Suggested for you
          </h3>
          <div className="space-y-3">
            {people.slice(0, 3).map((u) => (
              <div key={u.uid} className="flex items-center gap-2">
                <Link to={`/profile/${u.username}`}>
                  <Avatar src={u.avatar} alt={u.displayName} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/profile/${u.username}`}
                    className="block truncate text-sm font-semibold text-white hover:text-primary transition-colors"
                  >
                    {u.displayName}
                  </Link>
                  <p className="truncate text-xs text-text-muted">
                    {(u.techStack || []).slice(0, 2).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => toggleFollow(u.uid)}
                  className={`pill border text-xs transition-all ${
                    following[u.uid]
                      ? 'border-success/40 text-success bg-success/10'
                      : 'border-primary/40 text-primary hover:bg-primary/10'
                  }`}
                >
                  {following[u.uid] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {trending.length > 0 && (
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <span className="h-1 w-4 rounded-full bg-primary" />
            Trending
          </h3>
          <ul className="space-y-2">
            {trending.map((h, i) => (
              <li key={h.tag} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted w-4">{i + 1}</span>
                  <span className="font-medium text-primary hover:text-primary-soft cursor-pointer transition-colors">
                    {h.tag}
                  </span>
                </span>
                <span className="text-xs text-text-muted">{h.posts} posts</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <span className="h-1 w-4 rounded-full bg-primary" />
            Leaderboard
          </h3>
          <ol className="space-y-2">
            {leaderboard.map((row) => (
              <li key={row.rank} className="flex items-center gap-2 text-sm">
                <span className={`w-5 text-center text-xs font-bold ${row.rank <= 3 ? 'text-primary' : 'text-text-muted'}`}>
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                </span>
                <Avatar src={row.user.avatar} alt={row.user.displayName} size={26} />
                <span className="flex-1 truncate text-text-secondary">{row.user.displayName}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  <Coins size={11} /> {formatNum(row.credits)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  )
}

// Bottom tab bar — mobile only
function BottomNav() {
  const navigate = useNavigate()
  const unread = useUnreadCount()
  return (
    <>
      {/* Floating create button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate('/feed?create=1')}
        aria-label="Create post"
        className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-black shadow-glow md:hidden"
        style={{ boxShadow: '0 0 24px rgba(252,163,17,0.5)' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border md:hidden backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.92)' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              aria-label={n.label}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all duration-200 ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    className="relative"
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <n.Icon size={22} />
                    {n.to === '/notifications' && <Badge n={unread} />}
                  </motion.span>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-dot"
                      className="h-1 w-1 rounded-full bg-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

export default function Layout({ children, wide }) {
  return (
    <div className="min-h-screen bg-bg">
      <TopNav />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-6 md:pb-6">
        <main className="min-w-0 flex-1">{children}</main>
        {!wide && <RightPanel />}
      </div>
      <BottomNav />
    </div>
  )
}
