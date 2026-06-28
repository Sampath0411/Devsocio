import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { POST_TYPES } from '../data/mock'
import { TYPE_META } from '../components/postTypes'
import DevSocioLogo from '../components/Logo'
import {
  Code2, Bot, Coins, Lightbulb, Rocket,
  Shield, ArrowRight, Check, Heart, Handshake,
  GithubMark, Zap, Star, Users, Download, Loader2,
} from '../components/icons'

// Animation helpers
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] },
})

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

// Animated counter hook
function useCounter(end, duration = 2) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return { count, ref }
}

// Floating code particles — denser, with cursor-aware parallax
function FloatingParticles() {
  const snippets = [
    'const', '=>', '{}', '[]', 'async', 'return', '<>', '&&',
    'useState', 'import', 'export', 'await', 'fetch', 'npm i',
    'git push', 'PR', 'CI/CD', 'docker', 'API', '404', '200',
    'class', 'fn', 'let', 'var', 'if', 'else', 'try', 'catch',
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {snippets.map((s, i) => (
        <motion.span
          key={i}
          className="absolute font-mono text-xs text-primary/20 select-none"
          style={{
            left: `${5 + (i * 4.2) % 90}%`,
            top: `${3 + (i * 5.7) % 92}%`,
          }}
          animate={{
            y: [0, -20 - (i % 3) * 8, 0],
            opacity: [0.08, 0.35, 0.08],
          }}
          transition={{
            duration: 3.5 + (i % 5) * 0.6,
            repeat: Infinity,
            delay: i * 0.35,
            ease: 'easeInOut',
          }}
        >
          {s}
        </motion.span>
      ))}
    </div>
  )
}

// Animated background blobs that drift and pulse
function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Orange radial glow */}
      <div
        className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 opacity-20"
        style={{ background: 'radial-gradient(ellipse, #FCA311 0%, transparent 70%)' }}
      />

      {/* Drifting blobs */}
      <motion.div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ background: '#FCA311', width: 400, height: 400, left: '10%', top: '20%' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full opacity-10 blur-3xl"
        style={{ background: '#60A5FA', width: 350, height: 350, right: '5%', top: '40%' }}
        animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute rounded-full opacity-10 blur-3xl"
        style={{ background: '#A78BFA', width: 300, height: 300, left: '50%', bottom: '10%' }}
        animate={{ x: [0, 40, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  )
}

// A single letter that lifts — stays visible, springs up + gold on hover
function Letter({ children, delay = 0 }) {
  return (
    <motion.span
      className="inline-block will-change-transform"
      style={{ color: 'inherit' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        y: -10,
        scale: 1.12,
        color: '#FCA311',
        transition: { type: 'spring', stiffness: 500, damping: 18 },
      }}
    >
      {children === ' ' ? ' ' : children}
    </motion.span>
  )
}

// Headline where each word lifts as a unit on hover (feels more natural than per-letter)
function AnimatedHeadline({ text }) {
  const words = text.split(' ')
  return (
    <span>
      {words.map((word, i) => (
        <span key={i} className="inline-block whitespace-nowrap mr-[0.3em]">
          {word.split('').map((ch, j) => (
            <Letter key={j} delay={0.08 + (i * 3 + j) * 0.03}>
              {ch}
            </Letter>
          ))}
        </span>
      ))}
    </span>
  )
}

// APK download button with 3-second countdown
function DownloadApkButton({ className = '' }) {
  const [countdown, setCountdown] = useState(null) // null | 3 | 2 | 1 | 'done'
  const APK_URL = 'https://github.com/Sampath0411/Devsocio/releases/download/Devsocio/Devsocio.apk'

  const handleDownload = () => {
    if (countdown !== null) return // already running
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      // Open the link
      window.open(APK_URL, '_blank', 'noopener,noreferrer')
      setCountdown(null)
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  return (
    <motion.button
      onClick={handleDownload}
      whileHover={countdown === null ? { scale: 1.05 } : {}}
      whileTap={countdown === null ? { scale: 0.95 } : {}}
      disabled={countdown !== null}
      className={`btn inline-flex items-center gap-2 rounded-btn border-2 border-success/50 bg-success/10 px-6 py-2.5 text-sm font-bold text-success transition-all hover:bg-success/20 disabled:opacity-80 disabled:cursor-wait ${className}`}
    >
      {countdown === null ? (
        <>
          <Download size={16} />
          Download APK (Android)
        </>
      ) : (
        <>
          <Loader2 size={16} className="animate-spin" />
          Starting in {countdown}…
        </>
      )}
    </motion.button>
  )
}

// Download popup — shows app info + download CTA
function DownloadPopup({ open, onClose }) {
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute right-0 top-full z-50 mt-2 w-72 sm:w-80 rounded-card border border-border/60 p-5 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(26,43,78,0.97) 0%, rgba(20,33,61,0.98) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-text-muted hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Close"
      >
        <span className="text-sm leading-none">×</span>
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #FCA311, #E8920A)',
            boxShadow: '0 0 20px -4px rgba(252,163,17,0.5)',
          }}
        >
          <Download size={18} className="text-black" />
        </div>
        <div>
          <p className="font-display text-sm font-bold text-white">DevSocio App</p>
          <p className="text-xs text-text-muted">Android APK</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs text-text-muted">
        <p className="flex items-center gap-1.5">
          <span className="text-success">✓</span> Latest stable release
        </p>
        <p className="flex items-center gap-1.5">
          <span className="text-success">✓</span> No ads · No tracking
        </p>
        <p className="flex items-center gap-1.5">
          <span className="text-success">✓</span> Works offline for saved posts
        </p>
        <p className="flex items-center gap-1.5">
          <span className="text-success">✓</span> Push notifications for collabs
        </p>
      </div>

      {/* Download CTA */}
      <div className="mt-4">
        <DownloadApkButton className="w-full justify-center" />
      </div>

      <p className="mt-2 text-center text-xs text-text-muted">
        ·15 MB · Requires Android 8+
      </p>
    </motion.div>
  )
}

// Animated stat counter
function StatCard({ value, suffix = '', label, delay }) {
  const numeric = parseInt(value.replace(/[^0-9]/g, ''))
  const { count, ref } = useCounter(numeric)
  return (
    <motion.div {...fadeUp(delay)} ref={ref} className="card text-center group hover:border-primary/30 transition-all">
      <p className="font-display text-3xl font-extrabold text-primary sm:text-4xl">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-1 text-xs font-medium text-text-muted">{label}</p>
    </motion.div>
  )
}

const FEATURES = [
  {
    icon: Code2,
    title: 'Code-First Feed',
    desc: 'Share code snippets with syntax highlighting, project demos, technical opinions, and dev memes — all in a feed designed for how developers actually communicate.',
    color: '#FCA311',
  },
  {
    icon: Bot,
    title: 'AI-Powered Feedback',
    desc: 'Every post gets instant AI analysis: code quality scores, readability metrics, market viability for startup ideas, and constructive suggestions.',
    color: '#60A5FA',
  },
  {
    icon: Coins,
    title: 'Earn While You Build',
    desc: 'Credits system rewards quality contributions. Ship code, get likes, hit milestones, refer friends — all earn real platform credits.',
    color: '#FCA311',
  },
  {
    icon: Lightbulb,
    title: 'Ideas → MVP Pipeline',
    desc: 'Drop startup ideas on the Ideas Board. Get AI market scoring, find technical co-founders, and receive investment from the community.',
    color: '#A78BFA',
  },
  {
    icon: Handshake,
    title: 'Smart Collaboration',
    desc: 'AI-powered collab matching finds developers with complementary skills. Open a collab request, and earn bonus credits when you build together.',
    color: '#34D399',
  },
  {
    icon: Shield,
    title: 'Built for Developers',
    desc: 'Markdown support, code block syntax highlighting, GitHub integration, tech stack tags, developer levels — everything you expect, nothing you don\'t.',
    color: '#F87171',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Create your dev profile', desc: 'Showcase your tech stack, GitHub repos, dev level, and portfolio — not a generic resume.' },
  { step: '02', title: 'Share & get AI feedback', desc: 'Post code, projects, ideas, or opinions. AI analyzes every post for quality, humor, and market fit.' },
  { step: '03', title: 'Connect & collaborate', desc: 'AI matches you with complementary developers. Open collab requests and build together.' },
  { step: '04', title: 'Earn credits & grow', desc: 'Quality contributions earn credits. Unlock premium features, climb the leaderboard, get highlighted.' },
]

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Full-Stack Developer', text: 'DevSocio replaced LinkedIn and GitHub for me. I found my co-founder through the Ideas Board. The AI feedback on my React code actually helped me ship faster.' },
  { name: 'Alex M.', role: 'CS Student & Builder', text: 'As a student, the credits system is genius. I earn by sharing my learning journey, and the community is incredibly supportive. Way better than Twitter for devs.' },
  { name: 'Jordan K.', role: 'Senior Backend Engineer', text: 'Finally a social platform that speaks dev. Code blocks with proper syntax highlighting, AI code reviews, and zero corporate fluff. This is where I hang out now.' },
]

export default function Landing() {
  const [showDownload, setShowDownload] = useState(false)

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: '#000000' }}>

      {/* ── HEADER ── */}
      <header className="relative z-30 border-b border-border/50 backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/">
            <DevSocioLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted sm:flex">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#community" className="hover:text-white transition-colors">Community</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Download button + popup */}
            <div className="relative">
              <button
                onClick={() => setShowDownload((v) => !v)}
                className="hidden items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary sm:inline-flex transition-colors"
                aria-label="Download app"
              >
                <Download size={14} />
                Download
              </button>
              <DownloadPopup open={showDownload} onClose={() => setShowDownload(false)} />
            </div>
            <Link
              to="/login"
              className="hidden text-sm font-medium text-text-muted hover:text-white transition-colors sm:inline"
            >
              Log in
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/signup" className="btn-primary px-5 py-2 text-sm">
                Join Free
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:pt-28">
          {/* Animated background: grid + drifting blobs */}
          <HeroBackground />

          {/* Floating code particles */}
          <FloatingParticles />

          <div className="relative mx-auto max-w-4xl text-center">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Now in Public Beta — Join developers worldwide
            </motion.div>

            {/* Main headline — each letter lifts individually on hover */}
            <h1 className="mt-6 overflow-visible font-display text-5xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-white">
                <AnimatedHeadline text="The social network " />
              </span>
              <br className="hidden sm:block" />
              <span
                className="relative inline-block"
                style={{
                  background: 'linear-gradient(135deg, #FCA311 0%, #FDB340 50%, #E8920A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                <AnimatedHeadline text="built for developers" />
              </span>
              <span className="relative inline-block text-white ml-1">
                <AnimatedHeadline text="who ship." />
              </span>
              <br className="sm:hidden" />
            </h1>

            {/* Decorative glow behind the headline (doesn't affect text rendering) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-24 -z-10 h-40 w-[600px] -translate-x-1/2 opacity-30 sm:top-28"
              style={{ background: 'radial-gradient(ellipse, #FCA311 0%, transparent 70%)' }}
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.5 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted sm:text-xl"
            >
              Share your code, get AI-powered feedback, find collaborators,
              and earn credits — all on a platform that actually understands{' '}
              <span className="font-mono text-primary">developers</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/signup"
                  className="btn inline-flex items-center gap-2 rounded-btn bg-primary px-8 py-4 text-base font-bold text-black shadow-glow"
                >
                  <Rocket size={18} /> Join DevSocio — It's Free
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/login"
                  className="btn-ghost inline-flex items-center gap-2 px-8 py-4 text-base group"
                >
                  Sign in <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof avatars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <div className="flex -space-x-2.5">
                {[
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev1&backgroundColor=FCA311',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev2&backgroundColor=14213D',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev3&backgroundColor=FCA311',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev4&backgroundColor=1A2B4E',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev5&backgroundColor=FCA311',
                ].map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="h-9 w-9 rounded-full border-2"
                    style={{ borderColor: '#000000' }}
                  />
                ))}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-bold text-white">1,200+</span> developers already building in public
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="mx-auto max-w-5xl px-5 py-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard value="1200" suffix="+" label="Active Developers" delay={0} />
            <StatCard value="3500" suffix="+" label="Posts Shared" delay={0.05} />
            <StatCard value="850" suffix="+" label="Startup Ideas" delay={0.1} />
            <StatCard value="98" suffix="%" label="Positive Feedback" delay={0.15} />
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="section-badge">
              <Zap size={12} /> Why DevSocio
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Everything you need to{' '}
              <span style={{ color: '#FCA311' }}>build in public</span>
            </h2>
            <p className="mt-3 text-text-muted">
              From day-one portfolio building to finding your next co-founder — we've got you covered.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp(i * 0.07)}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group card cursor-default transition-all duration-300"
                style={{ '--feature-color': f.color }}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl"
                  style={{
                    background: `${f.color}18`,
                    border: `1px solid ${f.color}30`,
                    boxShadow: `0 0 20px -8px ${f.color}60`,
                  }}
                >
                  <f.icon size={22} style={{ color: f.color }} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
                <div
                  className="mt-4 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
                  style={{ background: f.color }}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="relative mx-auto max-w-7xl px-5 py-20">
          {/* Decorative glow */}
          <div
            className="pointer-events-none absolute right-0 top-1/2 -z-10 h-96 w-96 -translate-y-1/2 opacity-10"
            style={{ background: 'radial-gradient(closest-side, #FCA311, transparent)' }}
          />

          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="section-badge">
              <Star size={12} /> How It Works
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Start shipping in <span style={{ color: '#FCA311' }}>four steps</span>
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((h, i) => (
              <motion.div
                key={h.step}
                {...fadeUp(i * 0.08)}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="relative inline-block">
                  <span
                    className="font-display text-6xl font-extrabold"
                    style={{ color: 'rgba(252,163,17,0.15)' }}
                  >
                    {h.step}
                  </span>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div
                      className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-full lg:block"
                      style={{ width: 40 }}
                    >
                      <ArrowRight size={18} className="text-primary/30 mx-auto" />
                    </div>
                  )}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-white">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── POST TYPES SHOWCASE ── */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Six ways to post.{' '}
              <span style={{ color: '#FCA311' }}>AI superpowers</span> on every one.
            </h2>
            <p className="mt-3 text-text-muted">
              Each post type gets its own AI analysis — code quality, humor score, market viability, or readability.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POST_TYPES.map((p, i) => {
              const { Icon, tint } = TYPE_META[p.type]
              return (
                <motion.div
                  key={p.type}
                  {...fadeUp(i * 0.05)}
                  whileHover={{ x: 4 }}
                  className="card flex items-start gap-3 transition-all duration-200"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${tint}18`, color: tint, border: `1px solid ${tint}25` }}
                  >
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-white">{p.type}</p>
                    <p className="text-xs text-text-muted mt-0.5">{p.ai}</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto mt-1 shrink-0 text-primary/40" />
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="community" className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="section-badge">
              <Heart size={12} /> Developer Love
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What developers are <span style={{ color: '#FCA311' }}>saying</span>
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                {...fadeUp(i * 0.08)}
                whileHover={{ y: -3 }}
                className="card relative transition-all duration-300"
              >
                {/* Orange accent */}
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={12} fill="#FCA311" className="text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-text-secondary italic">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FCA311, #E8920A)' }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA BOTTOM ── */}
        <section className="mx-auto max-w-5xl px-5 py-20">
          <motion.div
            {...fadeUp()}
            className="relative overflow-hidden rounded-2xl p-10 text-center sm:p-16"
            style={{
              background: 'linear-gradient(135deg, #14213D 0%, #1A2B4E 50%, #14213D 100%)',
              border: '1px solid rgba(252,163,17,0.25)',
              boxShadow: '0 0 60px -20px rgba(252,163,17,0.3), inset 0 0 80px rgba(252,163,17,0.03)',
            }}
          >
            {/* Decorative rings */}
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full border border-primary/10" />
            <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full border border-primary/8" />
            <div
              className="absolute inset-0 opacity-5"
              style={{ background: 'radial-gradient(ellipse at center, #FCA311, transparent 70%)' }}
            />

            <div className="relative">
              <span className="section-badge mb-4 inline-flex">
                <Users size={12} /> Join the community
              </span>
              <h2 className="font-display text-3xl font-extrabold text-white sm:text-5xl">
                Ready to build in public?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-text-muted">
                Join with a referral and you both get{' '}
                <span className="font-bold text-primary">+150 credits</span> instantly.
                No credit card. No corporate BS. Just devs building together.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/signup"
                    className="btn inline-flex items-center gap-2 rounded-btn bg-primary px-8 py-3.5 text-base font-bold text-black shadow-glow"
                  >
                    <Rocket size={18} /> Get Started Free
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/explore"
                    className="btn inline-flex items-center gap-2 rounded-btn border-2 border-primary/30 px-8 py-3.5 text-base font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    Explore Community <ArrowRight size={16} />
                  </Link>
                </motion.div>
              </div>

              {/* Mobile ready badge + download */}
              <div className="mt-8 flex flex-col items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-3 rounded-xs border border-success/40 bg-success/10 px-4 py-2 text-sm text-success"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                  </span>
                  Mobile version ready — download APK
                </motion.div>
                <DownloadApkButton />
              </div>

              <p className="mt-6 text-xs text-text-muted">
                <Check size={12} className="inline mr-1 text-primary" />
                No credit card required ·{' '}
                <Check size={12} className="inline mr-1 text-primary" />
                Free forever tier ·{' '}
                <Check size={12} className="inline mr-1 text-primary" />
                Cancel anytime
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <DevSocioLogo size="md" />
              <p className="mt-3 text-xs text-text-muted leading-relaxed max-w-[200px]">
                Where developers live online. Share builds, find collaborators, get AI feedback — the social platform built for the global dev community.
              </p>
              <a
                href="https://github.com/Sampath0411/Devsocio"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs text-text-muted hover:text-primary transition-colors"
              >
                <GithubMark size={16} /> View on GitHub
              </a>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Product</h4>
              <div className="mt-4 space-y-2.5">
                {[
                  { to: '/feed', label: 'Feed' },
                  { to: '/explore', label: 'Explore' },
                  { to: '/ideas', label: 'Ideas Board' },
                  { to: '/credits', label: 'Credits' },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="block text-sm text-text-muted hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Company</h4>
              <div className="mt-4 space-y-2.5">
                <a href="#features" className="block text-sm text-text-muted hover:text-primary transition-colors">Features</a>
                <a href="#community" className="block text-sm text-text-muted hover:text-primary transition-colors">Community</a>
                <a href="https://github.com/Sampath0411/Devsocio" target="_blank" rel="noreferrer" className="block text-sm text-text-muted hover:text-primary transition-colors">GitHub</a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Legal</h4>
              <div className="mt-4 space-y-2.5">
                <span className="block text-sm text-text-muted">Privacy Policy</span>
                <span className="block text-sm text-text-muted">Terms of Service</span>
                <span className="block text-sm text-text-muted">Code of Conduct</span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-text-muted">
              © {new Date().getFullYear()} DevSocio. Built by developers, for developers.
            </p>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-text-muted">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
