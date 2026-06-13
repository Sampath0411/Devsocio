import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, StackPill, AIBadge, AILoader } from '../components/ui'
import { IDEAS } from '../data/mock'
import { Coins, MessageCircle, Handshake, Lightbulb, Check, Circle } from '../components/icons'

const SORTS = ['Newest', 'Most Invested', 'AI Score', 'Most Discussed']

function ScoreRing({ score }) {
  const pct = (score / 10) * 100
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full text-sm font-bold"
      style={{ background: `conic-gradient(#6C63FF ${pct}%, #2A2A3D ${pct}%)` }}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-accent">{score}</span>
    </div>
  )
}

function IdeaCard({ idea, onInvest, invested }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card space-y-3">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${idea.author.username}`}>
          <Avatar src={idea.author.avatar} alt={idea.author.displayName} size={40} />
        </Link>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold leading-tight">{idea.title}</h3>
          <p className="text-xs text-text-muted">by @{idea.author.username} · {idea.createdAt}</p>
        </div>
        <ScoreRing score={idea.aiScore} />
      </div>

      <p className="text-sm text-text-primary">{idea.body}</p>
      <div className="flex flex-wrap gap-1.5">{idea.tags.map((t) => <StackPill key={t} name={t} />)}</div>

      <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-3 text-sm">
        <AIBadge>AI Idea Analysis</AIBadge>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-success">Strengths</p>
            <ul className="space-y-1 text-text-muted">
              {idea.strengths.map((s) => (
                <li key={s} className="flex items-start gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-success" /> {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-danger">Weaknesses</p>
            <ul className="space-y-1 text-text-muted">
              {idea.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-1.5"><Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 shrink-0 text-danger" /> {w}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          <span className="font-semibold text-text-primary">Similar:</span> {idea.competitors.join(', ')}
        </p>
      </div>

      <div className="flex items-center gap-4 border-t border-border pt-3 text-sm text-text-muted">
        <span className="flex items-center gap-1.5"><Coins size={15} /> {invested}</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={15} /> {idea.comments}</span>
        <button onClick={onInvest} className="btn-ghost ml-auto !py-1.5 !px-3 text-xs">
          <Coins size={14} /> Invest 50
        </button>
        <button className="btn-primary !py-1.5 !px-3 text-xs"><Handshake size={14} /> Collab</button>
      </div>
    </motion.div>
  )
}

export default function Ideas() {
  const toast = useToast()
  const spendCredits = useStore((s) => s.spendCredits)
  const [sort, setSort] = useState('AI Score')
  const [invests, setInvests] = useState(() => Object.fromEntries(IDEAS.map((i) => [i.ideaId, i.invested])))
  const [draft, setDraft] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const sorted = [...IDEAS].sort((a, b) => {
    if (sort === 'AI Score') return b.aiScore - a.aiScore
    if (sort === 'Most Invested') return invests[b.ideaId] - invests[a.ideaId]
    if (sort === 'Most Discussed') return b.comments - a.comments
    return 0
  })

  const invest = async (idea) => {
    if (!(await spendCredits(50))) {
      toast('Not enough credits to invest', { tone: 'warning' })
      return
    }
    setInvests((s) => ({ ...s, [idea.ideaId]: s[idea.ideaId] + 50 }))
    toast(`Invested 50 credits in "${idea.title}"`, { icon: Coins })
  }

  const analyze = () => {
    if (!draft.trim()) return
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setDraft('')
      toast('Idea posted — AI score generated!', { icon: Lightbulb })
    }, 1800)
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
            <IdeaCard key={idea.ideaId} idea={idea} invested={invests[idea.ideaId]} onInvest={() => invest(idea)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
