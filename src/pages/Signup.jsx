import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { emailSignup, googleLogin, githubLogin, authErrorMessage } from '../lib/auth'
import { earnCredits } from '../lib/credits'
import { AuthShell, Divider } from './Login'
import { StackPill } from '../components/ui'
import { STACK_COLORS } from '../data/mock'
import { GithubMark, GoogleMark, Coins, Gift } from '../components/icons'

const LEVELS = ['Beginner', 'Builder', 'Senior', 'Founder']
const STACK_OPTIONS = Object.keys(STACK_COLORS)

export default function Signup() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', username: '', displayName: '',
    devLevel: 'Builder', techStack: ['React'], ref: ref || '',
  })

  const toggleStack = (s) =>
    setForm((f) => ({
      ...f,
      techStack: f.techStack.includes(s) ? f.techStack.filter((x) => x !== s) : [...f.techStack, s],
    }))

  // Trigger the server-side referral payout (+150 to both) once signed in.
  const claimReferral = async () => {
    if (!form.ref) return
    try {
      const { awarded } = await earnCredits('referral_signup')
      if (awarded) toast('+150 referral bonus applied!', { tone: 'success' })
    } catch {
      /* server not configured yet — referral applies once it is */
    }
  }

  const oauth = async (fn) => {
    setBusy(true)
    try {
      await fn({ referredBy: form.ref || null })
      toast('+100 credits — welcome to DevSocio!', { icon: Coins })
      await claimReferral()
      navigate('/feed')
    } catch (err) {
      toast(authErrorMessage(err), { tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await emailSignup({ ...form, referredBy: form.ref || null })
      toast('+100 credits — welcome to DevSocio!', { icon: Coins })
      await claimReferral()
      navigate('/feed')
    } catch (err) {
      toast(authErrorMessage(err), { tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Join DevSocio" subtitle="Create your developer profile in seconds">
      {ref && (
        <div className="flex items-center gap-2 rounded-input border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          <Gift size={14} /> Referral <b>{ref}</b> applied — you both get +150 credits!
        </div>
      )}

      <button disabled={busy} onClick={() => oauth(githubLogin)} className="btn-ghost w-full justify-center">
        <GithubMark /> Sign up with GitHub
      </button>
      <button disabled={busy} onClick={() => oauth(googleLogin)} className="btn-ghost w-full justify-center">
        <GoogleMark /> Sign up with Google
      </button>

      <Divider />

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="input" placeholder="Display name" value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>
        <input className="input" type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="password" placeholder="Password (min 6 chars)" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-muted">Dev level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {LEVELS.map((l) => (
              <button type="button" key={l} onClick={() => setForm({ ...form, devLevel: l })}
                className={`rounded-input border px-2 py-2 text-xs font-semibold transition-colors ${
                  form.devLevel === l ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-text-muted hover:border-primary/40'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-muted">Tech stack</p>
          <div className="flex flex-wrap gap-1.5">
            {STACK_OPTIONS.map((s) => {
              const active = form.techStack.includes(s)
              return (
                <button type="button" key={s} onClick={() => toggleStack(s)}
                  className={active ? '' : 'opacity-40 hover:opacity-80'}>
                  <StackPill name={s} />
                </button>
              )
            })}
          </div>
        </div>

        <input className="input" placeholder="Referral code (optional)" value={form.ref}
          onChange={(e) => setForm({ ...form, ref: e.target.value })} />

        <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
