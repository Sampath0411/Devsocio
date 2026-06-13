import { useStore } from '../store/useStore'
import { Avatar } from '../components/ui'
import { ShieldAlert, Flag, Eye, Trash2, Users, FileText } from '../components/icons'

export default function Admin() {
  const { users, posts } = useStore()

  // Live moderation queue would come from a `reports` collection; until that's
  // populated we surface the most recent users as illustrative report rows.
  const sample = users.slice(0, 3)
  const REPORTS = [
    { id: 'rp1', target: 'post', reason: 'Spam', reporter: sample[0], status: 'pending' },
    { id: 'rp2', target: 'comment', reason: 'Abuse', reporter: sample[1], status: 'pending' },
    { id: 'rp3', target: 'profile', reason: 'Misinformation', reporter: sample[2], status: 'reviewed' },
  ].filter((r) => r.reporter)

  const STATS = [
    { label: 'Total Users', value: String(users.length), Icon: Users },
    { label: 'Total Posts', value: String(posts.length), Icon: FileText },
    { label: 'Open Reports', value: String(REPORTS.filter((r) => r.status === 'pending').length), Icon: Flag },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Admin Panel</h1>
        <span className="pill border border-danger/40 text-danger"><ShieldAlert size={11} /> ADMIN</span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-card bg-primary/10 text-primary"><s.Icon size={18} /></span>
            <div>
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-display text-sm font-bold">Reported Content</h2>
      <div className="card divide-y divide-border p-0">
        {REPORTS.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar src={r.reporter.avatar} alt={r.reporter.displayName} size={32} />
            <div className="flex-1">
              <p className="text-sm"><span className="font-semibold capitalize">{r.target}</span> reported for <span className="text-danger">{r.reason}</span></p>
              <p className="text-xs text-text-muted">by @{r.reporter.username}</p>
            </div>
            <span className={`pill border ${r.status === 'pending' ? 'border-warning/40 text-warning' : 'border-success/40 text-success'}`}>{r.status}</span>
            <button className="btn-ghost !py-1.5 text-xs"><Eye size={13} /> Review</button>
            <button className="btn-ghost !py-1.5 text-xs text-danger"><Trash2 size={13} /> Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
