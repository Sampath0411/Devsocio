import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, StackPill, AIBadge, AILoader, EmptyState, FounderBadge, FounderName } from '../components/ui'
import { subscribeIdeas, createIdea, investInIdea, requestCollab, deleteIdea } from '../lib/db'
import { isFounder, isAdmin } from '../lib/auth'
import { scoreIdea } from '../lib/ai'
import { timeAgo } from '../lib/time'
import { Coins, MessageCircle, Handshake, Lightbulb, Check, Circle, Trash2, Crown } from '../components/icons'

const SORTS = ['Newest', 'Most Invested', 'AI Score', 'Most Discussed']

function ScoreRing({ score }) {
  const pct = (score / 10) * 100
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full text-sm font-bold"
      style={{ background: `conic-gradient(#007991 ${pct}%, #2a3a5c ${pct}%)` }}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-accent">{score}</span>
    </div>
  )
}

export function IdeaCard({ idea, onInvest, onCollab }) {
  const strengths = idea.strengths || []
  const weaknesses = idea.weaknesses || []
  const competitors = idea.competitors || []
  const toast = useToast()
  const firebaseUser = useStore((s) => s.firebaseUser)
  const users = useStore((s) => s.users)
  const authorUser = users.find((u) => u.uid === idea.author?.uid || u.username === idea.author?.username)
  const authorFounder = isFounder(authorUser)
  const canDelete = !!firebaseUser && (firebaseUser.uid === idea.author?.uid || isAdmin(firebaseUser))

  const removeIdea = async () => {
    try {
      await deleteIdea(idea.ideaId)
      toast('Idea deleted', { tone: 'success' })
    } catch {
      toast('Could not delete idea', { tone: 'warning' })
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card space-y-3">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${idea.author?.username}`}>
          <Avatar src={idea.author?.avatar} alt={idea.author?.displayName} size={40} founder={authorFounder} />
        </Link>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold leading-tight">{idea.title}</h3>
          <p className="flex items-center gap-1 text-xs text-text-muted">
            by{' '}
            {authorFounder
              ? <FounderName>@{idea.author?.username}</FounderName>
              : <>@{idea.author?.username}</>}
            {authorFounder && <Crown size={11} fill="currentColor" className="text-[#FFD66B]" />}
            {authorFounder && <FounderBadge />}
            <span>· {timeAgo(idea.createdAt) || 'now'}</span>
          </p>
        </div>
        {canDelete && (
          <button onClick={removeIdea} title="Delete idea"
            className="grid h-8 w-8 place-items-center rounded-input border border-border text-text-muted hover:border-danger hover:text-danger">
            <Trash2 size={14} />
          </button>
        )}
        <ScoreRing score={idea.aiScore} />
      </div>

      <p className="text-sm text-text-primary">{idea.body}</p>
      <div className="flex flex-wrap gap-1.5">{(idea.tags || []).map((t) => <StackPill key={t} name={t} />)}</div>

      <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-3 text-sm">
        <AIBadge>AI Idea Analysis</AIBadge>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-success">Strengths</p>
            <ul className="space-y-1 text-text-muted">
              {strengths.map((s) => (
                <li key={s} className="flex items-start gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-success" /> {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-danger">Weaknesses</p>
            <ul className="space-y-1 text-text-muted">
              {weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-1.5"><Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 shrink-0 text-danger" /> {w}</li>
              ))}
            </ul>
          </div>
        </div>
        {competitors.length > 0 && (
          <p className="mt-2 text-xs text-text-muted">
            <span className="font-semibold text-text-primary">Similar:</span> {competitors.join(', ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-border pt-3 text-sm text-text-muted">
        <span className="flex items-center gap-1.5"><Coins size={15} /> {idea.invested || 0}</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={15} /> {idea.comments || 0}</span>
        <button onClick={onInvest} className="btn-ghost ml-auto !py-1.5 !px-3 text-xs">
          <Coins size={14} /> Invest 50
        </button>
        <button onClick={onCollab} className="btn-primary !py-1.5 !px-3 text-xs"><Handshake size={14} /> Collab</button>
      </div>
    </motion.div>
  )
}

export default function Ideas() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user, spendCredits } = useStore()
  const [ideas, setIdeas] = useState([])
  const [sort, setSort] = useState('AI Score')
  const [draft, setDraft] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => subscribeIdeas(setIdeas), [])

  const collab = async (idea) => {
    if (!idea.author?.uid || idea.author.uid === user?.uid) return
    try {
      await requestCollab(user, idea.author, idea.title)
      toast(`Collab request sent for "${idea.title}"`, { tone: 'success', icon: Handshake })
      navigate(`/messages/${idea.author.uid}`)
    } catch {
      toast('Could not send collab request', { tone: 'warning' })
    }
  }

  const sorted = [...ideas].sort((a, b) => {
    if (sort === 'AI Score') return (b.aiScore || 0) - (a.aiScore || 0)
    if (sort === 'Most Invested') return (b.invested || 0) - (a.invested || 0)
    if (sort === 'Most Discussed') return (b.comments || 0) - (a.comments || 0)
    return 0
  })

  const invest = async (idea) => {
    if (!(await spendCredits(50))) {
      toast('Not enough credits to invest', { tone: 'warning' })
      return
    }
    try {
      await investInIdea(idea.ideaId, 50)
    } catch {
      /* optimistic — credit already spent locally */
    }
    toast(`Invested 50 credits in "${idea.title}"`, { icon: Coins })
  }

  // Post an idea: real AI score + strengths/weaknesses, then persist to Firestore.
  const analyze = async () => {
    if (!draft.trim()) return
    setAnalyzing(true)
    try {
      const ai = await scoreIdea(draft)
      const title = draft.split(/[.\n]/)[0].slice(0, 60).trim() || 'New idea'
      await createIdea({
        title,
        body: draft.trim(),
        author: {
          uid: user?.uid,
          username: user?.username,
          displayName: user?.displayName,
          avatar: user?.avatar,
        },
        authorUid: user?.uid,
        aiScore: Number(ai.score.toFixed(1)),
        strengths: ai.strengths,
        weaknesses: ai.weaknesses,
        competitors: ai.competitors,
        tags: user?.techStack?.slice(0, 2) || [],
      })
      setDraft('')
      toast('Idea posted — AI score generated!', { icon: Lightbulb })
    } catch {
      toast('AI scoring failed — try again in a moment', { tone: 'warning' })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-1 font-display text-xl font-bold">Ideas Board</h1>
      <p className="mb-4 text-sm text-text-muted">Drop an idea, get an instant AI market score, find a co-founder.</p>

      <div className="card mb-5 space-y-3">
        <textarea className="input min-h-[80px] resize-none" placeholder="Describe your startup or project idea…"
          value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="flex items-center justify-between">
          {analyzing ? <AILoader label="Scoring your idea…" /> : <span className="text-xs text-text-muted">AI gives market score + 3 strengths + 3 weaknesses</span>}
          <button onClick={analyze} disabled={!draft.trim() || analyzing} className="btn-primary !py-2">
            <Lightbulb size={15} /> Post Idea
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button key={s} onClick={() => setSort(s)}
            className={`pill border ${sort === s ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-text-muted hover:border-primary/40'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {sorted.map((idea) => (
            <IdeaCard key={idea.ideaId} idea={idea} onInvest={() => invest(idea)} onCollab={() => collab(idea)} />
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <EmptyState icon={Lightbulb} title="No ideas yet — post the first one above and get an instant AI score." />
        )}
      </div>
    </div>
  )
}
