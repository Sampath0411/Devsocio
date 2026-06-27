import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PostCard from '../components/PostCard'
import { Avatar } from '../components/ui'
import { subscribeComments, addComment, setCommentLike, subscribeMyCommentLikes, pushNotification, parseMentions } from '../lib/db'
import { clean } from '../lib/sanitize'
import { ChevronLeft, Heart, Send } from '../components/icons'

// Renders comment text with @mention highlighting.
// Matched usernames link to their profile; unmatched @handles are styled in accent.
function CommentText({ text, users }) {
  if (!text) return null
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const handle = part.slice(1).toLowerCase()
          const found = users.find((u) => u.username?.toLowerCase() === handle)
          return found
            ? <Link key={i} to={`/profile/${found.username}`} className="font-semibold text-primary hover:underline">{part}</Link>
            : <span key={i} className="text-accent">{part}</span>
        }
        return <span key={i}>{clean(part)}</span>
      })}
    </span>
  )
}

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { posts, user, firebaseUser, users } = useStore()
  const post = posts.find((p) => p.postId === id)

  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null) // parent comment id
  const [likedC, setLikedC] = useState({})     // commentId -> bool (optimistic)

  // Live comments for this post (PRD §3.8).
  useEffect(() => {
    if (!id) return
    return subscribeComments(id, setComments)
  }, [id])

  // Seed which comments I've liked from the server (heart fill survives reload
  // and prevents double-liking).
  useEffect(() => {
    if (!id || !firebaseUser) return
    return subscribeMyCommentLikes(id, firebaseUser.uid, setLikedC)
  }, [id, firebaseUser])

  const authorObj = {
    uid: user?.uid, username: user?.username, displayName: user?.displayName, avatar: user?.avatar,
  }

  const add = async (parentId = null) => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setReplyTo(null)
    try {
      await addComment(id, { text, author: authorObj, authorUid: user?.uid, parentId })
      const targetUid = post?.authorUid || post?.author?.uid
      if (targetUid && targetUid !== user?.uid) {
        pushNotification(targetUid, {
          type: 'comment', actorUid: user?.uid, actor: authorObj,
          text: `commented: "${text.slice(0, 40)}"`, postId: id,
        })
      }
      // Send mention notifications to any @mentioned users
      const mentions = parseMentions(text)
      const byUsername = Object.fromEntries((users || []).map((u) => [u.username?.toLowerCase(), u]))
      for (const handle of mentions) {
        const mentioned = byUsername[handle]
        if (mentioned && mentioned.uid !== user?.uid) {
          pushNotification(mentioned.uid, {
            type: 'mention',
            actorUid: user?.uid,
            actor: authorObj,
            text: `mentioned you in a comment: "${text.slice(0, 40)}"`,
            postId: id,
          })
        }
      }
    } catch {
      setComments((c) => [...c, { id: 'local_' + c.length, author: user, text, parentId }])
    }
  }

  const toggleCommentLike = (c) => {
    if (!firebaseUser) return
    const next = !likedC[c.id]
    setLikedC((s) => ({ ...s, [c.id]: next }))
    setCommentLike(id, c.id, firebaseUser.uid, next).catch(() => {})
  }

  const topLevel = comments.filter((c) => !c.parentId)
  const repliesOf = (cid) => comments.filter((c) => c.parentId === cid)

  if (!post) {
    return (
      <div className="mx-auto max-w-feed py-10 text-center text-text-muted">
        Post not found. <Link to="/feed" className="text-primary">Back to feed</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-feed">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ChevronLeft size={16} /> Back
      </button>

      <PostCard post={post} />

      <div className="card mt-4">
        <h2 className="mb-3 font-display text-sm font-bold">Comments · {comments.length}</h2>

        <div className="mb-4 flex gap-2">
          <Avatar src={user?.avatar} alt="you" size={36} />
          <input className="input" placeholder={replyTo ? 'Write a reply…' : 'Add a comment… @mention supported'}
            value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(replyTo)} />
          <button onClick={() => add(replyTo)} className="btn-primary shrink-0"><Send size={15} /> {replyTo ? 'Reply' : 'Post'}</button>
        </div>
        {replyTo && (
          <p className="mb-3 text-xs text-text-muted">Replying… <button onClick={() => setReplyTo(null)} className="text-primary">cancel</button></p>
        )}

        <div className="space-y-4">
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentRow c={c} liked={!!likedC[c.id]} onLike={() => toggleCommentLike(c)} onReply={() => setReplyTo(c.id)} users={users} />
              {repliesOf(c.id).length > 0 && (
                <div className="ml-10 mt-3 space-y-3 border-l border-border pl-3">
                  {repliesOf(c.id).map((r) => (
                    <CommentRow key={r.id} c={r} liked={!!likedC[r.id]} onLike={() => toggleCommentLike(r)} onReply={() => setReplyTo(c.id)} small users={users} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommentRow({ c, liked, onLike, onReply, small, users }) {
  // likesCount is the server truth (includes my like); `liked` only drives the
  // heart fill, so don't add it to the count or it double-counts.
  const count = c.likesCount || 0
  return (
    <div className="flex gap-3">
      <Avatar src={c.author?.avatar} alt={c.author?.displayName} size={small ? 30 : 36} />
      <div className="min-w-0">
        <p className="text-sm">
          <Link to={`/profile/${c.author?.username}`} className="font-semibold hover:underline">{c.author?.displayName || 'You'}</Link>{' '}
          <span className="text-xs text-text-muted">@{c.author?.username}</span>
        </p>
        <p className="text-sm text-text-primary">
          <CommentText text={c.text} users={users || []} />
        </p>
        <div className="mt-1 flex gap-3 text-xs text-text-muted">
      <button
        onClick={onLike}
        className={`flex items-center gap-1 transition-colors ${
          liked ? 'text-primary' : 'hover:text-primary'
        }`}
      >
        <Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {count > 0 ? count : 'Like'}
      </button>
          {!small && <button onClick={onReply} className="hover:text-text-primary">Reply</button>}
        </div>
      </div>
    </div>
  )
}
