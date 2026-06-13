import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { POST_TYPES, USERS } from '../data/mock'
import { Avatar, LevelBadge } from '../components/ui'
import { TYPE_META } from '../components/postTypes'
import { Code2, ImageIcon, Bot, Coins, Lightbulb, Rocket } from '../components/icons'

const FEATURES = [
  { Icon: ImageIcon, title: 'Instagram-style feed', desc: 'Code, projects, ideas, memes — a visual feed built for devs.' },
  { Icon: Bot, title: 'AI collab matching', desc: 'Find complementary devs and get instant feedback on your ideas.' },
  { Icon: Coins, title: 'Credits & Refer-and-Earn', desc: 'Earn credits for shipping, unlock perks, climb the leaderboard.' },
  { Icon: Lightbulb, title: 'Ideas Board', desc: 'Drop a startup idea, get an AI market score, find a co-founder.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-card bg-primary text-white"><Code2 size={18} /></span>
          <span className="font-display text-xl font-extrabold">DevSocio</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">Log in</Link>
          <Link to="/signup" className="btn-primary">Join DevSocio</Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[700px] -translate-x-1/2 opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #6C63FF55, transparent)' }} />
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="pill border border-border bg-surface text-accent">
          <Rocket size={12} /> Now in beta — built for the global dev community
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mx-auto mt-5 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">
          Where developers <span className="text-primary">live</span> online.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mx-auto mt-5 max-w-xl text-lg text-text-muted">
          The best of Instagram, GitHub and LinkedIn — without the corporate stiffness.
          Share your builds, roast some code, find collaborators, and grow together.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="btn-primary px-7 py-3 text-base">Join DevSocio — it’s free</Link>
          <Link to="/login" className="btn-ghost px-7 py-3 text-base">Log in →</Link>
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="flex -space-x-3">
            {USERS.map((u) => <Avatar key={u.uid} src={u.avatar} alt={u.displayName} size={36} ring />)}
          </div>
          <p className="text-sm text-text-muted">1,000+ devs already building in public</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card hover:border-primary/50">
              <span className="grid h-11 w-11 place-items-center rounded-card bg-primary/10 text-primary"><f.Icon size={22} /></span>
              <h3 className="mt-3 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="text-center font-display text-2xl font-bold">Six ways to post. Each one gets AI superpowers.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POST_TYPES.map((p) => {
            const { Icon, tint } = TYPE_META[p.type]
            return (
              <div key={p.type} className="card flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card" style={{ backgroundColor: `${tint}1a`, color: tint }}>
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-semibold">{p.type}</p>
                  <p className="text-xs text-accent">{p.ai}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-6 text-center font-display text-2xl font-bold">Meet some of the community</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {USERS.slice(0, 4).map((u) => (
            <div key={u.uid} className="card text-center">
              <div className="flex justify-center"><Avatar src={u.avatar} alt={u.displayName} size={64} /></div>
              <p className="mt-2 font-semibold">{u.displayName}</p>
              <p className="text-xs text-text-muted">@{u.username}</p>
              <div className="mt-2 flex justify-center"><LevelBadge level={u.devLevel} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <div className="card border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5 py-12">
          <h2 className="font-display text-3xl font-extrabold">Your dev community is waiting.</h2>
          <p className="mx-auto mt-3 max-w-md text-text-muted">
            Join with a referral and you both get <span className="text-warning">+150 credits</span> instantly.
          </p>
          <Link to="/signup" className="btn-primary mt-6 px-8 py-3 text-base">Get started</Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        DevSocio — Where Developers Live Online · Prototype built from PRD v1.0
      </footer>
    </div>
  )
}
