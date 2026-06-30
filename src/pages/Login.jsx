import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useToast } from '../components/Toast'
import { emailLogin, googleLogin, githubLogin, authErrorMessage, resetPassword } from '../lib/auth'
import { GithubMark, GoogleMark, Rocket, Eye, EyeOff, Mail, Lock } from '../components/icons'
import DevSocioLogo from '../components/Logo'

export default function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const sendReset = async (e) => {
    e?.preventDefault()
    if (resetting) return
    setResetting(true)
    try {
      await resetPassword(resetEmail || form.email)
      toast('Reset link sent — check your email', { tone: 'success' })
      setShowReset(false)
    } catch (err) {
      toast(authErrorMessage(err), { tone: 'warning' })
    } finally {
      setResetting(false)
    }
  }

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
      toast('Welcome back to DevSocio 🚀', { icon: Rocket })
      navigate('/feed')
    } catch (err) {
      toast(authErrorMessage(err), { tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your DevSocio account">
      <div className="space-y-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          onClick={() => run(githubLogin)}
          className="btn-ghost w-full justify-center"
        >
          <GithubMark /> Continue with GitHub
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          onClick={() => run(googleLogin)}
          className="btn-ghost w-full justify-center"
        >
          <GoogleMark /> Continue with Google
        </motion.button>
      </div>

      <Divider />

      <form onSubmit={(e) => { e.preventDefault(); run(() => emailLogin(form)) }} className="space-y-3">
        <div className="relative">
          <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            type="email"
            placeholder="you@dev.com"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="relative">
          <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9 pr-10"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div className="flex items-center justify-end text-xs text-text-muted">
          <button
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => { setShowReset((v) => !v); setResetEmail(form.email) }}
          >
            Forgot password?
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={busy}
          className="btn-primary w-full justify-center"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Logging in…
            </span>
          ) : 'Log in'}
        </motion.button>
      </form>

      {showReset && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 rounded-card border border-primary/25 p-3"
          style={{ background: 'rgba(252,163,17,0.05)' }}
        >
          <p className="text-xs text-text-muted">Enter your email and we'll send a reset link.</p>
          <div className="flex gap-2">
            <input
              className="input text-sm"
              type="email"
              placeholder="you@dev.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={sendReset}
              disabled={!resetEmail.trim() || resetting}
              className="btn-primary shrink-0 text-sm !px-3"
            >
              {resetting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </motion.div>
      )}

      <p className="text-center text-sm text-text-muted">
        New here?{' '}
        <Link to="/signup" className="font-bold text-primary hover:underline">Join DevSocio</Link>
      </p>
    </AuthShell>
  )
}

// Shared auth shell — full-width layout with side-by-side on desktop
export function AuthShell({ title, subtitle, children }) {
  return (
    <div
      className="relative flex min-h-screen flex-col-reverse md:flex-row"
      style={{ background: '#000000' }}
    >
      {/* Left decorative panel — hidden on mobile */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-20" />
      <div
        className="pointer-events-none fixed left-1/4 top-1/4 -z-10 hidden h-[500px] w-[500px] -translate-x-1/2 opacity-20 blur-3xl md:block"
        style={{ background: 'radial-gradient(closest-side, #FCA311, transparent)' }}
      />

      {/* Brand / left side */}
      <div className="hidden w-1/2 flex-col items-center justify-center px-16 md:flex">
        <Link to="/" className="mb-8">
          <DevSocioLogo size="xl" />
        </Link>
        <motion.h2
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-4xl font-extrabold leading-tight text-white lg:text-5xl"
        >
          Where <span style={{ color: '#FCA311' }}>developers</span>
          <br /> live online.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 max-w-md text-lg text-text-muted"
        >
          Share your builds. Find collaborators.
          Get AI feedback. Earn credits.
        </motion.p>
        {/* Floating code snippets decoration */}
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 opacity-30">
          {['const', '=>', 'async', '<Code/>', 'useState()', 'ship()', 'git push', 'PR merged'].map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.4, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
              className="font-mono text-sm text-primary"
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Right side — form card */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile logo (md:hidden) */}
          <Link to="/" className="flex justify-center md:hidden">
            <DevSocioLogo size="lg" />
          </Link>

          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
            <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
          </div>

          <div
            className="rounded-2xl border border-border p-6 space-y-4 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(26,43,78,0.8) 0%, rgba(20,33,61,0.95) 100%)',
              boxShadow: '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(252,163,17,0.06)',
            }}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-text-muted">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
