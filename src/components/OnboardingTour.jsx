import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Compass, Lightbulb, Coins, X, ArrowRight } from './icons'

const STEPS = [
  {
    Icon: Home,
    title: 'Your Feed',
    desc: 'See posts from devs you follow. Share code, projects, ideas, and memes.',
    route: '/feed',
  },
  {
    Icon: Compass,
    title: 'Explore',
    desc: 'Discover developers by tech stack, collab status, or trending topics.',
    route: '/explore',
  },
  {
    Icon: Lightbulb,
    title: 'Ideas Board',
    desc: 'Drop a startup idea. Get an AI market score. Find a co-founder.',
    route: '/ideas',
  },
  {
    Icon: Coins,
    title: 'Credits',
    desc: 'Earn credits for posting, getting likes, and referring friends. Spend them on perks.',
    route: '/credits',
  },
]

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) { onDone(); return }
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative mx-4 w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-2xl"
        >
          <button
            onClick={onDone}
            className="absolute right-4 top-4 text-text-muted hover:text-text-primary"
            aria-label="Close onboarding tour"
          >
            <X size={18} />
          </button>

          {/* Progress bar */}
          <div className="mb-4 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-card bg-primary/15 text-primary">
            <current.Icon size={28} />
          </div>

          <h2 className="font-display text-xl font-bold">{current.title}</h2>
          <p className="mt-2 text-sm text-text-muted">{current.desc}</p>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={onDone} className="text-xs text-text-muted hover:text-text-primary">
              Skip tour
            </button>
            <button onClick={next} className="btn-primary gap-2">
              {isLast ? 'Get started' : 'Next'} <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
