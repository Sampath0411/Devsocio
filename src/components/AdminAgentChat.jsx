import { useEffect, useRef, useState } from 'react'
import { useToast } from './Toast'
import { Bot, Send, Sparkles, Check, X, ShieldAlert } from './icons'
import { askAgent, describeAction, executeAction } from '../lib/agentClient'

const WELCOME = {
  role: 'assistant',
  content:
    "Hi — I'm your Admin Copilot. Ask me about users, posts, reports or errors, and I can propose moderation actions for you to approve. Try: \"any open errors today?\" or \"show pending reports\".",
}

const SUGGESTIONS = [
  'Give me a site overview',
  'Any open errors today?',
  'Show pending reports',
  'Who are the newest 5 users?',
]

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

export default function AdminAgentChat() {
  const toast = useToast()
  const [messages, setMessages] = useState([WELCOME])
  const [pending, setPending] = useState([]) // proposed actions
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, loading])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setPending([])
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const { reply, proposedActions } = await askAgent(next)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      setPending(proposedActions)
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
      // Let the agent know it was done so follow-ups have context.
      setMessages((m) => [...m, { role: 'user', content: `✅ Approved and executed: ${result}` }])
    } catch (err) {
      toast(err.message || 'Action failed', { tone: 'warning' })
    } finally {
      setBusyAction(false)
    }
  }

  const dismiss = (action) => setPending((p) => p.filter((a) => a.id !== action.id))

  return (
    <div className="card flex flex-col p-0" style={{ height: 460 }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-card bg-primary/10 text-primary">
          <Bot size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold">Admin Copilot</p>
          <p className="text-xs text-text-muted">Reads users · posts · reports · errors</p>
        </div>
        <span className="ml-auto pill border border-accent/40 text-accent"><Sparkles size={11} /> AI</span>
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

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
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
          placeholder="Ask the Copilot…"
          className="input flex-1 !py-2 text-sm"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-3 !py-2">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
