import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'
import { Avatar, EmptyState, VerifiedTick } from '../components/ui'
import {
  subscribeConversations,
  subscribeThread,
  sendMessage,
  convoId,
  acceptCollab,
  setTyping,
  isOnline,
} from '../lib/db'
import { clean } from '../lib/sanitize'
import { timeAgo } from '../lib/time'
import {
  Handshake, Send, Code2, Circle, Mail, ChevronLeft,
  Search, RefreshCw, Loader2,
} from '../components/icons'

// Typing indicator (three animated dots)
function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border px-3.5 py-2.5"
      style={{ background: '#14213D' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  )
}

// Thread skeleton loader
function ThreadSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`skeleton h-10 rounded-2xl ${i % 2 === 0 ? 'rounded-bl-sm w-48' : 'rounded-br-sm w-36'}`} />
        </div>
      ))}
    </div>
  )
}

// Single message bubble
function MessageBubble({ msg, mine }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[75%] break-words ${
          mine ? 'bubble-mine' : 'bubble-theirs'
        }`}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{clean(msg.text)}</p>
        {msg.createdAt && (
          <span
            className={`mt-1 block text-[10px] ${
              mine ? 'text-black/50' : 'text-text-muted'
            }`}
          >
            {timeAgo(msg.createdAt)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Conversation list item
function ConvoItem({ convo, active, party, onClick }) {
  const p = party(convo)
  const hasUnread = convo.unread > 0

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-all duration-200 ${
        active ? 'bg-surface-2' : 'hover:bg-surface-2/50'
      }`}
    >
      <span className="relative shrink-0">
        <Avatar src={p?.avatar} alt={p?.displayName} size={44} />
        {isOnline(p) && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg bg-success" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={`truncate text-sm font-semibold ${hasUnread ? 'text-white' : 'text-text-secondary'}`}>
            {p?.displayName || 'Developer'}
          </p>
          {(convo.time || convo.updatedAt) && (
            <span className="shrink-0 text-[10px] text-text-muted ml-2">
              {convo.time || timeAgo(convo.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`flex items-center gap-1 truncate text-xs ${
            convo.isCollab ? 'text-primary' : hasUnread ? 'text-text-secondary' : 'text-text-muted'
          }`}>
            {convo.isCollab && <Handshake size={11} className="shrink-0" />}
            {convo.last || 'New conversation'}
          </p>
          {hasUnread && (
            <span className="ml-2 shrink-0 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
              {convo.unread > 9 ? '9+' : convo.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function Messages() {
  const { id: routeParam } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { firebaseUser, users } = useStore()

  const [convos, setConvos] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [draftTarget, setDraftTarget] = useState(null)
  const [thread, setThread] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-scroll ref
  const threadEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Resolve other participant
  const party = useMemo(() => {
    const byUid = Object.fromEntries((users || []).map((u) => [u.uid, u]))
    return (c) => {
      if (!c) return null
      if (c.user) return c.user
      const otherUid = (c.members || []).find((m) => m !== firebaseUser?.uid)
      return byUid[otherUid] || { uid: otherUid, displayName: 'Developer', username: otherUid, avatar: undefined }
    }
  }, [users, firebaseUser])

  // Live conversation list
  useEffect(() => {
    if (!firebaseUser) return
    return subscribeConversations(firebaseUser.uid, setConvos)
  }, [firebaseUser])

  // Deep link: /messages/<uid> or /messages/<conversationId>
  useEffect(() => {
    if (!firebaseUser || !routeParam) return
    const otherUid = routeParam.includes('__')
      ? routeParam.split('__').find((x) => x !== firebaseUser.uid)
      : routeParam
    if (otherUid && otherUid !== firebaseUser.uid) {
      setActiveId(convoId(firebaseUser.uid, otherUid))
      setDraftTarget(otherUid)
    }
  }, [routeParam, firebaseUser])

  // Default to first conversation (desktop)
  useEffect(() => {
    if (!activeId && !routeParam && convos.length) setActiveId(convos[0].id)
  }, [convos, activeId, routeParam])

  // Active conversation
  const active =
    convos.find((c) => c.id === activeId) ||
    (activeId && draftTarget
      ? { id: activeId, members: [firebaseUser?.uid, draftTarget] }
      : null)

  // Live thread + loading state
  useEffect(() => {
    if (!activeId) { setThread([]); return }
    setThreadLoading(true)
    const unsub = subscribeThread(activeId, (msgs) => {
      setThread(msgs)
      setThreadLoading(false)
    })
    return unsub
  }, [activeId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thread])

  // Is the other user typing?
  const otherTyping = (() => {
    if (!active?.typing || !firebaseUser) return false
    const otherUid = (active.members || []).find((m) => m !== firebaseUser.uid)
    const ts = active.typing[otherUid] || 0
    return Date.now() - ts < 4000
  })()

  // Throttle typing pings
  const typingTimeout = useRef(null)
  const onType = (value) => {
    setDraft(value)
    if (activeId && firebaseUser) {
      setTyping(activeId, firebaseUser.uid, value.length > 0)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {
        setTyping(activeId, firebaseUser.uid, false)
      }, 3000)
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    onType(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
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
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    if (activeId && firebaseUser) setTyping(activeId, firebaseUser.uid, false)
    try {
      await sendMessage(firebaseUser.uid, other.uid, text)
    } catch {
      // Optimistic fallback
      setThread((t) => [...t, {
        id: 'local_' + t.length,
        from: firebaseUser.uid,
        text,
        createdAt: { toMillis: () => Date.now() },
      }])
    }
  }

  const openConvo = (c) => {
    setActiveId(c.id)
    setDraftTarget(null)
  }

  const backToList = () => {
    setActiveId(null)
    setDraftTarget(null)
    navigate('/messages')
  }

  // Filtered conversations
  const filteredConvos = convos.filter((c) => {
    if (!searchQuery) return true
    const p = party(c)
    return p?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const noConvos = convos.length === 0 && !active

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-14 flex overflow-hidden border-t border-border md:bottom-0"
      style={{ background: '#000000' }}
    >
      {/* ── Conversation List ── */}
      <div
        className={`w-full shrink-0 flex flex-col overflow-hidden border-r border-border md:w-72 md:max-w-xs ${
          active ? 'hidden md:flex' : 'flex'
        }`}
        style={{ background: '#0D1628' }}
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-4 shrink-0">
          <h1 className="font-display text-lg font-bold text-white">Messages</h1>
          {/* Search */}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              className="input pl-8 py-2 text-sm"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {noConvos && (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-text-muted">
                <Mail size={22} />
              </div>
              <p className="text-sm font-semibold text-text-secondary">No conversations yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Open a developer's profile and tap <b className="text-white">Message</b> to start one.
              </p>
            </div>
          )}
          {filteredConvos.map((c) => (
            <ConvoItem
              key={c.id}
              convo={c}
              active={activeId === c.id}
              party={party}
              onClick={() => openConvo(c)}
            />
          ))}
          {searchQuery && filteredConvos.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              No results for "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      {/* ── Thread Panel ── */}
      <div className={`flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {!active ? (
          <div className="hidden flex-1 items-center justify-center md:flex" style={{ background: '#000000' }}>
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-surface text-text-muted">
                <Mail size={28} />
              </div>
              <p className="font-semibold text-text-secondary">Select a conversation</p>
              <p className="mt-1 text-sm text-text-muted">or message a dev from their profile</p>
            </div>
          </div>
        ) : (() => {
          const p = party(active)
          return (
            <>
              {/* Thread header */}
              <div
                className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0"
                style={{ background: 'rgba(13,22,40,0.95)', backdropFilter: 'blur(8px)' }}
              >
                <button
                  onClick={backToList}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-white transition-all md:hidden"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="relative shrink-0">
                  <Avatar src={p?.avatar} alt={p?.displayName} size={40} />
                  {isOnline(p) && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg bg-success" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-bold text-white text-sm">
                    {p?.displayName}
                    {p?.verified && <VerifiedTick size={14} />}
                  </p>
                  {otherTyping ? (
                    <p className="text-xs font-medium" style={{ color: '#FCA311' }}>typing…</p>
                  ) : isOnline(p) ? (
                    <p className="flex items-center gap-1 text-xs text-success">
                      <Circle size={6} fill="currentColor" strokeWidth={0} /> online
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">@{p?.username}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4"
                style={{ background: '#000000' }}
              >
                {/* Collab request card */}
                {active.isCollab && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-2xl border border-primary/30 p-4 text-center"
                    style={{ background: 'rgba(252,163,17,0.05)' }}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Handshake size={12} /> Collab Request
                    </span>
                    <p className="mt-2 text-sm text-text-secondary">{p?.displayName} wants to collab</p>
                    {active.collabAccepted ? (
                      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-success">
                        <Circle size={7} fill="currentColor" strokeWidth={0} /> Collab accepted!
                      </p>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => accept(active.id)}
                        className="btn-primary mt-3 !py-2 text-xs"
                      >
                        Accept collab
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {/* Loading state */}
                {threadLoading && <ThreadSkeleton />}

                {/* Empty thread */}
                {!threadLoading && thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="mb-3 text-4xl">👋</span>
                    <p className="text-sm font-semibold text-text-secondary">Say hello to {p?.displayName}!</p>
                    <p className="mt-1 text-xs text-text-muted">Send a message to start the conversation.</p>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {thread.map((m) => (
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        mine={m.from === firebaseUser?.uid || m.from === 'me'}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Typing indicator */}
                {otherTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-3 flex justify-start"
                  >
                    <TypingDots />
                  </motion.div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={threadEndRef} />
              </div>

              {/* Message input */}
              <div
                className="flex items-end gap-2 border-t border-border p-3 shrink-0"
                style={{ background: 'rgba(13,22,40,0.95)' }}
              >
                <button
                  className="hidden shrink-0 h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-white transition-all sm:flex"
                  title="Send code block"
                >
                  <Code2 size={18} />
                </button>
                <textarea
                  ref={textareaRef}
                  className="input flex-1 min-h-[40px] max-h-[120px] resize-none py-2 leading-relaxed"
                  placeholder="Message…"
                  value={draft}
                  rows={1}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={send}
                  disabled={!draft.trim()}
                  className="btn-primary shrink-0 !px-4 !py-2 disabled:opacity-40"
                  title="Send (Enter)"
                >
                  <Send size={15} />
                </motion.button>
              </div>

              {/* Keyboard hint */}
              <div className="px-3 pb-1.5 text-[10px] text-text-muted text-right shrink-0"
                style={{ background: 'rgba(13,22,40,0.95)' }}>
                Enter to send · Shift+Enter for new line
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
