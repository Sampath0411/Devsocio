import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar } from '../components/ui'
import { REWARDS, EARN_RULES, LEADERBOARD } from '../data/mock'
import {
  Coins, Copy, Check, Gift, Trophy, Plus,
  Pin, Rocket, BadgeCheck, Bot, Zap, Palette, Crown,
} from '../components/icons'

const REWARD_ICONS = { Pin, Rocket, BadgeCheck, Bot, Zap, Palette, Crown }

export default function Credits() {
  const { user, spendCredits, addCredits } = useStore()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const refLink = `devs.socio/join?ref=${user?.username || 'you'}`

  const copy = () => {
    navigator.clipboard?.writeText(refLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    toast('Referral link copied!', { icon: Copy })
  }

  const redeem = async (r) => {
    if (await spendCredits(r.cost)) toast(`Redeemed: ${r.name}`, { tone: 'success' })
    else toast('Not enough credits', { tone: 'warning' })
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-4 font-display text-xl font-bold">Credits Dashboard</h1>

      <div className="card mb-5 flex items-center justify-between border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5">
        <div>
          <p className="text-sm text-text-muted">Your balance</p>
          <p className="flex items-center gap-2 font-display text-4xl font-extrabold text-warning">
            <Coins size={30} /> {user?.credits ?? 0}
          </p>
        </div>
        <button onClick={() => addCredits(5)} className="btn-ghost text-xs"><Plus size={14} /> Daily login (+5)</button>
      </div>

      <div className="card mb-5">
        <h2 className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold"><Gift size={15} /> Refer & Earn</h2>
        <p className="mb-3 text-xs text-text-muted">
          Share your link — you both get <b className="text-warning">+150 credits</b> on signup,
          plus <b className="text-warning">+50</b> when they make their first post.
        </p>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" readOnly value={refLink} />
          <button onClick={copy} className="btn-primary shrink-0">
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-display text-sm font-bold">Earn Credits</h2>
          <ul className="space-y-2 text-sm">
            {EARN_RULES.map((r) => (
              <li key={r.action} className="flex items-center justify-between">
                <span className="text-text-muted">{r.action}</span>
                <span className="font-semibold text-success">+{r.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold"><Trophy size={15} /> Weekly Leaderboard</h2>
          <ol className="space-y-2.5">
            {LEADERBOARD.map((row) => (
              <li key={row.rank} className="flex items-center gap-2 text-sm">
                <span className="w-5 font-bold text-text-muted">{row.rank}</span>
                <Avatar src={row.user.avatar} alt={row.user.displayName} size={28} />
                <span className="flex-1 truncate">{row.user.displayName}</span>
                <span className="flex items-center gap-1 text-xs text-warning"><Coins size={12} /> {row.credits}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <h2 className="mb-3 mt-5 font-display text-sm font-bold">Rewards Shop</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REWARDS.map((r) => {
          const Icon = REWARD_ICONS[r.icon] || Coins
          const affordable = (user?.credits ?? 0) >= r.cost
          return (
            <div key={r.id} className="card flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-card bg-primary/10 text-primary"><Icon size={20} /></span>
              <p className="mt-2 font-semibold">{r.name}</p>
              <p className="flex-1 text-xs text-text-muted">{r.desc}</p>
              <button onClick={() => redeem(r)} disabled={!affordable}
                className={`mt-3 ${affordable ? 'btn-primary' : 'btn-ghost'} w-full justify-center text-xs`}>
                <Coins size={14} /> {r.cost}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
