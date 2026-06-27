import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { Avatar, StackPill, AIBadge, LikeButton, GradientBlock, VerifiedTick, FounderBadge, FounderName } from './ui'
import { reportContent, repost, deletePost } from '../lib/db'
import { isFounder, isAdmin } from '../lib/auth'
import { clean, cleanCode } from '../lib/sanitize'
import { timeAgo } from '../lib/time'
import { TYPE_META } from './postTypes'
import { MessageCircle, Repeat2, Share2, Bookmark, MoreHorizontal, Flag, X, Trash2, Crown } from './icons'

const REPORT_REASONS = ['Spam', 'Abuse', 'Misinformation', 'NSFW']

export default function PostCard({ post }) {
  const toggleLike = useStore((s) => s.toggleLike)
  const likes = useStore((s) => s.likes)
  const saved = useStore((s) => s.saved)
  const toggleSave = useStore((s) => s.toggleSave)
  const firebaseUser = useStore((s) => s.firebaseUser)
  const me = useStore((s) => s.user)
  const users = useStore((s) => s.users)
  const following = useStore((s) => s.following)
  const toggleFollow = useStore((s) => s.toggleFollow)
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [repostOpen, setRepostOpen] = useState(false)
  const [quote, setQuote] = useState('')

  const doRepost = async () => {
    setRepostOpen(false)
    const q = quote
    setQuote('')
    try {
      await repost(post, me, q)
      toast('Reposted to your feed', { tone: 'success' })
    } catch {
      toast('Could not repost', { tone: 'warning' })
    }
  }

  const share = async () => {
    const url = `${window.location.origin}/post/${post.postId}`
    try {
      if (navigator.share) await navigator.share({ title: 'DevSocio post', url })
      else { await navigator.clipboard.writeText(url); toast('Link copied!', { tone: 'success' }) }
    } catch { /* user cancelled */ }
  }

  const meta = TYPE_META[post.type] || TYPE_META['Code Snippet']
  const TypeIcon = meta.Icon
  const liked = !!likes[post.postId]
  const isSaved = !!saved[post.postId]
  // post.likes is the server counter (already includes my like); `liked` only
  // drives the heart animation — adding it would double-count.
  const likeCount = post.likes || 0
  // Live verified status of the author (post stores only an author snapshot).
  const authorUser = users.find((u) => u.uid === (post.authorUid || post.author?.uid) || u.username === post.author?.username)
  const authorFounder = isFounder(authorUser)
  const authorUid = post.authorUid || post.author?.uid
  // The post owner — or the admin — can delete it.
  const canDelete = !!firebaseUser && (firebaseUser.uid === authorUid || isAdmin(firebaseUser))
  // Follow button beside the name (not on my own posts).
  const isMyPost = !!firebaseUser && firebaseUser.uid === authorUid
  const isFollowing = !!authorUid && !!following[authorUid]

  const onFollow = (e) => {
    e.preventDefault()
    if (!authorUid) return
    toggleFollow(authorUid)
    if (!isFollowing) toast(`Following ${post.author?.displayName || 'user'}`, { tone: 'success' })
  }

  const removePost = async () => {
    setMenuOpen(false)
    try {
      await deletePost(post.postId)
      toast('Post deleted', { tone: 'success' })
    } catch {
      toast('Could not delete post', { tone: 'warning' })
    }
  }

  const report = async (reason) => {
    setMenuOpen(false)
    try {
      await reportContent({
        targetType: 'post',
        targetId: post.postId,
        reason,
        reporterUid: firebaseUser?.uid,
        postAuthorUid: post.authorUid || post.author?.uid || null,
        excerpt: (post.content || '').slice(0, 120),
      })
      toast('Reported — thanks, our team will review it', { tone: 'success' })
    } catch {
      toast('Could not submit report', { tone: 'warning' })
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      whileHover={{ y: -2 }}
      className="post-card space-y-3"
    >
      {/* header */}
      <div className="flex items-center gap-3">
        <Link to={`/profile/${post.author?.username}`}>
          <Avatar src={post.author?.avatar} alt={post.author?.displayName} size={44} founder={authorFounder} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${post.author?.username}`}
              className="flex items-center gap-1 truncate font-semibold hover:underline"
            >
              {authorFounder
                ? <FounderName>{post.author?.displayName}</FounderName>
                : post.author?.displayName}
              {authorFounder && <Crown size={14} fill="currentColor" className="text-[#FFD66B]" />}
              {authorUser?.verified && <VerifiedTick size={14} />}
            </Link>
            {authorFounder && <FounderBadge />}
            <span className="truncate text-sm text-text-muted">@{post.author?.username}</span>
            {!isMyPost && authorUid && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={onFollow}
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all ${
                  isFollowing
                    ? 'border-border text-text-muted hover:border-danger hover:text-danger'
                    : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 shadow-glow-sm'
                }`}
              >
                {isFollowing ? 'Following' : '+ Follow'}
              </motion.button>
            )}
            <span className="text-text-muted">·</span>
            <span className="shrink-0 text-xs text-text-muted">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <span
          className="pill border"
          style={{ color: meta.tint, borderColor: `${meta.tint}40`, backgroundColor: `${meta.tint}12` }}
        >
          <TypeIcon size={12} />
          {post.type}
        </span>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)}
            className="text-text-muted hover:text-text-primary" aria-label="More">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-card border border-border bg-surface p-1.5 shadow-2xl">
                {canDelete && (
                  <>
                    <button onClick={removePost}
                      className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-sm text-danger hover:bg-danger/10">
                      <Trash2 size={14} /> Delete post
                    </button>
                    <div className="my-1 border-t border-border" />
                  </>
                )}
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-text-muted">Report post</p>
                {REPORT_REASONS.map((r) => (
                  <button key={r} onClick={() => report(r)}
                    className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-sm text-text-muted hover:bg-bg hover:text-danger">
                    <Flag size={14} /> {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* body */}
      <p className="whitespace-pre-wrap text-[15.5px] leading-relaxed text-text-secondary">
        {clean(post.content)}
      </p>

      {post.code && (
        <pre className="overflow-x-auto rounded-card border border-border p-4 font-mono text-[13px] leading-relaxed"
          style={{ background: '#0D1628', color: '#FCA311' }}>
          <code>{cleanCode(post.code)}</code>
        </pre>
      )}

      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" className="max-h-[480px] w-full rounded-card border border-border object-cover" />
      ) : post.image ? (
        <GradientBlock variant={post.image} label={post.type} />
      ) : null}

      {/* quoted (reposted) post */}
      {post.repostOf && (
        <Link to={`/post/${post.repostOf.postId}`}
          className="block rounded-card border border-border bg-bg p-3 hover:border-primary/40">
          <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
            <Repeat2 size={13} /> {post.repostOf.author?.displayName || 'a dev'}
            <span>@{post.repostOf.author?.username}</span>
          </div>
          <p className="line-clamp-3 text-sm text-text-primary">{clean(post.repostOf?.content)}</p>
          {post.repostOf.imageUrl && (
            <img src={post.repostOf.imageUrl} alt="" className="mt-2 max-h-40 w-full rounded-input object-cover" />
          )}
        </Link>
      )}

      {/* AI analysis (PRD §4) */}
      {post.aiAnalysis && (
        <div className="rounded-card border border-primary/20 p-3"
          style={{ background: 'rgba(252,163,17,0.05)' }}>
          <div className="mb-1.5 flex items-center gap-2">
            <AIBadge />
            {post.memeScore != null && (
              <span className="pill border border-primary/40 bg-primary/10 text-primary">
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
            <span key={h} className="pill bg-primary/10 text-primary border border-primary/25">{h}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 border-t border-border pt-2.5 text-sm">
        <span className="px-1">
          <LikeButton
            liked={liked}
            count={likeCount}
            onToggle={() => toggleLike(post.postId, post.authorUid || post.author?.uid)}
          />
        </span>
        <Link
          to={`/post/${post.postId}`}
          className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-surface-2 hover:text-white transition-colors"
        >
          <MessageCircle size={17} /> <span>{post.commentsCount}</span>
        </Link>
        <button
          onClick={() => setRepostOpen(true)}
          className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-surface-2 hover:text-success transition-colors"
        >
          <Repeat2 size={17} /> <span className="hidden sm:inline">Repost</span>
        </button>
        <button
          onClick={share}
          className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-text-muted hover:bg-surface-2 hover:text-primary transition-colors"
        >
          <Share2 size={17} /> <span className="hidden sm:inline">Share</span>
        </button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => toggleSave(post.postId)}
          className={`ml-auto rounded-input px-2.5 py-1.5 transition-colors ${
            isSaved ? 'text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-white'
          }`}
          aria-pressed={isSaved}
          aria-label="Save"
        >
          <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />
        </motion.button>
      </div>

      {/* Repost / quote modal */}
      {repostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setRepostOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md space-y-3 rounded-2xl border border-border p-5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #14213D, #0D1628)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-white">
                <Repeat2 size={16} className="text-primary" /> Repost
              </h3>
              <button
                onClick={() => setRepostOpen(false)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Add a comment (optional)…"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
            <div className="rounded-card border border-border p-2.5 text-xs text-text-muted"
              style={{ background: 'rgba(0,0,0,0.3)' }}>
              <span className="font-bold text-text-secondary">@{post.author?.username}</span>
              {' '}· {(post.content || '').slice(0, 100)}
            </div>
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={doRepost}
                className="btn-primary"
              >
                <Repeat2 size={15} /> Repost
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.article>
  )
}
