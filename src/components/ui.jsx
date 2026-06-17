import { motion } from 'framer-motion'
import { STACK_COLORS, DEV_LEVELS } from '../data/mock'
import { PLATFORM_LABEL } from '../lib/links'
import { isFounder } from '../lib/auth'
import { Heart, Sparkles, Circle, BadgeCheck, Shield, GithubMark, Link2, Crown } from './icons'

// ---------- Social links row (icon auto-detected from the URL) ----------
const PLATFORM_ICON = {
  github: GithubMark,
  // lucide doesn't ship brand glyphs for all of these, so use a link glyph
  // tinted per-platform; GitHub keeps its brand mark.
}
const PLATFORM_COLOR = {
  github: '#FFFFFF', linkedin: '#0A66C2', twitter: '#1DA1F2',
  instagram: '#E1306C', youtube: '#FF0000', devto: '#8888AA', portfolio: '#00E5FF', link: '#00E5FF',
}

export function SocialLinks({ links }) {
  const entries = Object.values(links || {}).filter((l) => l && l.url)
  if (!entries.length) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {entries.map((l) => {
        const Icon = PLATFORM_ICON[l.platform] || Link2
        const color = PLATFORM_COLOR[l.platform] || '#00E5FF'
        return (
          <a key={l.platform + l.url} href={l.url} target="_blank" rel="noreferrer"
            className="pill border border-border hover:border-primary/50" style={{ color }}
            title={PLATFORM_LABEL[l.platform] || 'Link'}>
            <Icon size={13} /> {l.handle || PLATFORM_LABEL[l.platform]}
          </a>
        )
      })}
    </div>
  )
}

// ---------- Verified tick (blue) + moderator badge (PRD §5.2 / §7.4) ----------
export function VerifiedTick({ size = 16 }) {
  return (
    <span title="Verified" className="inline-grid place-items-center text-accent align-middle">
      <BadgeCheck size={size} fill="currentColor" className="text-accent" stroke="#0D0D0D" strokeWidth={2.2} />
    </span>
  )
}

export function ModBadge() {
  return (
    <span className="pill border border-success/40 bg-success/10 text-success" title="Moderator">
      <Shield size={11} /> Mod
    </span>
  )
}

// ---------- Founder / Owner badge — the platform owner, shown to everyone ----------
export function FounderBadge({ size = 11 }) {
  return (
    <span
      className="pill border font-semibold"
      style={{
        color: '#FFD66B',
        borderColor: '#FFD66B66',
        background: 'linear-gradient(90deg, rgba(255,214,107,0.18), rgba(255,138,76,0.18))',
      }}
      title="Founder · DevSocio Owner"
    >
      <Crown size={size} fill="currentColor" /> Founder
    </span>
  )
}

// A gradient-gold treatment for the owner's display name.
export function FounderName({ children, className = '' }) {
  return (
    <span
      className={`bg-clip-text font-bold text-transparent ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg,#FFD66B,#FF8A4C)' }}
    >
      {children}
    </span>
  )
}

// Name + inline badges, reused across cards/profile. The owner gets a gold
// name, a crown, and the Founder badge so every user can recognise them.
export function NameWithBadges({ user, className = '' }) {
  const founder = isFounder(user)
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {founder ? <FounderName>{user?.displayName}</FounderName> : user?.displayName}
      {founder && <Crown size={14} fill="currentColor" className="text-[#FFD66B]" />}
      {user?.verified && <VerifiedTick size={15} />}
      {user?.moderator && !founder && <Shield size={13} className="text-success" />}
    </span>
  )
}

// ---------- Tech-stack pill (PRD §3.2.1) ----------
export function StackPill({ name }) {
  const color = STACK_COLORS[name] || '#8888AA'
  return (
    <span
      className="pill border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
    >
      {name}
    </span>
  )
}

// ---------- Dev-level badge (PRD §3.2.1) ----------
export function LevelBadge({ level }) {
  const l = DEV_LEVELS[level] || DEV_LEVELS.Builder
  return (
    <span
      className="pill border font-semibold"
      style={{ color: l.color, borderColor: `${l.color}55`, backgroundColor: `${l.color}14` }}
    >
      <Circle size={7} fill="currentColor" strokeWidth={0} />
      {level}
    </span>
  )
}

// ---------- AI Generated badge (PRD §4.3) ----------
export function AIBadge({ children }) {
  return (
    <span className="pill border border-accent/40 bg-accent/10 text-accent">
      <Sparkles size={11} />
      {children || 'AI Generated'}
    </span>
  )
}

export function Avatar({ src, alt, size = 40, ring, founder }) {
  const img = (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full bg-bg object-cover shrink-0 ${
        ring ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : ''
      }`}
    />
  )
  // Owner gets a gold gradient ring around the avatar, visible to everyone.
  if (founder) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full p-[2px]"
        style={{ background: 'linear-gradient(135deg,#FFD66B,#FF8A4C)' }}
      >
        {img}
      </span>
    )
  }
  return img
}

// ---------- Loaders (PRD §6.5) ----------

// §6.5.5 — infinite scroll: 3 bouncing dots
export function BouncingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-bounce-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  )
}

// §6.5.2 — feed skeleton card
export function PostSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-2.5 w-20" />
        </div>
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="skeleton h-40 w-full rounded-card" />
    </div>
  )
}

// §6.5.3 — AI processing loader: pulsing purple ring + cycling text
export function AILoader({ label = 'Thinking…' }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-text-muted">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full bg-primary/40 animate-pulse-ring" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      {label}
    </div>
  )
}

// ---------- Heart like button w/ particle burst (PRD §6.6) ----------
export function LikeButton({ liked, count, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`group relative flex items-center gap-1.5 transition-colors ${
        liked ? 'text-danger' : 'text-text-muted hover:text-danger'
      }`}
      aria-pressed={liked}
      aria-label="Like"
    >
      <span className="relative">
        <motion.span
          key={liked ? 'on' : 'off'}
          initial={{ scale: 1 }}
          animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
          className="block"
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </motion.span>
        {liked && (
          <span className="pointer-events-none absolute inset-0">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-0 animate-float-up text-danger"
                style={{ transform: `translateX(${(i - 2) * 7}px)`, animationDelay: `${i * 40}ms` }}
              >
                <Heart size={8} fill="currentColor" />
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="text-sm tabular-nums">{count}</span>
    </button>
  )
}

// ---------- Empty state (PRD §6.7) ----------
export function EmptyState({ icon: Icon, title, cta, onCta }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-14 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-bg text-text-muted">
          <Icon size={22} />
        </span>
      )}
      <p className="max-w-xs text-sm text-text-muted">{title}</p>
      {cta && (
        <button className="btn-primary mt-1" onClick={onCta}>
          {cta}
        </button>
      )}
    </div>
  )
}

// Decorative gradient block used as stand-in for uploaded images.
export function GradientBlock({ variant = 'gradient-sky', label }) {
  const gradients = {
    'gradient-sky': 'linear-gradient(135deg,#6C63FF,#00E5FF)',
    'gradient-meme': 'linear-gradient(135deg,#FF4C4C,#FFB800)',
    'gradient-default': 'linear-gradient(135deg,#16161E,#2A2A3D)',
  }
  return (
    <div
      className="flex h-52 w-full items-center justify-center rounded-card text-sm font-semibold text-white/80"
      style={{ background: gradients[variant] || gradients['gradient-default'] }}
    >
      {label}
    </div>
  )
}
