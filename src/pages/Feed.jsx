import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import Stories from '../components/Stories'
import { PostSkeleton, BouncingDots, EmptyState } from '../components/ui'
import { Plus, Rocket, PenSquare } from '../components/icons'
import { sortFeed } from '../lib/feed'

export default function Feed() {
  const rawPosts = useStore((s) => s.posts)
  const firebaseUser = useStore((s) => s.firebaseUser)
  const following = useStore((s) => s.following)
  const me = useStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)

  // Client-side scoring: follows-first, stack match, recency, trending.
  const posts = sortFeed(rawPosts, firebaseUser?.uid, following, me?.techStack || [])

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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Your Feed</h1>
          <p className="text-xs text-text-muted mt-0.5">Powered by your follows &amp; stack</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary !py-2.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} /> Create
        </motion.button>
      </div>

      <div className="rounded-2xl border border-border mb-5 overflow-hidden"
        style={{ background: 'rgba(20,33,61,0.5)' }}>
        <Stories />
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
            You're all caught up! <Rocket size={14} />
          </p>
        </div>
      )}

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
