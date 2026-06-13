import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { emailLogin, googleLogin, githubLogin, authErrorMessage } from '../lib/auth'
import { GithubMark, GoogleMark, Code2, Rocket } from '../components/icons'

export default function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
      toast('Welcome back to DevSocio', { icon: Rocket })
      navigate('/feed')
    } catch (err) {
      toast(authErrorMessage(err), { tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your DevSocio account">
      <button disabled={busy} onClick={() => run(githubLogin)} className="btn-ghost w-full justify-center">
        <GithubMark /> Continue with GitHub
      </button>
      <button disabled={busy} onClick={() => run(googleLogin)} className="btn-ghost w-full justify-center">
        <GoogleMark /> Continue with Google
      </button>

      <Divider />

      <form onSubmit={(e) => { e.preventDefault(); run(() => emailLogin(form)) }} className="space-y-3">
        <input
          className="input" type="email" placeholder="you@dev.com" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input" type="password" placeholder="Password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="flex items-center justify-between text-xs text-text-muted">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-primary" defaultChecked /> Remember me
          </label>
          <button type="button" className="hover:text-accent">Forgot password?</button>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-text-muted">
        New here? <Link to="/signup" className="font-semibold text-primary hover:underline">Join DevSocio</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div
        className="pointer-events-none fixed left-1/2 top-1/4 -z-10 h-96 w-96 -translate-x-1/2 opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side,#6C63FF,transparent)' }}
      />
      <div className="w-full max-w-sm space-y-5">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-card bg-primary text-white">
            <Code2 size={20} />
          </span>
          <span className="font-display text-2xl font-extrabold">DevSocio</span>
        </Link>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        <div className="card space-y-3">{children}</div>
      </div>
    </div>
  )
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-text-muted">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  )
}
