import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, StackPill, AIBadge, LikeButton, GradientBlock } from './ui'
import { TYPE_META } from './postTypes'
import { MessageCircle, Repeat2, Share2, Bookmark, MoreHorizontal } from './icons'

export default function PostCard({ post }) {
  const toggleLike = useStore((s) => s.toggleLike)
  const likes = useStore((s) => s.likes)
  const saved = useStore((s) => s.saved)
  const toggleSave = useStore((s) => s.toggleSave)

  const meta = TYPE_META[post.type] || TYPE_META['Code Snippet']
  const TypeIcon = meta.Icon
  const liked = !!likes[post.postId]
  const isSaved = !!saved[post.postId]
  const likeCount = (post.likes || 0) + (liked ? 1 : 0)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="card space-y-3"
    >
      {/* header */}
      <div className="flex items-center gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatar} alt={post.author.displayName} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${post.author.username}`}
              className="truncate font-semibold hover:underline"
            >
              {post.author.displayName}
            </Link>
            <span className="truncate text-sm text-text-muted">@{post.author.username}</span>
            <span className="text-text-muted">·</span>
            <span className="shrink-0 text-xs text-text-muted">{post.createdAt}</span>
          </div>
        </div>
        <span
          className="pill border"
          style={{ color: meta.tint, borderColor: `${meta.tint}40`, backgroundColor: `${meta.tint}12` }}
        >
          <TypeIcon size={12} />
          {post.type}
        </span>
        <button className="text-text-muted hover:text-text-primary" aria-label="More">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* body */}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
        {post.content}
      </p>

      {post.code && (
        <pre className="overflow-x-auto rounded-card border border-border bg-bg p-4 font-mono text-[13px] leading-relaxed text-accent">
          <code>{post.code}</code>
        </pre>
      )}

      {post.image && <GradientBlock variant={post.image} label={post.type} />}

      {/* AI analysis (PRD §4) */}
      {post.aiAnalysis && (
        <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <AIBadge />
            {post.memeScore != null && (
              <span className="pill border border-warning/40 bg-warning/10 text-warning">
                Humor {post.memeScore}/10
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">{post.aiAnalysis}</p>
        </div>
      )}

      {/* tags */}
      {((post.tags?.length || 0) + (post.hashtags?.length || 0)) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags?.map((t) => <StackPill key={t} name={t} />)}
          {post.hashtags?.map((h) => (
            <span key={h} className="pill text-accent">{h}</span>
          ))}
        </div>
      )}

      {/* actions (PRD §3.3.2) */}
      <div className="flex items-center gap-1 border-t border-border pt-2 text-sm">
        <span className="px-1">
          <LikeButton
            liked={liked}
            count={likeCount}
            onToggle={() => toggleLike(post.postId, post.authorUid || post.author?.uid)}
          />
        </span>
        <Link
          to={`/post/${post.postId}`}
          className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-bg hover:text-text-primary"
        >
          <MessageCircle size={18} /> <span>{post.commentsCount}</span>
        </Link>
        <button className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-bg hover:text-success">
          <Repeat2 size={18} /> <span className="hidden sm:inline">Repost</span>
        </button>
        <button className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-bg hover:text-accent">
          <Share2 size={17} /> <span className="hidden sm:inline">Share</span>
        </button>
        <button
          onClick={() => toggleSave(post.postId)}
          className={`ml-auto rounded-input px-2.5 py-1.5 transition-colors ${
            isSaved ? 'text-accent' : 'text-text-muted hover:bg-bg hover:text-text-primary'
          }`}
          aria-pressed={isSaved}
          aria-label="Save"
        >
          <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.article>
  )
}
