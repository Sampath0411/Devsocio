import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { createPost } from '../lib/db'
import { analyzePost } from '../lib/ai'
import { AILoader, StackPill } from './ui'
import { POST_TYPES } from '../data/mock'
import { TYPE_META } from './postTypes'
import { X, Sparkles, Coins } from './icons'

// Local fallback line per post type, used only if the AI call fails (PRD §4.1).
const FALLBACK_AI = {
  'Code Snippet': 'A clean utility — does one thing well and is easy to reuse.',
  'Project Showcase': 'Concept: 8/10 — strong execution. Add a live demo link to boost reach.',
  'Idea Post': 'Market score 7.5/10. Strong timing; validate willingness-to-pay early.',
  'Dev Meme': 'Humor level: 8/10 — relatable to anyone who has shipped on a Friday.',
  'Question / Help': 'AI draft: have you checked the network tab for a CORS preflight failure?',
  'Opinion / Take': 'Counter-angle: context matters — the “right” tool depends on team size.',
}

export default function CreatePostModal({ open, onClose }) {
  const { user, addPostLocal, addCredits } = useStore()
  const toast = useToast()
  const [type, setType] = useState('Code Snippet')
  const [content, setContent] = useState('')
  const [aiState, setAiState] = useState('idle')
  const [aiResult, setAiResult] = useState('')

  // Real AI analysis via OpenRouter, with a graceful local fallback.
  const runAI = async () => {
    setAiState('loading')
    setAiResult('')
    try {
      const text = await analyzePost(type, content)
      setAiResult(text)
    } catch {
      setAiResult(FALLBACK_AI[type])
    }
    setAiState('done')
  }

  const publish = async () => {
    if (!content.trim()) return
    const post = {
      authorUid: user?.uid,
      author: {
        username: user?.username,
        displayName: user?.displayName,
        avatar: user?.avatar,
      },
      type,
      createdAt: 'now',
      content,
      tags: user?.techStack?.slice(0, 2) || [],
      hashtags: [],
      likes: 0,
      commentsCount: 0,
      aiAnalysis: aiState === 'done' ? aiResult : null,
    }
    try {
      const id = await createPost(post) // → Firestore (PRD §8.2.1)
      addPostLocal({ ...post, postId: id })
    } catch {
      addPostLocal({ ...post, postId: 'local_' + Date.now() })
    }
    addCredits(30) // first/new post reward (PRD §5.1)
    toast('Post published! +30 credits', { icon: Coins })
    reset()
    onClose()
  }

  const reset = () => { setContent(''); setAiState('idle'); setAiResult(''); setType('Code Snippet') }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.25 }}
            className="card relative z-10 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Create Post</h2>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((p) => {
                const Icon = TYPE_META[p.type].Icon
                const active = type === p.type
                return (
                  <button key={p.type} onClick={() => { setType(p.type); setAiState('idle') }}
                    className={`pill border ${active ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-text-muted hover:border-primary/40'}`}>
                    <Icon size={12} /> {p.type}
                  </button>
                )
              })}
            </div>

            <textarea className="input min-h-[120px] resize-none"
              placeholder={`Share a ${type.toLowerCase()}…`}
              value={content} onChange={(e) => setContent(e.target.value)} />

            <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">{POST_TYPES.find((p) => p.type === type)?.ai}</p>
                <button onClick={runAI} disabled={!content.trim() || aiState === 'loading'}
                  className="btn-accent !px-3 !py-1.5 text-xs">
                  <Sparkles size={13} /> Run AI
                </button>
              </div>
              {aiState === 'loading' && <div className="mt-2"><AILoader label="Analyzing…" /></div>}
              {aiState === 'done' && <p className="mt-2 text-sm text-text-primary">{aiResult}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {(user?.techStack || []).slice(0, 3).map((t) => <StackPill key={t} name={t} />)}
              </div>
              <button onClick={publish} disabled={!content.trim()} className="btn-primary">Publish</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
