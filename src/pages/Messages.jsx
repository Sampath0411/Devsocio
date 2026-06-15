import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, EmptyState, VerifiedTick } from '../components/ui'
import { subscribeConversations, subscribeThread, sendMessage, convoId, acceptCollab, setTyping, isOnline } from '../lib/db'
import { timeAgo } from '../lib/time'
import { Handshake, Send, Code2, Circle, Mail, ChevronLeft } from '../components/icons'

export default function Messages() {
  const { id: routeParam } = useParams() // either a conversation id or a target uid
  const navigate = useNavigate()
  const toast = useToast()
  const { firebaseUser, users } = useStore()
  const [convos, setConvos] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [draftTarget, setDraftTarget] = useState(null) // uid we're starting a chat with
  const [thread, setThread] = useState([])
  const [draft, setDraft] = useState('')

  // Resolve the *other* participant of a conversation into a renderable profile.
  const party = useMemo(() => {
    const byUid = Object.fromEntries((users || []).map((u) => [u.uid, u]))
    return (c) => {
      if (!c) return null
      if (c.user) return c.user
      const otherUid = (c.members || []).find((m) => m !== firebaseUser?.uid)
      return byUid[otherUid] || { uid: otherUid, displayName: 'Developer', username: otherUid, avatar: undefined }
    }
  }, [users, firebaseUser])

  // Live conversation list.
  useEffect(() => {
    if (!firebaseUser) return
    return subscribeConversations(firebaseUser.uid, setConvos)
  }, [firebaseUser])

  // Deep link: /messages/<uid> (from a profile) or /messages/<conversationId>.
  useEffect(() => {
    if (!firebaseUser) return
    if (!routeParam) return
    const otherUid = routeParam.includes('__')
      ? routeParam.split('__').find((x) => x !== firebaseUser.uid)
      : routeParam
    if (otherUid && otherUid !== firebaseUser.uid) {
      setActiveId(convoId(firebaseUser.uid, otherUid))
      setDraftTarget(otherUid)
    }
  }, [routeParam, firebaseUser])

  // Otherwise default to the first existing conversation (desktop convenience).
  useEffect(() => {
    if (!activeId && !routeParam && convos.length) setActiveId(convos[0].id)
  }, [convos, activeId, routeParam])

  // The active conversation: a real one if it exists, else a draft stub so we
  // can show the thread before the first message creates the doc.
  const active =
    convos.find((c) => c.id === activeId) ||
    (activeId && draftTarget
      ? { id: activeId, members: [firebaseUser.uid, draftTarget] }
      : null)

  // Live thread for the active conversation.
  useEffect(() => {
    if (!activeId) { setThread([]); return }
    return subscribeThread(activeId, setThread)
  }, [activeId])

  const openConvo = (c) => { setActiveId(c.id); setDraftTarget(null) }
  const backToList = () => { setActiveId(null); setDraftTarget(null); navigate('/messages') }

  // Is the *other* member currently typing? (stamp within the last 4s.)
  const otherTyping = (() => {
    if (!active?.typing || !firebaseUser) return false
    const otherUid = (active.members || []).find((m) => m !== firebaseUser.uid)
    const ts = active.typing[otherUid] || 0
    return Date.now() - ts < 4000
  })()

  // Throttle typing pings while the user edits the input.
  const onType = (value) => {
    setDraft(value)
    if (activeId && firebaseUser) setTyping(activeId, firebaseUser.uid, value.length > 0)
  }

  const accept = async (cid) => {
    try {
      await acceptCollab(cid)
      toast('Collab accepted 🎉', { tone: 'success' })
    } catch {
      toast('Could not accept', { tone: 'warning' })
    }
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || !active) return
    const other = party(active)
    if (!other?.uid) return
    setDraft('')
    setTyping(activeId, firebaseUser.uid, false)
    try {
      await sendMessage(firebaseUser.uid, other.uid, text)
    } catch {
      setThread((t) => [...t, { id: 'local_' + t.length, from: firebaseUser.uid, text }])
    }
  }

  const noConvos = convos.length === 0 && !active

  return (
    <div className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-card border border-border bg-surface md:h-[calc(100vh-7rem)]">
      {/* conversation list — hidden on mobile while a chat is open */}
      <div className={`w-full shrink-0 overflow-y-auto border-r border-border md:w-72 md:max-w-xs ${active ? 'hidden md:block' : 'block'}`}>
        <h1 className="border-b border-border px-4 py-4 font-display text-lg font-bold">Messages</h1>
        {noConvos && (
          <p className="px-4 py-6 text-sm text-text-muted">
            No conversations yet — open a developer&apos;s profile and tap <b>Message</b> to start one.
          </p>
        )}
        {convos.map((c) => {
          const p = party(c)
          return (
            <button key={c.id} onClick={() => openConvo(c)}
              className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg ${
                activeId === c.id ? 'bg-bg' : ''}`}>
              <span className="relative">
                <Avatar src={p.avatar} alt={p.displayName} size={44} />
                {isOnline(p) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.displayName}</p>
                <p className={`flex items-center gap-1 truncate text-xs ${c.isCollab ? 'text-primary' : 'text-text-muted'}`}>
                  {c.isCollab && <Handshake size={12} className="shrink-0" />}{c.last || 'New conversation'}
                </p>
              </div>
              {(c.time || c.updatedAt) && (
                <span className="text-[10px] text-text-muted">{c.time || timeAgo(c.updatedAt)}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* thread */}
      <div className={`flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {!active ? (
          <div className="hidden flex-1 items-center justify-center md:flex">
            <EmptyState icon={Mail} title="Select a conversation, or message a dev from their profile." />
          </div>
        ) : (() => {
          const p = party(active)
          return (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button onClick={backToList} className="text-text-muted hover:text-text-primary md:hidden" aria-label="Back">
                  <ChevronLeft size={20} />
                </button>
                <span className="relative">
                  <Avatar src={p.avatar} alt={p.displayName} size={38} />
                  {isOnline(p) && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    {p.displayName}{p.verified && <VerifiedTick size={14} />}
                  </p>
                  {otherTyping ? (
                    <p className="text-xs text-primary">typing…</p>
                  ) : isOnline(p) ? (
                    <p className="flex items-center gap-1 text-xs text-success">
                      <Circle size={7} fill="currentColor" strokeWidth={0} /> online
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">@{p.username}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.isCollab && (
                  <div className="card mx-auto max-w-sm border-primary/40 bg-primary/[0.06] text-center">
                    <p className="pill mx-auto border border-primary/40 text-primary"><Handshake size={12} /> Collab Request</p>
                    <p className="mt-2 text-sm">{p.displayName} wants to collab</p>
                    {active.collabAccepted ? (
                      <p className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-success">
                        <Circle size={7} fill="currentColor" strokeWidth={0} /> Collab accepted
                      </p>
                    ) : (
                      <div className="mt-3 flex justify-center gap-2">
                        <button onClick={() => accept(active.id)} className="btn-primary !py-1.5 text-xs">Accept collab</button>
                      </div>
                    )}
                  </div>
                )}
                {thread.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-muted">Say hi 👋</p>
                )}
                {thread.map((m) => {
                  const mine = m.from === firebaseUser?.uid || m.from === 'me'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-border bg-bg'}`}>
                        {m.text}
                        {m.createdAt && (
                          <span className={`mt-0.5 block text-[10px] ${mine ? 'text-white/60' : 'text-text-muted'}`}>{timeAgo(m.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {otherTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-bg px-3.5 py-2.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce-dot" style={{ animationDelay: `${i * 0.16}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-border p-3">
                <button className="hidden text-text-muted hover:text-text-primary sm:block" title="Send code block"><Code2 size={20} /></button>
                <input className="input" placeholder="Message…" value={draft}
                  onChange={(e) => onType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button onClick={send} disabled={!draft.trim()} className="btn-primary shrink-0"><Send size={15} /> Send</button>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
