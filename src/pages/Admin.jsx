import { useStore } from '../store/useStore'
import { Avatar } from '../components/ui'
import {
  ShieldAlert, Users, FileText, Mail, Coins,
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

  // Most recent members (createdAt desc when available).
  const recent = [...users]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 8)

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

      {/* Recent members with the method they used */}
      <h2 className="mb-3 font-display text-sm font-bold">Recent members</h2>
      <div className="card divide-y divide-border p-0">
        {recent.map((u) => {
          const pk = providerKey(u)
          const meta = PROVIDERS.find((p) => p.key === pk)
          const Icon = meta.Icon
          return (
            <div key={u.uid} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={u.avatar} alt={u.displayName} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.displayName}</p>
                <p className="truncate text-xs text-text-muted">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
              </div>
              <span className="pill border border-border" style={{ color: meta.color }}>
                <Icon size={12} /> {meta.label}
              </span>
            </div>
          )
        })}
        {recent.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">No members yet.</p>
        )}
      </div>
    </div>
  )
}
