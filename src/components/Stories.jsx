import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { subscribeStories, createStory, reactToStory, markStoryViewed } from '../lib/db'
import { timeAgo } from '../lib/time'
import { Avatar } from './ui'
import { Plus, X } from './icons'

// Dev-specific story reactions (PRD §3.4).
const REACTIONS = ['🚀', '💀', '🔥', '🤯', '👾', '✅']

export default function Stories() {
  const { user, firebaseUser } = useStore()
  const toast = useToast()
  const [stories, setStories] = useState([])
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [viewer, setViewer] = useState(null) // { authorUid, items, index }

  useEffect(() => subscribeStories(setStories), [])

  // Group active stories by author (newest first within each).
  const groups = useMemo(() => {
    const map = new Map()
    for (const s of stories) {
      if (!map.has(s.authorUid)) map.set(s.authorUid, { authorUid: s.authorUid, author: s.author, items: [] })
      map.get(s.authorUid).items.push(s)
    }
    return [...map.values()]
  }, [stories])

  const postStory = async () => {
    const text = draft.trim()
    if (!text) return
    setComposing(false)
    setDraft('')
    try {
      await createStory({
        authorUid: user?.uid,
        author: { uid: user?.uid, username: user?.username, displayName: user?.displayName, avatar: user?.avatar },
        text,
      })
      toast('Story posted — live for 24h', { tone: 'success' })
    } catch {
      toast('Could not post story', { tone: 'warning' })
    }
  }

  const current = viewer ? viewer.items[viewer.index] : null
  const react = async (emoji) => {
    if (!current || !firebaseUser) return
    try { await reactToStory(current.storyId, emoji, firebaseUser.uid) } catch { /* ignore */ }
  }
  const advance = () => {
    if (!viewer) return
    if (viewer.index < viewer.items.length - 1) setViewer({ ...viewer, index: viewer.index + 1 })
    else setViewer(null)
  }

  // Record that the signed-in user has seen the current story (PRD §3.4).
  useEffect(() => {
    if (current && firebaseUser && !(current.viewers || []).includes(firebaseUser.uid)) {
      markStoryViewed(current.storyId, firebaseUser.uid)
    }
  }, [current, firebaseUser])

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {/* Your story — composer */}
        <button onClick={() => setComposing(true)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary/60">
            <Avatar src={user?.avatar} alt="you" size={56} />
            <span className="absolute -bottom-0 -right-0 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
              <Plus size={12} />
            </span>
          </span>
          <span className="truncate text-[11px] text-text-muted">Your story</span>
        </button>

        {groups.map((g) => (
          <button key={g.authorUid} onClick={() => setViewer({ ...g, index: 0 })}
            className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className="rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
              <span className="block rounded-full border-2 border-bg">
                <Avatar src={g.author?.avatar} alt={g.author?.displayName} size={56} />
              </span>
            </span>
            <span className="truncate text-[11px] text-text-muted">{g.author?.displayName}</span>
          </button>
        ))}
      </div>

      {/* Composer modal */}
      <AnimatePresence>
        {composing && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setComposing(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="card relative z-10 w-full max-w-md space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Share a story</h2>
                <button onClick={() => setComposing(false)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
              </div>
              <textarea className="input min-h-[120px] resize-none" placeholder="What are you building right now?"
                value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="flex justify-end">
                <button onClick={postStory} disabled={!draft.trim()} className="btn-primary">Post story</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story viewer */}
      <AnimatePresence>
        {current && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/85" onClick={() => setViewer(null)} />
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              className="relative z-10 flex w-full max-w-sm flex-col">
              <div className="mb-3 flex items-center gap-2">
                <Avatar src={current.author?.avatar} alt={current.author?.displayName} size={36} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{current.author?.displayName}</p>
                  <p className="text-xs text-white/60">{timeAgo(current.createdAt)}</p>
                </div>
                <button onClick={() => setViewer(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
              </div>

              <div onClick={advance}
                className="flex min-h-[320px] cursor-pointer items-center justify-center rounded-card p-6 text-center text-lg font-medium text-white"
                style={{ background: 'linear-gradient(135deg,#007991,#439a86)' }}>
                {current.text}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {REACTIONS.map((r) => (
                  <button key={r} onClick={() => react(r)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl transition-transform hover:scale-110">
                    {r}
                  </button>
                ))}
              </div>
              {viewer.items.length > 1 && (
                <p className="mt-2 text-center text-xs text-white/50">{viewer.index + 1} / {viewer.items.length} · tap story for next</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
