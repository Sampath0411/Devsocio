import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PostCard from '../components/PostCard'
import { Avatar } from '../components/ui'
import { subscribeComments, addComment, pushNotification } from '../lib/db'
import { ChevronLeft, Heart, Send } from '../components/icons'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { posts, user } = useStore()
  const post = posts.find((p) => p.postId === id)

  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')

  // Live comments for this post (PRD §3.8).
  useEffect(() => {
    if (!id) return
    return subscribeComments(id, setComments)
  }, [id])

  const add = async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    try {
      await addComment(id, {
        text,
        author: {
          uid: user?.uid,
          username: user?.username,
          displayName: user?.displayName,
          avatar: user?.avatar,
        },
        authorUid: user?.uid,
      })
      const targetUid = post?.authorUid || post?.author?.uid
      if (targetUid && targetUid !== user?.uid) {
        pushNotification(targetUid, {
          type: 'comment',
          actorUid: user?.uid,
          actor: { uid: user?.uid, username: user?.username, displayName: user?.displayName, avatar: user?.avatar },
          text: `commented: "${text.slice(0, 40)}"`,
          postId: id,
        })
      }
    } catch {
      // Optimistically show it locally even if the write failed.
      setComments((c) => [...c, { id: 'local_' + c.length, author: user, text }])
    }
  }

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
          <input className="input" placeholder="Add a comment… @mention supported"
            value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button onClick={add} className="btn-primary shrink-0"><Send size={15} /> Reply</button>
        </div>

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar src={c.author?.avatar} alt={c.author?.displayName} size={36} />
              <div>
                <p className="text-sm">
                  <span className="font-semibold">{c.author?.displayName || 'You'}</span>{' '}
                  <span className="text-xs text-text-muted">@{c.author?.username}</span>
                </p>
                <p className="text-sm text-text-primary">{c.text}</p>
                <div className="mt-1 flex gap-3 text-xs text-text-muted">
                  <button className="flex items-center gap-1 hover:text-danger"><Heart size={13} /> Like</button>
                  <button className="hover:text-text-primary">Reply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
