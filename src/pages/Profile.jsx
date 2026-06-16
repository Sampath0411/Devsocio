import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import PostCard from '../components/PostCard'
import { Avatar, LevelBadge, StackPill, EmptyState, SocialLinks, VerifiedTick, ModBadge } from '../components/ui'
import { fetchProfileByUsername, requestCollab, isOnline, subscribeIdeas, investInIdea } from '../lib/db'
import { fetchRepos } from '../lib/github'
import { achievementsFor } from '../lib/achievements'
import { IdeaCard } from './Ideas'
import { formatNum } from '../lib/time'
import {
  Handshake, Rocket, Coins, Bookmark, PenSquare,
  Settings, MessageCircle, Circle, Star, GithubMark, Crown,
} from '../components/icons'

// TABS is computed per-profile — Saved only shows on your own profile.

export default function Profile() {
  const { username } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const { user: me, posts, users, following, toggleFollow, saved, spendCredits } = useStore()

  const [ideas, setIdeas] = useState([])

  useEffect(() => {
    return subscribeIdeas(setIdeas)
  }, [])

  const sendCollab = async (p) => {
    try {
      await requestCollab(me, p)
      toast(`Collab request sent to ${p.displayName}`, { tone: 'success', icon: Handshake })
      navigate(`/messages/${p.uid}`)
    } catch {
      toast('Could not send collab request', { tone: 'warning' })
    }
  }

  const invest = async (idea) => {
    if (!(await spendCredits(50))) {
      toast('Not enough credits to invest', { tone: 'warning' })
      return
    }
    try {
      await investInIdea(idea.ideaId, 50)
    } catch {
      /* optimistic */
    }
    toast(`Invested 50 credits in "${idea.title}"`, { icon: Coins })
  }

  const collabIdea = async (idea) => {
    if (!idea.author?.uid || idea.author.uid === me?.uid) return
    try {
      await requestCollab(me, idea.author, idea.title)
      toast(`Collab request sent for "${idea.title}"`, { tone: 'success', icon: Handshake })
      navigate(`/messages/${idea.author.uid}`)
    } catch {
      toast('Could not send collab request', { tone: 'warning' })
    }
  }

  // Resolve from: my own profile → loaded directory → one-shot Firestore fetch.
  const [fetched, setFetched] = useState(null)
  const profile =
    (me?.username === username ? me : null) ||
    users.find((u) => u.username === username) ||
    fetched ||
    me

  useEffect(() => {
    let alive = true
    if (me?.username !== username && !users.find((u) => u.username === username)) {
      fetchProfileByUsername(username).then((p) => alive && p && setFetched(p)).catch(() => {})
    }
    return () => { alive = false }
  }, [username, users, me])

  const [tab, setTab] = useState('Posts')
  const [repos, setRepos] = useState([])
  const [repoErr, setRepoErr] = useState(false)
  const [reposLoading, setReposLoading] = useState(false)
  const ghHandle = profile?.links?.github?.handle

  // Computed tab list: Saved only visible on own profile.
  const isMe = me && profile?.username === me.username
  const TABS = isMe
    ? ['Posts', 'Projects', 'Ideas', 'Saved']
    : ['Posts', 'Projects', 'Ideas']

  // If the user navigates from their own profile (where Saved tab is active) to
  // someone else's profile, reset to Posts so the Saved tab doesn't linger.
  useEffect(() => {
    if (!isMe && tab === 'Saved') setTab('Posts')
  }, [isMe, tab])

  // Pull the developer's real GitHub repos when the Projects tab opens.
  useEffect(() => {
    setRepos([]); setRepoErr(false)
    if (tab === 'Projects' && ghHandle) {
      setReposLoading(true)
      fetchRepos(ghHandle)
        .then(setRepos)
        .catch(() => setRepoErr(true))
        .finally(() => setReposLoading(false))
    }
  }, [tab, ghHandle])

  if (!profile) {
    return <div className="py-10 text-center text-text-muted">Profile not found.</div>
  }

  const isFollowing = following[profile.uid]
  const userPosts = posts.filter((p) => p.author?.username === profile.username)
  const savedPosts = posts.filter((p) => saved[p.postId])
  const userIdeas = ideas.filter((i) => i.authorUid === profile.uid || i.author?.username === profile.username)
  const links = profile.links || {}

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className="h-36 w-full rounded-card bg-cover bg-center"
        style={profile.coverUrl
          ? { backgroundImage: `url(${profile.coverUrl})` }
          : { background: profile.banner || 'linear-gradient(120deg,#6C63FF,#00E5FF,#16161E)' }}
      />

      <div className="-mt-10 px-2">
        <div className="flex items-end justify-between">
          <span className="rounded-full border-4 border-bg">
            <Avatar src={profile.avatar} alt={profile.displayName} size={88} />
          </span>
          <div className="flex gap-2">
            {isMe ? (
              <Link to="/profile/edit" className="btn-ghost"><Settings size={15} /> Edit Profile</Link>
            ) : (
              <>
                <Link to={`/messages/${profile.uid}`} className="btn-ghost"><MessageCircle size={15} /> Message</Link>
                <button onClick={() => sendCollab(profile)} className="btn-ghost"><Handshake size={15} /> Collab</button>
                <button
                  onClick={() => {
                    toggleFollow(profile.uid)
                    if (!isFollowing) toast(`Following ${profile.displayName}`, { tone: 'success' })
                  }}
                  className={isFollowing ? 'btn-ghost' : 'btn-primary'}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold">
              {profile.displayName}
              {profile.verified && <VerifiedTick size={20} />}
              {profile.topDev && <Crown size={18} className="text-warning" />}
            </h1>
            <LevelBadge level={profile.devLevel} />
            {profile.moderator && <ModBadge />}
          </div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            @{profile.username}
            {isOnline(profile) && (
              <span className="flex items-center gap-1 text-success">
                <Circle size={7} fill="currentColor" strokeWidth={0} /> online
              </span>
            )}
          </p>
          <p className="mt-2 text-sm">{profile.bio}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.techStack?.map((s) => <StackPill key={s} name={s} />)}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {profile.openToCollab && <span className="pill border border-success/40 text-success"><Handshake size={11} /> Open to Collab</span>}
            {profile.lookingForCofounder && <span className="pill border border-warning/40 text-warning"><Rocket size={11} /> Looking for Co-founder</span>}
          </div>

          <SocialLinks links={links} />

          {(() => {
            const badges = achievementsFor(profile, userPosts.length)
            return badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b.id} className="pill border border-border text-text-muted" title={b.label}>
                    <span>{b.emoji}</span> {b.label}
                  </span>
                ))}
              </div>
            )
          })()}

          <div className="mt-4 flex gap-6 text-sm">
            <Stat label="Posts" value={Math.max(0, profile.postsCount ?? userPosts.length)} />
            <Stat label="Followers" value={Math.max(0, profile.followersCount ?? 0)} />
            <Stat label="Following" value={isMe ? Object.keys(following).length : Math.max(0, profile.followingCount ?? 0)} />
            {isMe && (
              <span className="flex items-center gap-1.5">
                <Coins size={16} className="text-warning" />
                <span className="text-lg font-bold text-warning" title={String(profile.credits ?? 0)}>{formatNum(profile.credits)}</span>
                <span className="text-xs text-text-muted">credits</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="relative px-4 py-2.5 text-sm font-medium">
              <span className={tab === t ? 'text-text-primary' : 'text-text-muted'}>{t}</span>
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {tab === 'Saved' && isMe && (savedPosts.length ? savedPosts.map((p) => <PostCard key={p.postId} post={p} />)
            : <EmptyState icon={Bookmark} title="Nothing saved yet — save posts to find them here" />)}

          {tab === 'Posts' && (userPosts.length ? userPosts.map((p) => <PostCard key={p.postId} post={p} />)
            : <EmptyState icon={PenSquare} title="No posts yet — share your first build!" />)}

          {tab === 'Projects' && (() => {
            const curated = profile.projects || []
            // Show curated projects if any; else auto-import all GitHub repos.
            const list = curated.length ? curated : repos
            if (curated.length === 0 && !ghHandle) {
              return <EmptyState icon={GithubMark} title={isMe
                ? 'Add projects or connect GitHub in Edit Profile.'
                : 'No projects yet.'} />
            }
            if (curated.length === 0 && repoErr) {
              return <EmptyState icon={GithubMark} title="Couldn't load GitHub repos (rate limit or private account)." />
            }
            if (curated.length === 0 && reposLoading) {
              return <p className="py-8 text-center text-sm text-text-muted">Loading repos from @{ghHandle}…</p>
            }
            if (list.length === 0) {
              return <EmptyState icon={GithubMark} title={isMe ? 'Add your projects in Edit Profile.' : 'No projects yet.'} />
            }
            const totalStars = list.reduce((s, r) => s + (r.stars || 0), 0)
            const totalForks = list.reduce((s, r) => s + (r.forks || 0), 0)
            return (
              <div className="space-y-3">
                {/* GitHub badge + stats + View profile */}
                {ghHandle && (
                  <div className="card flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-center gap-1.5 font-semibold"><GithubMark size={16} /> @{ghHandle}</span>
                    <span className="text-xs text-text-muted">{formatNum(list.length)} projects</span>
                    <span className="flex items-center gap-1 text-xs text-text-muted"><Star size={12} /> {formatNum(totalStars)} stars</span>
                    <span className="text-xs text-text-muted">⑂ {formatNum(totalForks)} forks</span>
                    <a href={`https://github.com/${ghHandle}`} target="_blank" rel="noreferrer" className="btn-ghost ml-auto !py-1.5 text-xs">
                      <GithubMark size={13} /> View GitHub Profile
                    </a>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((r) => (
                    <a key={r.url || r.id} href={r.url} target="_blank" rel="noreferrer"
                      className="card transition-colors hover:border-primary/50">
                      <div className="flex items-center gap-2">
                        <GithubMark size={15} />
                        <span className="truncate font-semibold text-accent">{r.name}</span>
                      </div>
                      {r.description && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{r.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        {r.language && <span className="flex items-center gap-1"><Circle size={8} fill="currentColor" strokeWidth={0} className="text-primary" /> {r.language}</span>}
                        {r.stars != null && <span className="flex items-center gap-1"><Star size={12} /> {formatNum(r.stars)}</span>}
                        {r.forks != null && <span>⑂ {formatNum(r.forks)}</span>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}

          {tab === 'Ideas' && (userIdeas.length ? (
            <div className="space-y-4">
              {userIdeas.map((idea) => (
                <IdeaCard key={idea.ideaId} idea={idea} onInvest={() => invest(idea)} onCollab={() => collabIdea(idea)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={PenSquare} title="No ideas yet" />
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <span className="text-lg font-bold">{formatNum(value)}</span> <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}
