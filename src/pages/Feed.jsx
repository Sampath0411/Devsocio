import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { PostSkeleton, BouncingDots, Avatar, EmptyState } from '../components/ui'
import { Plus, Rocket, PenSquare } from '../components/icons'

// Dev-specific story reactions (PRD §3.4) — now icon-based, not emoji.
import { Rocket as RocketR, Skull, Flame, Brain, Zap, Check } from '../components/icons'
const STORY_REACTIONS = [RocketR, Skull, Flame, Brain, Zap, Check]

function StoriesBar() {
  const user = useStore((s) => s.user)
  const users = useStore((s) => s.users)
  const others = users.filter((u) => u.uid !== user?.uid).slice(0, 12)
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <button className="flex w-16 shrink-0 flex-col items-center gap-1">
        <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary/60">
          <Avatar src={user?.avatar} alt="you" size={56} />
          <span className="absolute -bottom-0 -right-0 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
            <Plus size={12} />
          </span>
        </span>
        <span className="truncate text-[11px] text-text-muted">Your story</span>
      </button>
      {others.map((u) => (
        <button key={u.uid} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
            <span className="block rounded-full border-2 border-bg">
              <Avatar src={u.avatar} alt={u.displayName} size={56} />
            </span>
          </span>
          <span className="truncate text-[11px] text-text-muted">{u.displayName}</span>
        </button>
      ))}
    </div>
  )
}

export default function Feed() {
  const posts = useStore((s) => s.posts)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (params.get('create')) {
      setCreateOpen(true)
      params.delete('create')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  return (
    <div className="mx-auto w-full max-w-feed">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Your Feed</h1>
        <button className="btn-primary !py-2" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="card mb-4">
        <StoriesBar />
        <div className="mt-3 flex justify-center gap-3 text-text-muted">
          {STORY_REACTIONS.map((R, i) => (
            <button key={i} className="transition-colors hover:text-primary" aria-label="React">
              <R size={18} />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <PostSkeleton /><PostSkeleton /><PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={PenSquare}
          title="No posts yet — be the first to share something with the community."
          cta="Create a post"
          onCta={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.postId} post={p} />)}
          <BouncingDots />
          <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-sm text-text-muted">
            You’re all caught up! <Rocket size={14} />
          </p>
        </div>
      )}

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
