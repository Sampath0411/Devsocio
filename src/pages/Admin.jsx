import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, VerifiedTick } from '../components/ui'
import {
  changeCredits, setCredits, setUserFlag, subscribeReports, resolveReport, deletePost,
  subscribeErrors, resolveError, subscribeAdminDigest,
} from '../lib/db'
import { timeAgo, formatNum } from '../lib/time'
import { isFounder } from '../lib/auth'
import AdminAgentChat from '../components/AdminAgentChat'
import {
  ShieldAlert, Users, FileText, Mail, Coins, Plus, Flag, Trash2, Check,
  BadgeCheck, Shield, GithubMark, GoogleMark, AlertTriangle,
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

// One member row with credit + badge controls (admin only).
function MemberRow({ u }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [exact, setExact] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = PROVIDERS.find((p) => p.key === providerKey(u))
  const Icon = meta.Icon

  const grant = async (value) => {
    const delta = Number(value)
    if (!delta) return
    setBusy(true)
    try {
      await changeCredits(u.uid, delta)
      toast(`${delta > 0 ? '+' : ''}${delta} credits → ${u.displayName}`, { icon: Coins })
      setAmount('')
    } catch {
      toast('Could not update credits (check admin rules)', { tone: 'warning' })
    } finally { setBusy(false) }
  }

  const setExactCredits = async () => {
    if (exact === '') return
    setBusy(true)
    try {
      await setCredits(u.uid, exact)
      toast(`Set ${u.displayName}'s credits to ${formatNum(exact)}`, { icon: Coins })
      setExact('')
    } catch {
      toast('Could not set credits', { tone: 'warning' })
    } finally { setBusy(false) }
  }

  const locked = isFounder(u) // owner is permanently verified + moderator

  const toggleFlag = async (field) => {
    if (locked) {
      toast('The owner is permanently verified & moderator — cannot be changed', { tone: 'warning' })
      return
    }
    try {
      await setUserFlag(u.uid, field, !u[field])
      toast(`${field} ${!u[field] ? 'granted to' : 'removed from'} ${u.displayName}`, { tone: 'success' })
    } catch {
      toast('Could not update badge', { tone: 'warning' })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar src={u.avatar} alt={u.displayName} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-semibold">
          {u.displayName}
          {u.verified && <VerifiedTick size={14} />}
          {u.moderator && <Shield size={12} className="text-success" />}
        </p>
        <p className="truncate text-xs text-text-muted">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
      </div>

      <span className="flex items-center gap-1 text-sm font-bold text-warning" title={String(u.credits ?? 0)}>
        <Coins size={14} /> {formatNum(u.credits || 0)}
      </span>

      <span className="hidden pill border border-border sm:inline-flex" style={{ color: meta.color }}>
        <Icon size={12} /> {meta.label}
      </span>

      {/* badge toggles */}
      <div className="flex items-center gap-1">
        <button onClick={() => toggleFlag('verified')} disabled={locked}
          title={locked ? 'Owner — permanently verified' : 'Toggle verified'}
          className={`grid h-7 w-7 place-items-center rounded-input border ${u.verified ? 'border-accent text-accent' : 'border-border text-text-muted'} ${locked ? 'opacity-50' : ''}`}>
          <BadgeCheck size={14} />
        </button>
        <button onClick={() => toggleFlag('moderator')} disabled={locked}
          title={locked ? 'Owner — permanently moderator' : 'Toggle moderator'}
          className={`grid h-7 w-7 place-items-center rounded-input border ${u.moderator ? 'border-success text-success' : 'border-border text-text-muted'} ${locked ? 'opacity-50' : ''}`}>
          <Shield size={14} />
        </button>
      </div>

      {/* grant credits */}
      <div className="flex items-center gap-1">
        <button onClick={() => grant(50)} disabled={busy} className="btn-ghost !px-2 !py-1.5 text-xs">+50</button>
        <button onClick={() => grant(100)} disabled={busy} className="btn-ghost !px-2 !py-1.5 text-xs">+100</button>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="±amt"
          className="input !w-16 !py-1.5 text-xs" />
        <button onClick={() => grant(amount)} disabled={busy || !amount} className="btn-primary !px-2.5 !py-1.5 text-xs">
          <Plus size={12} /> Add
        </button>
        <input type="number" value={exact} onChange={(e) => setExact(e.target.value)} placeholder="set="
          className="input !w-16 !py-1.5 text-xs" />
        <button onClick={setExactCredits} disabled={busy || exact === ''} className="btn-ghost !px-2 !py-1.5 text-xs">Set</button>
      </div>
    </div>
  )
}

export default function Admin() {
  const { users, posts } = useStore()
  const toast = useToast()
  const [reports, setReports] = useState([])
  const [errors, setErrors] = useState([])
  const [digest, setDigest] = useState(null)

  useEffect(() => subscribeReports(setReports), [])
  useEffect(() => subscribeErrors(setErrors), [])
  useEffect(() => subscribeAdminDigest(setDigest), [])

  const openReports = reports.filter((r) => r.status === 'pending')
  const openErrors = errors.filter((e) => (e.status || 'open') === 'open')

  const fixError = async (e) => {
    try {
      await resolveError(e.id)
      toast('Error marked resolved', { tone: 'success' })
    } catch {
      toast('Could not update error', { tone: 'warning' })
    }
  }

  const removePost = async (r) => {
    try {
      if (r.targetType === 'post' && r.targetId) await deletePost(r.targetId)
      await resolveReport(r.id, 'removed')
      toast('Post removed', { tone: 'success' })
    } catch {
      toast('Could not remove (check admin rules)', { tone: 'warning' })
    }
  }
  const dismissReport = async (r) => {
    try {
      await resolveReport(r.id, 'reviewed')
      toast('Marked reviewed', { tone: 'success' })
    } catch {
      toast('Could not update report', { tone: 'warning' })
    }
  }

  // Real login analytics: how many accounts signed in with each method.
  const counts = users.reduce(
    (acc, u) => { acc[providerKey(u)] += 1; return acc },
    { google: 0, github: 0, email: 0 },
  )
  const total = users.length || 1

  const stats = [
    { label: 'Total Users', value: users.length, Icon: Users },
    { label: 'Total Posts', value: posts.length, Icon: FileText },
    { label: 'Open Reports', value: openReports.length, Icon: Flag },
    { label: 'Open Errors', value: openErrors.length, Icon: AlertTriangle },
  ]

  // All members, most recent first.
  const members = [...users].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Admin Panel</h1>
        <span className="pill border border-danger/40 text-danger"><ShieldAlert size={11} /> ADMIN</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Admin Copilot — AI assistant that reads the site and proposes actions */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-sm font-bold">Admin Copilot</h2>
        {digest && (
          <span className={`pill border text-xs ${
            digest.health === 'all clear' ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
            Last scan: {digest.health || '—'}
            {typeof digest.openErrors === 'number' ? ` · ${digest.openErrors} errors` : ''}
            {typeof digest.pendingReports === 'number' ? ` · ${digest.pendingReports} reports` : ''}
          </span>
        )}
      </div>
      <div className="mb-5">
        <AdminAgentChat />
      </div>

      {/* Captured frontend errors */}
      <h2 className="mb-3 font-display text-sm font-bold">Errors &amp; crashes</h2>
      <div className="card mb-5 divide-y divide-border p-0">
        {errors.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">No errors logged — all healthy.</p>
        )}
        {errors.slice(0, 30).map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{e.message || 'Unknown error'}</p>
              <p className="truncate text-xs text-text-muted">
                {e.source}{e.url ? ` · ${e.url}` : ''}{e.createdAt ? ` · ${timeAgo(e.createdAt)}` : ''}
              </p>
            </div>
            <span className={`pill border ${
              (e.status || 'open') === 'open' ? 'border-warning/40 text-warning' : 'border-success/40 text-success'}`}>
              {e.status || 'open'}
            </span>
            {(e.status || 'open') === 'open' && (
              <button onClick={() => fixError(e)} className="btn-ghost !py-1.5 text-xs">
                <Check size={13} /> Resolve
              </button>
            )}
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

      {/* Reported content (PRD §7.4) */}
      <h2 className="mb-3 font-display text-sm font-bold">Reported content</h2>
      <div className="card mb-5 divide-y divide-border p-0">
        {reports.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">No reports — all clear.</p>
        )}
        {reports.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
              <Flag size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold capitalize">{r.targetType}</span> reported for{' '}
                <span className="text-danger">{r.reason}</span>
                {r.createdAt && <span className="text-xs text-text-muted"> · {timeAgo(r.createdAt)}</span>}
              </p>
              {r.excerpt && <p className="truncate text-xs text-text-muted">“{r.excerpt}”</p>}
            </div>
            <span className={`pill border ${
              r.status === 'pending' ? 'border-warning/40 text-warning'
                : r.status === 'removed' ? 'border-danger/40 text-danger'
                : 'border-success/40 text-success'}`}>
              {r.status}
            </span>
            {r.status === 'pending' && (
              <div className="flex gap-1">
                <button onClick={() => dismissReport(r)} className="btn-ghost !py-1.5 text-xs">
                  <Check size={13} /> Reviewed
                </button>
                <button onClick={() => removePost(r)} className="btn-ghost !py-1.5 text-xs text-danger">
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            )}
          </div>
        ))}
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
