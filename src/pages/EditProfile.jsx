import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, StackPill, AILoader } from '../components/ui'
import GithubManager from '../components/GithubManager'
import { generateBio } from '../lib/ai'
import { uploadImage, cloudinaryConfigured } from '../lib/upload'
import { detectLink } from '../lib/links'
import { STACK_COLORS } from '../data/mock'
import { Sparkles, Camera, Handshake, Rocket, Plus, X } from '../components/icons'

// Preset banner gradients users can pick (PRD §3.2.1 cover photo).
const BANNERS = [
  'linear-gradient(135deg, #14213D, #0D1628)',
  'linear-gradient(135deg, #14213D, #FCA311)',
  'linear-gradient(135deg, #FCA311, #E8920A)',
  'linear-gradient(135deg, #0D1628, #14213D)',
  'linear-gradient(135deg, #1A2B4E, #FCA311)',
  'linear-gradient(135deg, #14213D, #1A2B4E, #FCA311)',
]

const STACK_OPTIONS = Object.keys(STACK_COLORS)

export default function EditProfile() {
  const { user, saveProfileFields } = useStore()
  const toast = useToast()
  const navigate = useNavigate()

  // form is null until the profile loads, so we never write empty defaults
  // back to Firestore on a cold open before the user snapshot arrives.
  const [form, setForm] = useState(null)
  const [genning, setGenning] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [linkInput, setLinkInput] = useState('')

  // Hydrate the form when the profile becomes available; never overwrite an
  // in-progress edit once initialized.
  useEffect(() => {
    if (form || !user) return
    setForm({
      displayName: user.displayName || '',
      bio: user.bio || '',
      techStack: user.techStack || [],
      avatar: user.avatar || '',
      coverUrl: user.coverUrl || '',
      banner: user.banner || '',
      links: user.links || {},
      projects: user.projects || [],
      openToCollab: user.openToCollab ?? false,
      lookingForCofounder: user.lookingForCofounder ?? false,
    })
  }, [user, form])

  // Add a pasted social/portfolio URL → auto-detect platform + handle.
  const addLink = () => {
    const detected = detectLink(linkInput)
    if (!detected) return
    setForm((f) => ({ ...f, links: { ...f.links, [detected.platform]: detected } }))
    setLinkInput('')
  }
  const removeLink = (platform) =>
    setForm((f) => {
      const next = { ...f.links }
      delete next[platform]
      return { ...f, links: next }
    })

  // GitHub link + featured projects are managed by <GithubManager/>.
  const setGithubLink = (link) =>
    setForm((f) => {
      const next = { ...f.links }
      if (link) next.github = link
      else delete next.github
      return { ...f, links: next }
    })
  const setProjects = (projects) => setForm((f) => ({ ...f, projects }))

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, avatar: url }))
      toast('Photo uploaded', { tone: 'success' })
    } catch {
      toast('Upload failed — paste an image URL instead', { tone: 'warning' })
    } finally {
      setUploadingPhoto(false)
    }
  }

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
    if (!form || !user?.username) return
    await saveProfileFields(form) // write-through to Firestore
    toast('Profile saved', { tone: 'success' })
    navigate(`/profile/${user.username}`)
  }

  if (!form) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <h1 className="mb-4 font-display text-xl font-bold">Edit Profile</h1>
        <div className="card"><AILoader label="Loading your profile…" /></div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 font-display text-xl font-bold">Edit Profile</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={form.avatar || user?.avatar} alt="you" size={72} />
          <div className="flex-1 space-y-2">
            {cloudinaryConfigured() && (
              <label className="btn-ghost cursor-pointer text-xs">
                <Camera size={14} /> {uploadingPhoto ? 'Uploading…' : 'Change photo'}
                <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} disabled={uploadingPhoto} />
              </label>
            )}
            <input className="input text-xs" placeholder="Avatar image URL"
              value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
          </div>
        </div>

        {/* Banner — pick a preset gradient, or paste a cover image URL */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Profile banner</label>
          <div className="h-20 w-full rounded-card bg-cover bg-center"
            style={form.coverUrl ? { backgroundImage: `url(${form.coverUrl})` } : { background: form.banner || BANNERS[0] }} />
          <div className="mt-2 flex flex-wrap gap-2">
            {BANNERS.map((b) => (
              <button key={b} type="button" onClick={() => setForm({ ...form, banner: b, coverUrl: '' })}
                className={`h-7 w-10 rounded-input border-2 ${form.banner === b && !form.coverUrl ? 'border-primary' : 'border-border'}`}
                style={{ background: b }} />
            ))}
          </div>
          <input className="input mt-2 text-xs" placeholder="…or paste a cover image URL"
            value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Display name</label>
          <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>

        {/* GitHub integration + featured projects */}
        <GithubManager
          link={form.links?.github}
          projects={form.projects}
          onLink={setGithubLink}
          onProjects={setProjects}
        />

        {/* Other social / portfolio links — paste a URL, icon + handle auto-detected */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Other links (LinkedIn, X, portfolio…)</label>
          <div className="flex gap-2">
            <input className="input text-xs" placeholder="Paste GitHub / LinkedIn / X / portfolio URL…"
              value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())} />
            <button type="button" onClick={addLink} disabled={!linkInput.trim()} className="btn-primary shrink-0 !px-3"><Plus size={15} /></button>
          </div>
          {Object.values(form.links).filter((l) => l.platform !== 'github').length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.values(form.links).filter((l) => l.platform !== 'github').map((l) => (
                <span key={l.platform} className="pill border border-primary/30 bg-primary/8 text-primary">
                  {l.handle}
                  <button type="button" onClick={() => removeLink(l.platform)} className="ml-1 text-primary/60 hover:text-white"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-text-muted">Bio ({form.bio.length}/160)</label>
            <button onClick={genBio} disabled={genning} className="btn-primary !px-3 !py-1 text-xs">
              <Sparkles size={13} /> Generate Bio
            </button>
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
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
