import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { POST_TYPES } from '../data/mock'
import { TYPE_META } from '../components/postTypes'
import {
  Code2, Bot, Coins, Lightbulb, Rocket,
  Shield, ArrowRight, GithubMark,
  Check, Heart, Handshake,
} from '../components/icons'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

const FEATURES = [
  {
    icon: Code2,
    title: 'Code-First Feed',
    desc: 'Share code snippets with syntax highlighting, project demos, technical opinions, and dev memes — all in a feed designed for how developers actually communicate.',
  },
  {
    icon: Bot,
    title: 'AI-Powered Feedback',
    desc: 'Every post gets instant AI analysis: code quality scores, readability metrics, market viability for startup ideas, and constructive suggestions.',
  },
  {
    icon: Coins,
    title: 'Earn While You Build',
    desc: 'Credits system rewards quality contributions. Ship code, get likes, hit milestones, refer friends — all earn real platform credits.',
  },
  {
    icon: Lightbulb,
    title: 'Ideas → MVP Pipeline',
    desc: 'Drop startup ideas on the Ideas Board. Get AI market scoring, find technical co-founders, and receive investment from the community.',
  },
  {
    icon: Handshake,
    title: 'Smart Collaboration',
    desc: 'AI-powered collab matching finds developers with complementary skills. Open a collab request, and earn bonus credits when you build together.',
  },
  {
    icon: Shield,
    title: 'Built for Developers',
    desc: 'Markdown support, code block syntax highlighting, GitHub integration, tech stack tags, developer levels — everything you expect, nothing you don\'t.',
  },
]

const STATS = [
  { value: '1,200+', label: 'Active Developers' },
  { value: '3,500+', label: 'Posts Shared' },
  { value: '850+', label: 'Startup Ideas' },
  { value: '98%', label: 'Positive Feedback' },
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
  return (
    <div className="min-h-screen overflow-hidden">
      {/* ── HEADER ── */}
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <Code2 size={20} />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Dev<span className="text-primary">Socio</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted sm:flex">
          <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
          <a href="#community" className="hover:text-text-primary transition-colors">Community</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors hidden sm:inline">Log in</Link>
          <Link to="/signup" className="btn-primary px-5 py-2 text-sm">Join DevSocio</Link>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-12 sm:pt-20">
          {/* Animated background glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 opacity-35"
            style={{ background: 'radial-gradient(closest-side, #00799177 0%, #439a8644 40%, transparent 70%)' }} />

          <div className="mx-auto max-w-4xl text-center">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Now in Public Beta — Join 1,200+ developers
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-7xl"
            >
              The social network{' '}
              <span className="bg-brand-gradient bg-clip-text text-transparent">built for</span>
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent">developers</span>
              {' '}who ship.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl"
            >
              Share your code, get AI-powered feedback, find collaborators,
              and earn credits — all on a platform that actually understands{' '}
              <span className="font-mono text-primary">developers</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link to="/signup" className="btn-gold px-8 py-3.5 text-base">
                <Rocket size={18} /> Join DevSocio — It's Free
              </Link>
              <Link to="/login" className="btn-ghost px-8 py-3.5 text-base group">
                Sign in <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <div className="flex -space-x-2">
                {[
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev1&backgroundColor=007991',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev2&backgroundColor=439a86',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev3&backgroundColor=222e50',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev4&backgroundColor=e9d985',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=dev5&backgroundColor=bcd8c1',
                ].map((url, i) => (
                  <img key={i} src={url} alt="" className="h-9 w-9 rounded-full border-2 border-bg ring-1 ring-border" />
                ))}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-primary">1,200+</span> developers already building in public
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="mx-auto max-w-5xl px-5 py-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <motion.div key={s.label} {...fadeUp()} className="card text-center">
                <p className="font-display text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-text-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section id="features" className="mx-auto max-w-7xl px-5 py-16">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="pill border border-primary/30 bg-primary/10 text-primary text-xs">Why DevSocio</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to{' '}
              <span className="bg-brand-gradient bg-clip-text text-transparent">build in public</span>
            </h2>
            <p className="mt-3 text-text-muted">
              From day-one portfolio building to finding your next co-founder — we've got you covered.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp(i * 0.06)}
                className="group card hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="relative mx-auto max-w-7xl px-5 py-16">
          {/* Section glow */}
          <div className="pointer-events-none absolute right-0 top-1/2 -z-10 h-96 w-96 -translate-y-1/2 opacity-20"
            style={{ background: 'radial-gradient(closest-side, #439a86, transparent)' }} />

          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="pill border border-accent/30 bg-accent/10 text-accent text-xs">How It Works</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Start shipping in <span className="text-accent">four steps</span>
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((h, i) => (
              <motion.div key={h.step} {...fadeUp(i * 0.08)} className="relative text-center">
                <span className="inline-block font-display text-5xl font-extrabold text-primary/20">{h.step}</span>
                <h3 className="mt-2 font-display text-lg font-bold">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{h.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="mt-6 hidden lg:block">
                    <ArrowRight size={20} className="mx-auto text-primary/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── POST TYPES SHOWCASE ── */}
        <section className="mx-auto max-w-7xl px-5 py-16">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Six ways to post.{' '}
              <span className="text-gold">AI superpowers</span> on every one.
            </h2>
            <p className="mt-3 text-text-muted">Each post type gets its own AI analysis — code quality, humor score, market viability, or readability.</p>
          </motion.div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POST_TYPES.map((p, i) => {
              const { Icon, tint } = TYPE_META[p.type]
              return (
                <motion.div key={p.type} {...fadeUp(i * 0.05)} className="card flex items-start gap-3 hover:border-primary/30 transition-all">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${tint}18`, color: tint }}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{p.type}</p>
                    <p className="text-xs text-text-muted mt-0.5">{p.ai}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="community" className="mx-auto max-w-7xl px-5 py-16">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <span className="pill border border-gold/30 bg-gold/10 text-gold text-xs">Developer Love</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              What developers are{' '}
              <span className="text-gold">saying</span>
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...fadeUp(i * 0.08)} className="card relative">
                <Heart size={18} className="text-danger/40 absolute top-4 right-4" fill="currentColor" />
                <p className="text-sm leading-relaxed text-text-secondary italic">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA BOTTOM ── */}
        <section className="mx-auto max-w-4xl px-5 py-16">
          <motion.div {...fadeUp()} className="relative overflow-hidden rounded-2xl border border-primary/30 bg-brand-gradient p-10 text-center sm:p-16">
            {/* Decorative rings */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold text-white sm:text-5xl">
                Ready to build in public?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-base text-white/80">
                Join with a referral and you both get{' '}
                <span className="font-bold text-gold">+150 credits</span> instantly.
                No credit card. No corporate BS. Just devs building together.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/signup" className="btn inline-flex items-center gap-2 rounded-btn bg-white px-8 py-3.5 text-base font-bold text-indigo shadow-glow-gold hover:bg-gold transition-colors">
                  <Rocket size={18} /> Get Started Free
                </Link>
                <Link to="/explore" className="btn inline-flex items-center gap-2 rounded-btn border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors">
                  Explore Community <ArrowRight size={16} />
                </Link>
              </div>
              <p className="mt-6 text-xs text-white/50">
                <Check size={12} className="inline mr-1" /> No credit card required · Free forever tier · Cancel anytime
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white">
                  <Code2 size={16} />
                </span>
                <span className="font-display text-lg font-extrabold">DevSocio</span>
              </div>
              <p className="mt-3 text-xs text-text-muted leading-relaxed">
                Where developers live online. Share builds, find collaborators, get AI feedback — the social platform built for the global dev community.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Product</h4>
              <div className="mt-3 space-y-2">
                <Link to="/feed" className="block text-sm text-text-secondary hover:text-primary transition-colors">Feed</Link>
                <Link to="/explore" className="block text-sm text-text-secondary hover:text-primary transition-colors">Explore</Link>
                <Link to="/ideas" className="block text-sm text-text-secondary hover:text-primary transition-colors">Ideas Board</Link>
                <Link to="/credits" className="block text-sm text-text-secondary hover:text-primary transition-colors">Credits</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Company</h4>
              <div className="mt-3 space-y-2">
                <a href="#features" className="block text-sm text-text-secondary hover:text-primary transition-colors">Features</a>
                <a href="#community" className="block text-sm text-text-secondary hover:text-primary transition-colors">Community</a>
                <a href="https://github.com/Sampath0411/Devsocio" target="_blank" rel="noreferrer" className="block text-sm text-text-secondary hover:text-primary transition-colors">GitHub</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Legal</h4>
              <div className="mt-3 space-y-2">
                <span className="block text-sm text-text-muted">Privacy Policy</span>
                <span className="block text-sm text-text-muted">Terms of Service</span>
                <span className="block text-sm text-text-muted">Code of Conduct</span>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} DevSocio. Built by developers, for developers.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/Sampath0411/Devsocio" target="_blank" rel="noreferrer" className="text-text-muted hover:text-primary transition-colors">
                <GithubMark size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
