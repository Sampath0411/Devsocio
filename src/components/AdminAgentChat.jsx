import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { Bot, Send, Sparkles, Check, X, ShieldAlert, Trash2 } from './icons'
import { askAgent, describeAction, executeAction } from '../lib/agentClient'

const STORAGE_KEY = 'devsocio_admin_copilot_chat_v1'

const WELCOME = {
  role: 'assistant',
  content:
    "Hi — I'm your Admin Copilot. I obey your commands to run DevSocio: investigate users, posts, reports and errors, and carry out moderation or account changes (you approve each one). I remember our conversation across reloads. What do you need?",
}

// A pool of starter prompts — we shuffle and show a few, changing each time.
const SUGGESTION_POOL = [
  'Give me a full site overview',
  'Any open errors today?',
  'Show pending reports',
  'Who are the newest 5 users?',
  'Which posts are getting the most likes?',
  'Find the user "Sampath"',
  'Summarise the latest monitor digest',
  'List users with the most credits',
  'Are there any spammy posts right now?',
  'How many users signed up via GitHub?',
  'Show me crashes from the last scan',
  'Who has the most followers?',
]

function shufflePick(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length) return parsed
  } catch { /* ignore */ }
  return [WELCOME]
}

// One proposed action awaiting the admin's approval.
function ActionCard({ action, onApprove, onDismiss, busy }) {
  return (
    <div className="rounded-card border border-warning/40 bg-warning/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-warning">
        <ShieldAlert size={13} /> Proposed action — needs your approval
      </p>
      <p className="mb-3 text-sm">{describeAction(action)}</p>
      <div className="flex gap-2">
        <button onClick={onApprove} disabled={busy} className="btn-primary !py-1.5 text-xs">
          <Check size={13} /> Approve & run
        </button>
        <button onClick={onDismiss} disabled={busy} className="btn-ghost !py-1.5 text-xs">
          <X size={13} /> Dismiss
        </button>
      </div>
    </div>
  )
}

export default function AdminAgentChat({ height = 460 }) {
  const toast = useToast()
  const me = useStore((s) => s.user)
  const [messages, setMessages] = useState(loadMessages)
  const [pending, setPending] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const [suggestions, setSuggestions] = useState(() => shufflePick(SUGGESTION_POOL, 4))
  const scrollRef = useRef(null)

  // Persist the conversation so the Copilot "remembers" across reloads.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))) } catch { /* quota */ }
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, loading])

  // Admin context the agent should remember about who it's serving.
  const adminContext = me ? {
    displayName: me.displayName, username: me.username, email: me.email,
    uid: me.uid, credits: me.credits,
  } : null

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setPending([])
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const { reply, proposedActions, suggestions } = await askAgent(next, adminContext)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      // The agent server returns proposed actions without ids; stamp a
      // stable client id so approve/dismiss only affects one card.
      setPending(
        (proposedActions || []).map((a, i) => ({
          ...a,
          id: a.id || `pa_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        }))
      )
      // Contextual follow-ups from the agent; fall back to a fresh shuffle.
      setSuggestions(suggestions && suggestions.length ? suggestions : shufflePick(SUGGESTION_POOL, 4))
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const approve = async (action) => {
    setBusyAction(true)
    try {
      const result = await executeAction(action)
      toast(result, { tone: 'success' })
      setPending((p) => p.filter((a) => a.id !== action.id))
      setMessages((m) => [...m, { role: 'user', content: `✅ Approved and executed: ${result}` }])
    } catch (err) {
      toast(err.message || 'Action failed', { tone: 'warning' })
    } finally {
      setBusyAction(false)
    }
  }

  const dismiss = (action) => setPending((p) => p.filter((a) => a.id !== action.id))

  const clearChat = () => {
    setMessages([WELCOME])
    setPending([])
    setSuggestions(shufflePick(SUGGESTION_POOL, 4))
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  return (
    <div className="card flex flex-col p-0" style={{ height }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-card bg-primary/10 text-primary">
          <Bot size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold">Admin Copilot</p>
          <p className="text-xs text-text-muted">Reads users · posts · reports · errors · remembers chat</p>
        </div>
        <span className="ml-auto pill border border-accent/40 text-accent"><Sparkles size={11} /> AI</span>
        <button onClick={clearChat} title="Clear conversation"
          className="grid h-8 w-8 place-items-center rounded-input border border-border text-text-muted hover:border-danger hover:text-danger">
          <Trash2 size={14} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-card px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-bg'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {pending.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            busy={busyAction}
            onApprove={() => approve(a)}
            onDismiss={() => dismiss(a)}
          />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-card border border-border bg-bg px-3 py-2 text-sm text-text-muted">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contextual suggestions — adapt to the conversation, shown throughout */}
      {!loading && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {messages.length > 1 && (
            <span className="w-full px-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Suggested next</span>
          )}
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="pill border border-border text-xs hover:border-accent">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="flex items-center gap-2 border-t border-border px-3 py-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Command the Copilot…"
          className="input flex-1 !py-2 text-sm"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-3 !py-2">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
