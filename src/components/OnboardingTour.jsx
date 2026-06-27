import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { Home, Compass, Lightbulb, Coins, X, ArrowRight, Check, Zap } from './icons'

// Confetti particle component
function Confetti({ active }) {
  if (!active) return null
  const colors = ['#FCA311', '#E5E5E5', '#14213D', '#FDB340', '#FFFFFF']
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0 h-2 w-2 rounded-sm"
          style={{
            background: p.color,
            left: `${p.x}%`,
            transformOrigin: 'center',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: 300, opacity: 0, rotate: 720, scale: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

const STEPS = [
  {
    Icon: Home,
    color: '#FCA311',
    title: 'Your Feed',
    desc: 'See posts from devs you follow. Share code, projects, ideas, and memes. Your dev life — all in one place.',
    hint: '📡 Real-time updates, no refresh needed',
    route: '/feed',
  },
  {
    Icon: Compass,
    color: '#60A5FA',
    title: 'Explore & Discover',
    desc: 'Find developers by tech stack, collab status, or trending topics. Search 1,200+ developers worldwide.',
    hint: '🔍 Filter by React, Python, Go and 15+ stacks',
    route: '/explore',
  },
  {
    Icon: Lightbulb,
    color: '#A78BFA',
    title: 'Ideas Board',
    desc: 'Drop a startup idea. Get an AI market score out of 10. Find a technical co-founder from the community.',
    hint: '🤖 AI analyzes market fit, strengths, and competitors',
    route: '/ideas',
  },
  {
    Icon: Coins,
    color: '#FCA311',
    title: 'Earn Credits',
    desc: 'Get rewarded for posting, getting likes, daily logins, and referring friends. Spend credits on perks.',
    hint: '🎁 You start with 100 free credits!',
    route: '/credits',
  },
]

export default function OnboardingTour({ onDone }) {
  const user = useStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) {
      setShowConfetti(true)
      setTimeout(() => {
        onDone()
      }, 1200)
      return
    }
    setStep((s) => s + 1)
  }

  const skip = () => onDone()

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border p-6 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #14213D 0%, #0D1628 100%)',
            boxShadow: `0 32px 64px -16px rgba(0,0,0,0.9), 0 0 40px -16px ${current.color}40`,
            borderColor: `${current.color}25`,
          }}
        >
          {/* Confetti */}
          <Confetti active={showConfetti} />

          {/* Close button */}
          <button
            onClick={skip}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:border-white/30 hover:text-white transition-all"
            aria-label="Skip onboarding"
          >
            <X size={14} />
          </button>

          {/* Step progress dots */}
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 24 : 8,
                  background: i <= step ? current.color : '#1E2F4A',
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="h-1.5 rounded-full"
              />
            ))}
            <span className="ml-auto text-xs text-text-muted">
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Welcome text (first step only) */}
          {step === 0 && user?.displayName && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 text-xs font-semibold"
              style={{ color: current.color }}
            >
              👋 Welcome, {user.displayName}!
            </motion.p>
          )}

          {/* Icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-5 grid h-16 w-16 place-items-center rounded-2xl"
            style={{
              background: `${current.color}15`,
              border: `1px solid ${current.color}30`,
              boxShadow: `0 0 24px -8px ${current.color}50`,
            }}
          >
            <current.Icon size={30} style={{ color: current.color }} />
          </motion.div>

          {/* Title */}
          <h2 className="font-display text-2xl font-extrabold text-white">{current.title}</h2>

          {/* Description */}
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{current.desc}</p>

          {/* Hint chip */}
          <div
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              background: `${current.color}10`,
              color: current.color,
              border: `1px solid ${current.color}25`,
            }}
          >
            {current.hint}
          </div>

          {/* Feature highlights (last step) */}
          {isLast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 space-y-2"
            >
              {[
                '100 free credits to start',
                'AI feedback on every post',
                'Find co-founders & collaborators',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Check size={12} className="text-primary shrink-0" />
                  {f}
                </div>
              ))}
            </motion.div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={skip}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              Skip tour
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={next}
              className="flex items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-bold text-black shadow-glow-sm"
              style={{ background: current.color }}
            >
              {isLast ? (
                <>
                  <Zap size={14} /> Get started!
                </>
              ) : (
                <>
                  Next <ArrowRight size={14} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
