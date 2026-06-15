import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { logout as fbLogout } from '../lib/auth'
import { Avatar } from '../components/ui'
import {
  Settings as Cog, User, Bell, Eye, Handshake, LogOut, Trash2, Circle,
} from '../components/icons'

function Toggle({ Icon, label, desc, on, onChange }) {
  return (
    <button onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-input border border-border px-3 py-3 text-left">
      <span className="flex items-center gap-2.5">
        <Icon size={16} className="text-text-muted" />
        <span>
          <span className="block text-sm">{label}</span>
          {desc && <span className="block text-xs text-text-muted">{desc}</span>}
        </span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-success' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export default function Settings() {
  const { user, saveProfileFields, clearAuth } = useStore()
  const toast = useToast()
  const navigate = useNavigate()

  const [prefs, setPrefs] = useState({
    showOnline: user?.showOnline ?? true,
    allowDMs: user?.allowDMs ?? true,
    publicProfile: user?.publicProfile ?? true,
    emailNotifs: user?.emailNotifs ?? false,
  })

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    saveProfileFields({ [key]: next[key] })
  }

  const doLogout = async () => {
    try { await fbLogout() } catch { /* ignore */ }
    clearAuth()
    navigate('/')
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><Cog size={20} /> Settings</h1>

      {/* Account */}
      <div className="card mb-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold"><User size={15} /> Account</h2>
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} alt={user?.displayName} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-text-muted">@{user?.username}{user?.email ? ` · ${user.email}` : ''}</p>
          </div>
          <button onClick={() => navigate('/profile/edit')} className="btn-ghost text-xs">Edit profile</button>
        </div>
      </div>

      {/* Privacy */}
      <div className="card mb-4 space-y-2">
        <h2 className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold"><Eye size={15} /> Privacy</h2>
        <Toggle Icon={Circle} label="Show online status" desc="Let others see when you're active" on={prefs.showOnline} onChange={() => toggle('showOnline')} />
        <Toggle Icon={Handshake} label="Allow direct messages" desc="Anyone can start a chat with you" on={prefs.allowDMs} onChange={() => toggle('allowDMs')} />
        <Toggle Icon={Eye} label="Public profile" desc="Your profile is discoverable in Explore" on={prefs.publicProfile} onChange={() => toggle('publicProfile')} />
      </div>

      {/* Notifications */}
      <div className="card mb-4 space-y-2">
        <h2 className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold"><Bell size={15} /> Notifications</h2>
        <Toggle Icon={Bell} label="Email notifications" desc="Weekly digest & important alerts" on={prefs.emailNotifs} onChange={() => toggle('emailNotifs')} />
      </div>

      {/* Danger zone */}
      <div className="card space-y-2 border-danger/30">
        <h2 className="mb-1 font-display text-sm font-bold text-danger">Account actions</h2>
        <button onClick={doLogout} className="btn-ghost w-full justify-center"><LogOut size={15} /> Log out</button>
        <button
          onClick={() => toast('Account deletion: email sampathlox@gmail.com to request. Full self-serve delete coming soon.', { tone: 'warning' })}
          className="btn-ghost w-full justify-center text-danger"><Trash2 size={15} /> Delete account</button>
      </div>
    </div>
  )
}
