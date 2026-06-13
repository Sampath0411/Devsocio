import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, StackPill, AILoader } from '../components/ui'
import { generateBio } from '../lib/ai'
import { STACK_COLORS } from '../data/mock'
import { Sparkles, Camera, Handshake, Rocket } from '../components/icons'

const STACK_OPTIONS = Object.keys(STACK_COLORS)

export default function EditProfile() {
  const { user, saveProfileFields } = useStore()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    techStack: user?.techStack || [],
    openToCollab: user?.openToCollab ?? false,
    lookingForCofounder: user?.lookingForCofounder ?? false,
  })
  const [genning, setGenning] = useState(false)

  const toggleStack = (s) =>
    setForm((f) => ({
      ...f,
      techStack: f.techStack.includes(s) ? f.techStack.filter((x) => x !== s) : [...f.techStack, s],
    }))

  // AI bio generator (PRD §4.1) — real OpenRouter call, local fallback on error.
  const genBio = async () => {
    setGenning(true)
    try {
      const bio = await generateBio({
        techStack: form.techStack,
        devLevel: user?.devLevel,
        lookingForCofounder: form.lookingForCofounder,
      })
      setForm((f) => ({ ...f, bio }))
      toast('AI bio generated', { icon: Sparkles })
    } catch {
      const bio = `${form.techStack.slice(0, 3).join(' · ')} dev who ships in public. ${
        form.lookingForCofounder ? 'On the hunt for a co-founder.' : 'Always down to collab.'
      }`.slice(0, 160)
      setForm((f) => ({ ...f, bio }))
      toast('AI offline — used a quick bio', { tone: 'warning' })
    } finally {
      setGenning(false)
    }
  }

  const save = async () => {
    await saveProfileFields(form) // write-through to Firestore
    toast('Profile saved', { tone: 'success' })
    navigate(`/profile/${user.username}`)
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 font-display text-xl font-bold">Edit Profile</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={user?.avatar} alt="you" size={72} />
          <button className="btn-ghost text-xs"><Camera size={14} /> Change photo</button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Display name</label>
          <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-text-muted">Bio ({form.bio.length}/160)</label>
            <button onClick={genBio} disabled={genning} className="btn-accent !px-3 !py-1 text-xs"><Sparkles size={13} /> Generate Bio</button>
          </div>
          <textarea maxLength={160} className="input min-h-[72px] resize-none" value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          {genning && <div className="mt-2"><AILoader label="Writing your bio…" /></div>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Tech stack</label>
          <div className="flex flex-wrap gap-1.5">
            {STACK_OPTIONS.map((s) => {
              const active = form.techStack.includes(s)
              return (
                <button key={s} onClick={() => toggleStack(s)} className={active ? '' : 'opacity-40 hover:opacity-80'}>
                  <StackPill name={s} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Toggle Icon={Handshake} label="Open to Collab" on={form.openToCollab}
            onChange={() => setForm((f) => ({ ...f, openToCollab: !f.openToCollab }))} />
          <Toggle Icon={Rocket} label="Looking for Co-founder" on={form.lookingForCofounder}
            onChange={() => setForm((f) => ({ ...f, lookingForCofounder: !f.lookingForCofounder }))} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Save</button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ Icon, label, on, onChange }) {
  return (
    <button onClick={onChange} className="flex w-full items-center justify-between rounded-input border border-border px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2"><Icon size={15} /> {label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-success' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
