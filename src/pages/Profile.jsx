import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import PostCard from '../components/PostCard'
import { Avatar, LevelBadge, StackPill, EmptyState } from '../components/ui'
import { fetchProfileByUsername, requestCollab } from '../lib/db'
import {
  Handshake, Rocket, Coins, Bookmark, PenSquare,
  GithubMark, Link2, Settings, MessageCircle,
} from '../components/icons'

const TABS = ['Posts', 'Projects', 'Ideas', 'Saved']

export default function Profile() {
  const { username } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const { user: me, posts, users, following, toggleFollow, saved } = useStore()

  const sendCollab = async (p) => {
    try {
      await requestCollab(me, p)
      toast(`Collab request sent to ${p.displayName}`, { tone: 'success', icon: Handshake })
      navigate(`/messages/${p.uid}`)
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

  if (!profile) {
    return <div className="py-10 text-center text-text-muted">Profile not found.</div>
  }

  const isMe = me && profile.username === me.username
  const isFollowing = following[profile.uid]
  const userPosts = posts.filter((p) => p.author?.username === profile.username)
  const savedPosts = posts.filter((p) => saved[p.postId])
  const links = profile.links || {}

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className="h-36 w-full rounded-card bg-cover bg-center"
        style={profile.coverUrl
          ? { backgroundImage: `url(${profile.coverUrl})` }
          : { background: 'linear-gradient(120deg,#6C63FF,#00E5FF,#16161E)' }}
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
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{profile.displayName}</h1>
            <LevelBadge level={profile.devLevel} />
          </div>
          <p className="text-sm text-text-muted">@{profile.username}</p>
          <p className="mt-2 text-sm">{profile.bio}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.techStack?.map((s) => <StackPill key={s} name={s} />)}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {profile.openToCollab && <span className="pill border border-success/40 text-success"><Handshake size={11} /> Open to Collab</span>}
            {profile.lookingForCofounder && <span className="pill border border-warning/40 text-warning"><Rocket size={11} /> Looking for Co-founder</span>}
          </div>

          {Object.keys(links).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-accent">
              {links.github && <span className="flex items-center gap-1"><GithubMark size={14} /> github</span>}
              {links.portfolio && <span className="flex items-center gap-1"><Link2 size={14} /> {links.portfolio}</span>}
            </div>
          )}

          <div className="mt-4 flex gap-6 text-sm">
            <Stat label="Posts" value={profile.postsCount ?? userPosts.length} />
            <Stat label="Followers" value={profile.followersCount ?? 0} />
            <Stat label="Following" value={profile.followingCount ?? 0} />
            {isMe && (
              <span className="flex items-center gap-1.5">
                <Coins size={16} className="text-warning" />
                <span className="text-lg font-bold text-warning">{profile.credits}</span>
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
          {tab === 'Saved' && (savedPosts.length ? savedPosts.map((p) => <PostCard key={p.postId} post={p} />)
            : <EmptyState icon={Bookmark} title="Nothing saved yet — save posts to find them here" />)}

          {tab === 'Posts' && (userPosts.length ? userPosts.map((p) => <PostCard key={p.postId} post={p} />)
            : <EmptyState icon={PenSquare} title="No posts yet — share your first build!" />)}

          {(tab === 'Projects' || tab === 'Ideas') && (
            <EmptyState icon={PenSquare} title={`No ${tab.toLowerCase()} yet`} />
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <span className="text-lg font-bold">{value}</span> <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}
