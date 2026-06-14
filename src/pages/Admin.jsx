import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar } from '../components/ui'
import { changeCredits } from '../lib/db'
import {
  ShieldAlert, Users, FileText, Mail, Coins, Plus,
  GithubMark, GoogleMark,
} from '../components/icons'

// Sign-up method → display label, colour and icon.
const PROVIDERS = [
  { key: 'google', label: 'Google', color: '#EA4335', Icon: GoogleMark },
  { key: 'github', label: 'GitHub', color: '#FFFFFF', Icon: GithubMark },
  { key: 'email', label: 'Email / Password', color: '#00C896', Icon: Mail },
]

// Normalise a stored provider value; anything unrecognised counts as email.
const providerKey = (u) => {
  const p = (u.provider || '').toLowerCase()
  if (p.includes('google')) return 'google'
  if (p.includes('github')) return 'github'
  return 'email'
}

// One member row with credit-granting controls (admin only).
function MemberRow({ u }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = PROVIDERS.find((p) => p.key === providerKey(u))
  const Icon = meta.Icon

  const grant = async (value) => {
    const delta = Number(value)
    if (!delta) return
    setBusy(true)
    try {
      await changeCredits(u.uid, delta) // live credits update reflects via onSnapshot
      toast(`${delta > 0 ? '+' : ''}${delta} credits → ${u.displayName}`, { icon: Coins })
      setAmount('')
    } catch {
      toast('Could not update credits (check admin rules)', { tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar src={u.avatar} alt={u.displayName} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{u.displayName}</p>
        <p className="truncate text-xs text-text-muted">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
      </div>

      <span className="flex items-center gap-1 text-sm font-bold text-warning">
        <Coins size={14} /> {u.credits || 0}
      </span>

      <span className="hidden pill border border-border sm:inline-flex" style={{ color: meta.color }}>
        <Icon size={12} /> {meta.label}
      </span>

      {/* grant credits */}
      <div className="flex items-center gap-1">
        <button onClick={() => grant(50)} disabled={busy}
          className="btn-ghost !px-2 !py-1.5 text-xs">+50</button>
        <button onClick={() => grant(100)} disabled={busy}
          className="btn-ghost !px-2 !py-1.5 text-xs">+100</button>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amt"
          className="input !w-16 !py-1.5 text-xs"
        />
        <button onClick={() => grant(amount)} disabled={busy || !amount}
          className="btn-primary !px-2.5 !py-1.5 text-xs">
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const { users, posts } = useStore()

  // Real login analytics: how many accounts signed in with each method.
  const counts = users.reduce(
    (acc, u) => { acc[providerKey(u)] += 1; return acc },
    { google: 0, github: 0, email: 0 },
  )
  const total = users.length || 1

  const stats = [
    { label: 'Total Users', value: users.length, Icon: Users },
    { label: 'Total Posts', value: posts.length, Icon: FileText },
    { label: 'Total Credits', value: users.reduce((s, u) => s + (u.credits || 0), 0), Icon: Coins },
  ]

  // All members, most recent first.
  const members = [...users].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Admin Panel</h1>
        <span className="pill border border-danger/40 text-danger"><ShieldAlert size={11} /> ADMIN</span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-card bg-primary/10 text-primary"><s.Icon size={18} /></span>
            <div>
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Real sign-up / login breakdown by auth provider */}
      <h2 className="mb-3 font-display text-sm font-bold">Sign-ups by method</h2>
      <div className="card mb-5 space-y-4">
        {PROVIDERS.map(({ key, label, color, Icon }) => {
          const n = counts[key]
          const pct = Math.round((n / total) * 100)
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-card"
                    style={{ backgroundColor: `${color}1a`, color }}>
                    <Icon size={15} />
                  </span>
                  {label}
                </span>
                <span className="text-text-muted"><b className="text-text-primary">{n}</b> · {pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
        <p className="text-xs text-text-muted">
          Based on {users.length} loaded {users.length === 1 ? 'account' : 'accounts'}.
        </p>
      </div>

      {/* Manage members — grant credits */}
      <h2 className="mb-3 font-display text-sm font-bold">Manage members &amp; credits</h2>
      <div className="card divide-y divide-border p-0">
        {members.map((u) => <MemberRow key={u.uid} u={u} />)}
        {members.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">No members yet.</p>
        )}
      </div>
    </div>
  )
}
