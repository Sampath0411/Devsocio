import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, LevelBadge, StackPill, AIBadge, EmptyState } from '../components/ui'
import { USERS, TRENDING_HASHTAGS } from '../data/mock'
import { Search, Handshake, Rocket, Star, Sparkles } from '../components/icons'

const FILTERS = ['All', 'Open to Collab', 'Looking for Co-founder', 'Beginner-friendly', 'Trending']

export default function Explore() {
  const { following, toggleFollow } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = USERS.filter((u) => {
    const matchQ = !q ||
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.displayName.toLowerCase().includes(q.toLowerCase()) ||
      u.techStack.some((s) => s.toLowerCase().includes(q.toLowerCase()))
    const matchF = filter === 'All' ||
      (filter === 'Open to Collab' && u.openToCollab) ||
      (filter === 'Looking for Co-founder' && u.lookingForCofounder) ||
      (filter === 'Beginner-friendly' && u.devLevel === 'Beginner') ||
      filter === 'Trending'
    return matchQ && matchF
  })

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-4 font-display text-xl font-bold">Explore</h1>

      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="input pl-9" placeholder="Search by username, tech stack, or hashtag…"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`pill border ${filter === f ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-text-muted hover:border-primary/40'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Dev of the Week (PRD §3.5) */}
      <div className="card mb-5 flex items-center gap-4 border-warning/40 bg-warning/[0.06]">
        <Avatar src={USERS[3].avatar} alt="dev of week" size={56} ring />
        <div className="flex-1">
          <p className="pill border border-warning/40 text-warning"><Star size={11} /> Dev of the Week</p>
          <p className="mt-1 font-semibold">{USERS[3].displayName}</p>
          <p className="text-xs text-text-muted">{USERS[3].bio}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-bold">Suggested Devs</h2>
        <AIBadge>AI matched to your stack</AIBadge>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No devs found — try a different stack or keyword"
          cta="Clear Filters" onCta={() => { setQ(''); setFilter('All') }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((u) => (
            <div key={u.uid} className="card">
              <div className="flex items-start gap-3">
                <Link to={`/profile/${u.username}`}>
                  <Avatar src={u.avatar} alt={u.displayName} size={48} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${u.username}`} className="font-semibold hover:underline">{u.displayName}</Link>
                  <p className="truncate text-xs text-text-muted">@{u.username}</p>
                </div>
                <button onClick={() => toggleFollow(u.uid)}
                  className={`pill border ${following[u.uid] ? 'border-success/50 text-success'
                    : 'border-primary/50 text-primary hover:bg-primary/10'}`}>
                  {following[u.uid] ? 'Following' : 'Follow'}
                </button>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-text-muted">{u.bio}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <LevelBadge level={u.devLevel} />
                {u.techStack.slice(0, 3).map((s) => <StackPill key={s} name={s} />)}
              </div>
              <div className="mt-2 flex gap-2">
                {u.openToCollab && <span className="pill border border-success/40 text-success"><Handshake size={11} /> Open to Collab</span>}
                {u.lookingForCofounder && <span className="pill border border-warning/40 text-warning"><Rocket size={11} /> Co-founder</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-5">
        <h2 className="mb-3 font-display text-sm font-bold">Trending Hashtags</h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING_HASHTAGS.map((h) => (
            <span key={h.tag} className="pill border border-border text-accent">
              {h.tag} <span className="text-text-muted">{h.posts}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
