import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { logout as fbLogout } from '../lib/auth'
import { Avatar } from './ui'
import { USERS, TRENDING_HASHTAGS, LEADERBOARD } from '../data/mock'
import {
  Home, Compass, Lightbulb, Mail, Bell, Search, Plus,
  User, Coins, Settings, LogOut, ShieldAlert, Code2, UserPlus,
} from './icons'

// Primary nav — Credits intentionally lives in the profile menu, not here.
const NAV = [
  { to: '/feed', label: 'Home', Icon: Home },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/ideas', label: 'Ideas', Icon: Lightbulb },
  { to: '/messages', label: 'Messages', Icon: Mail },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
]

function Brand() {
  return (
    <Link to="/feed" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-card bg-primary text-white">
        <Code2 size={18} />
      </span>
      <span className="hidden font-display text-xl font-extrabold tracking-tight sm:block">
        DevSocio
      </span>
    </Link>
  )
}

// Avatar button + dropdown — Profile, Credits, Edit, (Admin), Log out.
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
  const item = 'flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-sm text-text-muted hover:bg-bg hover:text-text-primary'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-pill border border-border p-1 pr-2 transition-colors hover:border-primary/50"
      >
        <Avatar src={user.avatar} alt={user.displayName} size={30} />
        <span className="hidden max-w-[90px] truncate text-sm font-medium md:block">
          {user.displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-card border border-border bg-surface p-1.5 shadow-2xl">
          <Link to={`/profile/${user.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-input p-2.5 hover:bg-bg">
            <Avatar src={user.avatar} alt={user.displayName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-text-muted">@{user.username}</p>
            </div>
          </Link>

          {/* Credits surfaced here (moved out of the nav) */}
          <Link to="/credits" onClick={() => setOpen(false)} className="my-1 flex items-center justify-between rounded-input border border-warning/30 bg-warning/[0.07] px-2.5 py-2">
            <span className="flex items-center gap-2 text-sm text-warning"><Coins size={16} /> Credits</span>
            <span className="text-sm font-bold text-warning">{user.credits}</span>
          </Link>

          <div className="my-1 h-px bg-border" />
          <Link to={`/profile/${user.username}`} onClick={() => setOpen(false)} className={item}><User size={16} /> Profile</Link>
          <Link to="/profile/edit" onClick={() => setOpen(false)} className={item}><Settings size={16} /> Edit profile</Link>
          <Link to="/admin" onClick={() => setOpen(false)} className={item}><ShieldAlert size={16} /> Admin panel</Link>
          <button onClick={doLogout} className={`${item} hover:text-danger`}><LogOut size={16} /> Log out</button>
          <p className="px-2.5 pb-1 pt-2 text-[10px] text-text-muted">
            {firebaseUser?.email || 'signed in'}
          </p>
        </div>
      )}
    </div>
  )
}

function TopNav() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Brand />

        {/* search (desktop) */}
        <div className="relative hidden flex-1 max-w-sm md:block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input pl-9" placeholder="Search devs, stacks, #tags" />
        </div>

        {/* nav links */}
        <nav className="ml-auto flex items-center gap-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              title={n.label}
              className={({ isActive }) =>
                `relative flex flex-col items-center rounded-input px-3 py-1.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <n.Icon size={20} />
                  {isActive && <span className="absolute -bottom-[9px] h-0.5 w-6 rounded-full bg-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button onClick={() => navigate('/feed?create=1')} className="btn-primary ml-1 !px-3 md:!px-4">
          <Plus size={16} /> <span className="hidden md:inline">Create</span>
        </button>

        <ProfileMenu />
      </div>
    </header>
  )
}

// Right rail (suggested devs / trending / leaderboard) on wide screens.
function RightPanel() {
  const { following, toggleFollow } = useStore()
  return (
    <aside className="sticky top-[88px] hidden h-fit w-72 shrink-0 space-y-4 lg:block">
      <div className="card">
        <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold">
          Suggested for you
        </h3>
        <div className="space-y-3">
          {USERS.slice(0, 3).map((u) => (
            <div key={u.uid} className="flex items-center gap-2">
              <Link to={`/profile/${u.username}`}>
                <Avatar src={u.avatar} alt={u.displayName} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/profile/${u.username}`} className="block truncate text-sm font-semibold hover:underline">
                  {u.displayName}
                </Link>
                <p className="truncate text-xs text-text-muted">{u.techStack.slice(0, 2).join(' · ')}</p>
              </div>
              <button
                onClick={() => toggleFollow(u.uid)}
                className={`pill border ${
                  following[u.uid]
                    ? 'border-success/50 text-success'
                    : 'border-primary/50 text-primary hover:bg-primary/10'
                }`}
              >
                {following[u.uid] ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-display text-sm font-bold">Trending</h3>
        <ul className="space-y-2">
          {TRENDING_HASHTAGS.map((h) => (
            <li key={h.tag} className="flex items-center justify-between text-sm">
              <span className="font-medium text-accent">{h.tag}</span>
              <span className="text-xs text-text-muted">{h.posts} posts</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 className="mb-3 font-display text-sm font-bold">Leaderboard</h3>
        <ol className="space-y-2">
          {LEADERBOARD.slice(0, 5).map((row) => (
            <li key={row.rank} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-text-muted">{row.rank}</span>
              <Avatar src={row.user.avatar} alt={row.user.displayName} size={26} />
              <span className="flex-1 truncate">{row.user.displayName}</span>
              <span className="flex items-center gap-1 text-xs text-warning"><Coins size={12} /> {row.credits}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}

export default function Layout({ children, wide }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <main className="min-w-0 flex-1">{children}</main>
        {!wide && <RightPanel />}
      </div>
    </div>
  )
}
