import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Avatar, EmptyState } from '../components/ui'
import { subscribeConversations, subscribeThread, sendMessage } from '../lib/db'
import { Handshake, Send, Code2, Circle, Mail } from '../components/icons'

export default function Messages() {
  const { firebaseUser, user: me, users } = useStore()
  const [convos, setConvos] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [thread, setThread] = useState([])
  const [draft, setDraft] = useState('')

  // Resolve the *other* participant of a conversation into a renderable profile.
  const party = useMemo(() => {
    const byUid = Object.fromEntries((users || []).map((u) => [u.uid, u]))
    return (c) => {
      if (c.user) return c.user // mock-shaped fallback
      const otherUid = (c.members || []).find((m) => m !== firebaseUser?.uid)
      return byUid[otherUid] || { uid: otherUid, displayName: 'Developer', username: otherUid, avatar: undefined }
    }
  }, [users, firebaseUser])

  // Live conversation list.
  useEffect(() => {
    if (!firebaseUser) return
    return subscribeConversations(firebaseUser.uid, setConvos)
  }, [firebaseUser])

  // Default-select the first conversation once they load.
  useEffect(() => {
    if (!activeId && convos.length) setActiveId(convos[0].id)
  }, [convos, activeId])

  const active = convos.find((c) => c.id === activeId) || null

  // Live thread for the active conversation.
  useEffect(() => {
    if (!activeId) { setThread([]); return }
    return subscribeThread(activeId, setThread)
  }, [activeId])

  const send = async () => {
    const text = draft.trim()
    if (!text || !active) return
    setDraft('')
    const other = party(active)
    try {
      await sendMessage(firebaseUser.uid, other.uid, text)
    } catch {
      // Optimistic echo if the write fails (rules/offline).
      setThread((t) => [...t, { id: 'local_' + t.length, from: firebaseUser.uid, text }])
    }
  }

  if (convos.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={Mail} title="No conversations yet — start one from a developer's profile." />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-card border border-border bg-surface">
      {/* conversation list */}
      <div className="w-full max-w-xs shrink-0 overflow-y-auto border-r border-border md:w-72">
        <h1 className="border-b border-border px-4 py-4 font-display text-lg font-bold">Messages</h1>
        {convos.map((c) => {
          const p = party(c)
          return (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg ${
                activeId === c.id ? 'bg-bg' : ''}`}>
              <span className="relative">
                <Avatar src={p.avatar} alt={p.displayName} size={44} />
                {c.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.displayName}</p>
                <p className={`flex items-center gap-1 truncate text-xs ${c.isCollab ? 'text-primary' : 'text-text-muted'}`}>
                  {c.isCollab && <Handshake size={12} className="shrink-0" />}{c.last}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.time && <span className="text-[10px] text-text-muted">{c.time}</span>}
                {c.unread > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{c.unread}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* thread */}
      <div className="hidden flex-1 flex-col md:flex">
        {active && (() => {
          const p = party(active)
          return (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Avatar src={p.avatar} alt={p.displayName} size={36} />
                <div>
                  <p className="text-sm font-semibold">{p.displayName}</p>
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
                    <p className="mt-2 text-sm">{p.displayName} wants to collab</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <button className="btn-primary !py-1.5 text-xs">Accept (+40 credits)</button>
                      <button className="btn-ghost !py-1.5 text-xs">Decline</button>
                    </div>
                  </div>
                )}
                {thread.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-muted">Say hi 👋</p>
                )}
                {thread.map((m) => {
                  const mine = m.from === firebaseUser?.uid || m.from === 'me'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-card px-3.5 py-2 text-sm ${
                        mine ? 'bg-primary text-white' : 'border border-border bg-bg'}`}>
                        {m.text}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 border-t border-border p-3">
                <button className="text-text-muted hover:text-text-primary" title="Send code block"><Code2 size={20} /></button>
                <input className="input" placeholder="Message…" value={draft}
                  onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button onClick={send} className="btn-primary shrink-0"><Send size={15} /> Send</button>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
