import { useState } from 'react'
import { Avatar } from '../components/ui'
import { CONVERSATIONS } from '../data/mock'
import { Handshake, Send, Code2, Circle } from '../components/icons'

export default function Messages() {
  const [active, setActive] = useState(CONVERSATIONS[0])
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState([
    { from: 'them', text: 'hey! saw your debounce hook post, clean stuff', time: '10:02' },
    { from: 'me', text: 'thanks! been refining it for a while', time: '10:03' },
    { from: 'them', text: 'wanna pair on that hook lib?', time: '10:04' },
  ])

  const send = () => {
    if (!draft.trim()) return
    setThread((t) => [...t, { from: 'me', text: draft, time: 'now' }])
    setDraft('')
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-card border border-border bg-surface">
      {/* conversation list */}
      <div className="w-full max-w-xs shrink-0 overflow-y-auto border-r border-border md:w-72">
        <h1 className="border-b border-border px-4 py-4 font-display text-lg font-bold">Messages</h1>
        {CONVERSATIONS.map((c) => (
          <button key={c.id} onClick={() => setActive(c)}
            className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg ${
              active.id === c.id ? 'bg-bg' : ''}`}>
            <span className="relative">
              <Avatar src={c.user.avatar} alt={c.user.displayName} size={44} />
              {c.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{c.user.displayName}</p>
              <p className={`flex items-center gap-1 truncate text-xs ${c.isCollab ? 'text-primary' : 'text-text-muted'}`}>
                {c.isCollab && <Handshake size={12} className="shrink-0" />}{c.last}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-text-muted">{c.time}</span>
              {c.unread > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{c.unread}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* thread */}
      <div className="hidden flex-1 flex-col md:flex">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Avatar src={active.user.avatar} alt={active.user.displayName} size={36} />
          <div>
            <p className="text-sm font-semibold">{active.user.displayName}</p>
            <p className="flex items-center gap-1 text-xs text-success">
              {active.online && <Circle size={7} fill="currentColor" strokeWidth={0} />}
              {active.online ? 'online' : 'offline'}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {active.isCollab && (
            <div className="card mx-auto max-w-sm border-primary/40 bg-primary/[0.06] text-center">
              <p className="pill mx-auto border border-primary/40 text-primary"><Handshake size={12} /> Collab Request</p>
              <p className="mt-2 text-sm">{active.user.displayName} wants to collab on <b>Figma for Backend</b></p>
              <div className="mt-3 flex justify-center gap-2">
                <button className="btn-primary !py-1.5 text-xs">Accept (+40 credits)</button>
                <button className="btn-ghost !py-1.5 text-xs">Decline</button>
              </div>
            </div>
          )}
          {thread.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-card px-3.5 py-2 text-sm ${
                m.from === 'me' ? 'bg-primary text-white' : 'border border-border bg-bg'}`}>
                {m.text}
                <div className="mt-0.5 text-right text-[10px] opacity-60">{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <button className="text-text-muted hover:text-text-primary" title="Send code block"><Code2 size={20} /></button>
          <input className="input" placeholder="Message…" value={draft}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button onClick={send} className="btn-primary shrink-0"><Send size={15} /> Send</button>
        </div>
      </div>
    </div>
  )
}
