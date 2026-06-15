import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchGithubProfile, fetchRepos, refreshRepos, repoStats } from '../lib/github'
import { Avatar } from './ui'
import { formatNum } from '../lib/time'
import { GithubMark, Star, X, Plus, Check, Trash2, Circle, Search, Link2, Eye } from './icons'

const toProject = (r) => ({
  repoId: r.id, name: r.name, url: r.url, description: r.description,
  stars: r.stars, forks: r.forks, language: r.language, source: 'github',
})

// Self-contained GitHub showcase manager used in Edit Profile.
// `link` = stored {platform,url,handle}; `projects` = featured list.
export default function GithubManager({ link, projects, onLink, onProjects }) {
  const handle = link?.handle
  const [profile, setProfile] = useState(null)
  const [repos, setRepos] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [manual, setManual] = useState({ name: '', url: '', description: '' })

  // Load profile + repos whenever the connected handle changes.
  useEffect(() => {
    if (!handle) { setProfile(null); setRepos([]); return }
    let alive = true
    Promise.all([fetchGithubProfile(handle).catch(() => null), fetchRepos(handle).catch(() => [])])
      .then(([p, r]) => { if (alive) { setProfile(p); setRepos(r) } })
    return () => { alive = false }
  }, [handle])

  const connect = async () => {
    const raw = input.trim().replace(/^@/, '')
    const h = raw.includes('github.com') ? (raw.split('github.com/')[1] || '').split('/')[0].trim() : raw
    if (!h) return
    setBusy(true); setErr('')
    try {
      const [p, r] = await Promise.all([fetchGithubProfile(h), fetchRepos(h)])
      setProfile(p); setRepos(r)
      onLink({ platform: 'github', url: `https://github.com/${h}`, handle: h })
      setInput('')
    } catch {
      setErr('Could not find that GitHub user (or rate-limited). Check the username.')
    } finally { setBusy(false) }
  }

  const disconnect = () => { onLink(null); setProfile(null); setRepos([]); setModal(false) }

  const isAdded = (url) => projects.some((p) => p.url === url)
  const addRepo = (r) => { if (!isAdded(r.url)) onProjects([...projects, toProject(r)]) }
  const removeRepo = (url) => onProjects(projects.filter((p) => p.url !== url))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= projects.length) return
    const next = [...projects]
    ;[next[i], next[j]] = [next[j], next[i]]
    onProjects(next)
  }
  const addManual = () => {
    if (!manual.name.trim() || !manual.url.trim() || isAdded(manual.url)) return
    onProjects([...projects, { ...manual, source: 'manual' }])
    setManual({ name: '', url: '', description: '' })
  }
  const refresh = async () => {
    if (!handle) return
    setBusy(true)
    try {
      const [p, r] = await Promise.all([fetchGithubProfile(handle), refreshRepos(handle)])
      setProfile(p); setRepos(r)
      // Sync stars/forks/desc on already-featured GitHub repos.
      onProjects(projects.map((proj) => {
        const m = r.find((x) => x.url === proj.url)
        return m ? { ...proj, stars: m.stars, forks: m.forks, language: m.language, description: m.description } : proj
      }))
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const stats = useMemo(() => repoStats(repos), [repos])
  const filtered = repos.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="rounded-card border border-border bg-bg p-3">
      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-muted">
        <GithubMark size={14} /> GitHub Integration
      </label>

      {!handle ? (
        <>
          <div className="flex gap-2">
            <input className="input text-sm" placeholder="your-github-username"
              value={input} onChange={(e) => { setInput(e.target.value); setErr('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), connect())} />
            <button type="button" onClick={connect} disabled={busy || !input.trim()} className="btn-primary shrink-0">
              <GithubMark size={14} /> {busy ? 'Connecting…' : 'Connect GitHub'}
            </button>
          </div>
          {err && <p className="mt-1.5 text-xs text-danger">{err}</p>}
        </>
      ) : (
        <>
          {/* connected card */}
          <div className="flex items-center gap-3 rounded-input border border-border p-2.5">
            <Avatar src={profile?.avatar} alt={handle} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                <Check size={13} className="text-success" /> @{handle}
              </p>
              <p className="text-xs text-text-muted">
                {formatNum(profile?.publicRepos ?? repos.length)} repos · {formatNum(stats.stars)} ★ · {formatNum(stats.forks)} forks
              </p>
            </div>
            <a href={link.url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 text-xs"><Eye size={13} /> Profile</a>
            <button type="button" onClick={disconnect} className="btn-ghost !py-1.5 text-xs text-danger">Disconnect</button>
          </div>

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setModal(true)} className="btn-primary !py-1.5 text-xs">
              <Plus size={13} /> Import Repositories
            </button>
            <button type="button" onClick={refresh} disabled={busy} className="btn-ghost !py-1.5 text-xs">
              ↻ {busy ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
        </>
      )}

      {/* featured list (reorder / remove) */}
      {projects.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-text-muted">Featured projects ({projects.length})</p>
          {projects.map((p, i) => (
            <div key={p.url} className="flex items-center gap-2 rounded-input border border-border px-2.5 py-1.5">
              <span className="flex flex-col leading-none">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-text-muted hover:text-text-primary disabled:opacity-30">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === projects.length - 1} className="text-text-muted hover:text-text-primary disabled:opacity-30">▼</button>
              </span>
              <GithubMark size={13} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              {p.stars != null && <span className="flex items-center gap-0.5 text-xs text-text-muted"><Star size={11} /> {formatNum(p.stars)}</span>}
              <button type="button" onClick={() => removeRepo(p.url)} className="text-text-muted hover:text-danger"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* manual add */}
      <div className="mt-3">
        <p className="mb-1 text-[11px] text-text-muted">Or add any project manually:</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input text-xs" placeholder="Project name" value={manual.name}
            onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <input className="input text-xs" placeholder="Link (https://…)" value={manual.url}
            onChange={(e) => setManual({ ...manual, url: e.target.value })} />
          <input className="input text-xs sm:col-span-2" placeholder="Short description (optional)" value={manual.description}
            onChange={(e) => setManual({ ...manual, description: e.target.value })} />
        </div>
        <button type="button" onClick={addManual} disabled={!manual.name.trim() || !manual.url.trim()} className="btn-ghost mt-2 text-xs">
          <Plus size={13} /> Add project
        </button>
      </div>

      {/* import modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="card relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-base font-bold"><GithubMark size={16} /> Import repositories</h3>
                <button type="button" onClick={() => setModal(false)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
              </div>
              <div className="relative mb-3">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input className="input pl-9 text-sm" placeholder="Search your repos…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
                {filtered.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No repos match.</p>}
                {filtered.map((r) => {
                  const added = isAdded(r.url)
                  return (
                    <div key={r.id} className="flex items-start gap-3 rounded-card border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          {r.name}
                          <span className="pill border border-border text-[10px] text-text-muted">{r.isPrivate ? 'private' : 'public'}</span>
                        </p>
                        {r.description && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{r.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                          {r.language && <span className="flex items-center gap-1"><Circle size={7} fill="currentColor" strokeWidth={0} className="text-primary" /> {r.language}</span>}
                          <span className="flex items-center gap-1"><Star size={11} /> {formatNum(r.stars)}</span>
                          <span>⑂ {formatNum(r.forks)}</span>
                          {r.updatedAt && <span>updated {new Date(r.updatedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => added ? removeRepo(r.url) : addRepo(r)}
                        className={`shrink-0 ${added ? 'btn-ghost text-success' : 'btn-primary'} !py-1.5 text-xs`}>
                        {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => setModal(false)} className="btn-primary text-sm">Done ({projects.length} selected)</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
