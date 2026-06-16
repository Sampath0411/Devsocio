import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar } from '../components/ui'
import { earnCredits } from '../lib/credits'
import { subscribeCreditLog } from '../lib/db'
import { formatNum } from '../lib/time'
import { REWARDS, EARN_RULES } from '../data/mock'
import {
  Coins, Copy, Check, Gift, Trophy, Plus,
  Pin, Rocket, BadgeCheck, Bot, Zap, Palette, Crown,
} from '../components/icons'

const REWARD_ICONS = { Pin, Rocket, BadgeCheck, Bot, Zap, Palette, Crown }

export default function Credits() {
  const { user, users, spendCredits, addCredits, saveProfileFields } = useStore()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('overview') // 'overview' | 'history'
  const [log, setLog] = useState([])

  // Subscribe to credit transaction log
  useEffect(() => {
    if (!user?.uid) return
    return subscribeCreditLog(user.uid, setLog)
  }, [user?.uid])

  // Live weekly leaderboard from the user directory, ranked by credits.
  const leaderboard = [...users]
    .sort((a, b) => (b.credits || 0) - (a.credits || 0))
    .slice(0, 5)
    .map((u, i) => ({ rank: i + 1, user: u, credits: u.credits || 0 }))

  const refLink = `devs.socio/join?ref=${user?.username || 'you'}`

  const copy = () => {
    navigator.clipboard?.writeText(refLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    toast('Referral link copied!', { icon: Copy })
  }

  // Map a reward → profile field(s) it unlocks, so redemptions actually apply.
  const REWARD_EFFECT = {
    r2: { boosted: true },        // Profile Boost
    r3: { verified: true },       // Verified Badge
    r4: { aiPersona: true },      // Custom AI Persona
    r6: { premiumTheme: true },   // Profile Theme
    r7: { topDev: true },         // "Top Dev" Badge
  }

  const redeem = async (r) => {
    if (user?.[Object.keys(REWARD_EFFECT[r.id] || {})[0]]) {
      toast(`You already own ${r.name}`, { tone: 'warning' })
      return
    }
    if (!(await spendCredits(r.cost))) {
      toast('Not enough credits', { tone: 'warning' })
      return
    }
    const effect = REWARD_EFFECT[r.id]
    if (effect) saveProfileFields(effect)
    toast(`Redeemed: ${r.name}${effect ? ' — unlocked!' : ''}`, { tone: 'success' })
  }

  // Daily login bonus via the trusted server (server enforces once-per-day);
  // falls back to a client write if the server isn't configured yet.
  const dailyLogin = async () => {
    try {
      const { awarded, streak, streakBonus } = await earnCredits('daily_login')
      if (!awarded) {
        toast('Already claimed today!', { tone: 'warning' })
        return
      }
      if (streakBonus) {
        toast(`🔥 ${streak}-day streak! +${awarded} credits`, { tone: 'success', icon: Coins })
      } else {
        toast(`+${awarded} daily credits — ${streak} day streak 🔥`, { icon: Coins })
      }
      addCredits(0) // triggers a re-sync via onSnapshot
    } catch {
      addCredits(5)
      toast('+5 daily login bonus!', { icon: Coins })
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Credits Dashboard</h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setTab('overview')}
            className={`rounded-input px-3 py-1.5 transition-colors ${tab === 'overview' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}>
            Overview
          </button>
          <button onClick={() => setTab('history')}
            className={`rounded-input px-3 py-1.5 transition-colors ${tab === 'history' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}>
            History
          </button>
        </div>
      </div>

      <div className="card mb-5 flex items-center justify-between border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5">
        <div>
          <p className="text-sm text-text-muted">Your balance</p>
          <p className="flex items-center gap-2 font-display text-4xl font-extrabold text-warning">
            <Coins size={30} /> <span title={String(user?.credits ?? 0)}>{formatNum(user?.credits ?? 0)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={dailyLogin} className="btn-ghost text-xs"><Plus size={14} /> Daily login (+5)</button>
          {(user?.loginStreak || 0) > 0 && (
            <p className="text-center text-xs text-text-muted">
              🔥 {user.loginStreak}-day streak
              {user.loginStreak % 7 === 0
                ? ' — bonus claimed!'
                : ` — ${7 - (user.loginStreak % 7)} days to streak bonus`}
            </p>
          )}
        </div>
      </div>

      {tab === 'history' ? (
        <div className="card">
          <h2 className="mb-3 font-display text-sm font-bold">Transaction History</h2>
          <div className="space-y-2">
            {log.length === 0
              ? <p className="py-4 text-center text-sm text-text-muted">No transactions yet.</p>
              : log.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-input border border-border px-3 py-2.5 text-sm">
                  <span className="text-text-muted">{tx.description}</span>
                  <span className={tx.amount > 0 ? 'font-bold text-success' : 'font-bold text-danger'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-5">
            <h2 className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold"><Gift size={15} /> Refer &amp; Earn</h2>
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
                {leaderboard.map((row) => (
                  <li key={row.rank} className="flex items-center gap-2 text-sm">
                    <span className="w-5 font-bold text-text-muted">{row.rank}</span>
                    <Avatar src={row.user.avatar} alt={row.user.displayName} size={28} />
                    <span className="flex-1 truncate">{row.user.displayName}</span>
                    <span className="flex items-center gap-1 text-xs text-warning"><Coins size={12} /> {formatNum(row.credits)}</span>
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
        </>
      )}
    </div>
  )
}
