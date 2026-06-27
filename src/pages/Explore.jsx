import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, LevelBadge, StackPill, AIBadge, EmptyState } from '../components/ui'
import { Search, Handshake, Rocket, Star, Sparkles } from '../components/icons'

const FILTERS = ['All', 'Open to Collab', 'Looking for Co-founder', 'Beginner-friendly', 'Trending']

// Tally hashtags across real posts → top trending tags.
function trendingFrom(posts) {
  const counts = {}
  for (const p of posts) for (const h of p.hashtags || []) counts[h] = (counts[h] || 0) + 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, n]) => ({ tag, posts: n }))
}

export default function Explore() {
  const { following, toggleFollow, users, posts, user: me } = useStore()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [filter, setFilter] = useState('All')
  const trending = trendingFrom(posts)

  // Show everyone except yourself.
  const people = users.filter((u) => u.uid !== me?.uid)
  const devOfWeek = people[3] || people[0]

  const filtered = people.filter((u) => {
    const stack = u.techStack || []
    const needle = q.toLowerCase()
    const matchQ = !q ||
      u.username?.toLowerCase().includes(needle) ||
      u.displayName?.toLowerCase().includes(needle) ||
      u.bio?.toLowerCase().includes(needle) ||
      stack.some((s) => s.toLowerCase().includes(needle))
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
            className={`pill border transition-all ${
              filter === f
                ? 'border-primary bg-primary/15 text-primary shadow-glow-sm'
                : 'border-border text-text-muted hover:border-primary/40 hover:text-white'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Dev of the Week (PRD §3.5) */}
      {devOfWeek && (
        <div className="card mb-5 flex items-center gap-4 border-primary/30"
          style={{ background: 'rgba(252,163,17,0.06)' }}>
          <Avatar src={devOfWeek.avatar} alt="dev of week" size={56} ring />
          <div className="flex-1">
            <span className="pill border border-primary/40 text-primary"><Star size={11} /> Dev of the Week</span>
            <p className="mt-1 font-bold text-white">{devOfWeek.displayName}</p>
            <p className="text-xs text-text-muted line-clamp-2">{devOfWeek.bio}</p>
          </div>
        </div>
      )}

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
            <div key={u.uid} className="post-card">
              <div className="flex items-start gap-3">
                <Link to={`/profile/${u.username}`}>
                  <Avatar src={u.avatar} alt={u.displayName} size={48} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${u.username}`} className="font-bold text-white hover:text-primary transition-colors">{u.displayName}</Link>
                  <p className="truncate text-xs text-text-muted">@{u.username}</p>
                </div>
                <button onClick={() => toggleFollow(u.uid)}
                  className={`pill border text-xs font-bold transition-all ${
                    following[u.uid]
                      ? 'border-success/50 text-success bg-success/10'
                      : 'border-primary/50 text-primary hover:bg-primary/10'
                  }`}>
                  {following[u.uid] ? 'Following' : '+ Follow'}
                </button>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-text-muted">{u.bio}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <LevelBadge level={u.devLevel} />
                {(u.techStack || []).slice(0, 3).map((s) => <StackPill key={s} name={s} />)}
              </div>
              <div className="mt-2 flex gap-2">
                {u.openToCollab && <span className="pill border border-success/40 bg-success/8 text-success"><Handshake size={11} /> Open to Collab</span>}
                {u.lookingForCofounder && <span className="pill border border-primary/40 bg-primary/10 text-primary"><Rocket size={11} /> Co-founder</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {trending.length > 0 && (
        <div className="card mt-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white">
            <span className="h-1 w-4 rounded-full bg-primary" />
            Trending Hashtags
          </h2>
          <div className="flex flex-wrap gap-2">
            {trending.map((h) => (
              <span key={h.tag} className="pill border border-primary/30 bg-primary/8 text-primary cursor-pointer hover:bg-primary/15 transition-colors">
                {h.tag} <span className="text-primary/60 ml-1">{h.posts}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
