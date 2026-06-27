import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { createPost } from '../lib/db'
import { analyzePost } from '../lib/ai'
import { earnCredits } from '../lib/credits'
import { uploadImage, cloudinaryConfigured } from '../lib/upload'
import { AILoader, StackPill } from './ui'
import { POST_TYPES } from '../data/mock'
import { TYPE_META } from './postTypes'
import { X, Sparkles, Coins, ImageIcon } from './icons'
import { checkContent } from '../lib/filter'

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
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [aiState, setAiState] = useState('idle')
  const [aiResult, setAiResult] = useState('')

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      setImageUrl(await uploadImage(file))
    } catch {
      toast('Upload failed — paste an image URL instead', { tone: 'warning' })
    } finally {
      setUploading(false)
    }
  }

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
    // Feature 9: block profane content before publishing
    const check = checkContent(content)
    if (!check.clean) {
      toast('Post blocked — contains inappropriate language', { tone: 'warning' })
      return
    }
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
      imageUrl: imageUrl.trim() || null,
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
    // Reward via the trusted server; fall back to client write if not set up yet.
    try {
      await earnCredits('post_reward')
    } catch {
      addCredits(30)
    }
    toast('Post published! +30 credits', { icon: Coins })
    reset()
    onClose()
  }

  const reset = () => { setContent(''); setImageUrl(''); setAiState('idle'); setAiResult(''); setType('Code Snippet') }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative z-10 w-full max-w-lg space-y-4 rounded-2xl border border-border p-5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #14213D 0%, #0D1628 100%)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Create Post</h2>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-text-muted hover:border-white/30 hover:text-white transition-all"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((p) => {
                const { Icon, tint } = TYPE_META[p.type]
                const active = type === p.type
                return (
                  <button
                    key={p.type}
                    onClick={() => { setType(p.type); setAiState('idle') }}
                    className={`pill border text-xs font-semibold transition-all ${
                      active
                        ? 'shadow-glow-sm'
                        : 'border-border text-text-muted hover:border-primary/40 hover:text-white'
                    }`}
                    style={active ? {
                      borderColor: tint,
                      background: `${tint}18`,
                      color: tint,
                    } : {}}
                  >
                    <Icon size={12} /> {p.type}
                  </button>
                )
              })}
            </div>

            <textarea className="input min-h-[120px] resize-none"
              placeholder={`Share a ${type.toLowerCase()}…`}
              value={content} onChange={(e) => setContent(e.target.value)} />

            {/* image: upload (if Cloudinary configured) or paste a URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {cloudinaryConfigured() && (
                  <label className="btn-ghost cursor-pointer !py-1.5 text-xs">
                    <ImageIcon size={13} /> {uploading ? 'Uploading…' : 'Upload image'}
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
                  </label>
                )}
                <input className="input text-xs" placeholder="…or paste an image URL"
                  value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>
              {imageUrl && (
                <div className="relative">
                  <img src={imageUrl} alt="preview" className="max-h-48 w-full rounded-card object-cover" />
                  <button onClick={() => setImageUrl('')}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div
              className="rounded-xl border border-primary/20 p-3.5"
              style={{ background: 'rgba(252,163,17,0.04)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex-1 text-xs text-text-muted leading-relaxed">
                  {POST_TYPES.find((p) => p.type === type)?.ai}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={runAI}
                  disabled={!content.trim() || aiState === 'loading'}
                  className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  <Sparkles size={13} /> Run AI
                </motion.button>
              </div>
              {aiState === 'loading' && <div className="mt-2.5"><AILoader label="Analyzing your post…" /></div>}
              {aiState === 'done' && (
                <p className="mt-2.5 text-sm text-text-secondary leading-relaxed border-t border-primary/20 pt-2.5">
                  {aiResult}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex gap-1.5">
                {(user?.techStack || []).slice(0, 3).map((t) => <StackPill key={t} name={t} />)}
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={publish}
                disabled={!content.trim()}
                className="btn-primary"
              >
                Publish
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
