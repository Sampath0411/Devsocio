// Vercel Serverless Function — DevSocio Admin Agent (secure, server-side).
//
// This is the brain of the in-admin "Admin Copilot". The browser (admin only)
// POSTs the chat history; this function:
//   1. Verifies the caller is signed in AND is the admin (ID token + email).
//   2. Calls OpenRouter (OpenAI-compatible) with a set of TOOLS.
//   3. Executes READ-ONLY tools itself (via the Firebase Admin SDK) and loops
//      the results back to the model until it produces a final answer.
//   4. NEVER mutates data itself. When the model wants to take an ACTION
//      (delete a post, ban a user, change credits, …) it is returned to the
//      client as a *proposed action* that the admin must approve in the UI.
//
// Vercel → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT = <full service-account JSON pasted as one value>
//   OPENROUTER_API_KEY       = <your sk-or-... key> (shared with /api/ai)
//   AGENT_MODEL              = <a model that supports tool/function calling>
//                              (optional; defaults to openai/gpt-4o-mini)
//   ADMIN_EMAIL              = sampathlox@gmail.com           (optional override)

import admin from 'firebase-admin'

// ---------------------------------------------------------------------------
// Config — uses OpenRouter (same provider/key as api/ai.js).
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'sampathlox@gmail.com').toLowerCase()
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OR_KEY = process.env.OPENROUTER_API_KEY || ''
// The agent needs a tool-calling model; most free models don't support tools
// reliably. Override with AGENT_MODEL. gpt-4o-mini is cheap and tool-capable.
const OR_MODEL = process.env.AGENT_MODEL || 'openai/gpt-4o-mini'
// If the primary model is unavailable/rate-limited, try these (all tool-capable).
const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'google/gemini-flash-1.5',
]
const MAX_TOOL_ROUNDS = 6 // safety cap on the read-tool loop
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

// ---------------------------------------------------------------------------
// Tool catalogue — the "read" tools run here; the "action" tools are proposals.
// ---------------------------------------------------------------------------
const READ_TOOLS = {
  get_overview: {
    description: 'High-level site health: total users, posts, ideas, pending reports, open errors, and the 5 most recent sign-ups.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  find_users: {
    description: 'Search users by a substring of their username, display name or email. Returns slim profiles (uid, username, displayName, email, credits, verified, moderator, banned).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to match (case-insensitive). Empty returns the newest users.' },
        limit: { type: 'number', description: 'Max results (default 10, max 25).' },
      },
      required: ['query'],
    },
  },
  get_user: {
    description: 'Fetch one full user profile by uid OR username.',
    parameters: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        username: { type: 'string' },
      },
    },
  },
  list_recent_posts: {
    description: 'The newest posts, slim (postId, author, type, content excerpt, likes, commentsCount).',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Default 15, max 40.' } },
    },
  },
  search_posts: {
    description: 'Search recent posts whose content contains a substring (case-insensitive).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Default 15, max 40.' },
      },
      required: ['query'],
    },
  },
  get_post: {
    description: 'Fetch one full post by postId.',
    parameters: { type: 'object', properties: { postId: { type: 'string' } }, required: ['postId'] },
  },
  list_reports: {
    description: 'Moderation queue. Optionally filter by status: pending | reviewed | removed.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'reviewed', 'removed'] },
        limit: { type: 'number', description: 'Default 30, max 60.' },
      },
    },
  },
  list_errors: {
    description: 'Captured frontend errors/crashes. Filter by status: open | resolved (default open).',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'resolved'] },
        limit: { type: 'number', description: 'Default 30, max 60.' },
      },
    },
  },
  get_digest: {
    description: 'The latest automated monitoring digest (written by the 24/7 cron scan).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
}

// Action tools are NEVER executed here — they are surfaced to the admin for
// one-click approval. The model calls them like any tool; we answer with a
// "queued for confirmation" message so it stops trying.
const ACTION_TOOLS = {
  delete_post: {
    description: 'Permanently delete a post (moderation). Requires admin approval in the UI.',
    parameters: {
      type: 'object',
      properties: {
        postId: { type: 'string' },
        reason: { type: 'string', description: 'Short reason shown to the admin.' },
      },
      required: ['postId'],
    },
  },
  resolve_report: {
    description: 'Set a report status to reviewed or removed. Requires admin approval.',
    parameters: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
        status: { type: 'string', enum: ['reviewed', 'removed'] },
        reason: { type: 'string' },
      },
      required: ['reportId', 'status'],
    },
  },
  set_user_flag: {
    description: 'Grant/revoke a user flag: verified, moderator, or banned. Requires admin approval.',
    parameters: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        field: { type: 'string', enum: ['verified', 'moderator', 'banned'] },
        value: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['uid', 'field', 'value'],
    },
  },
  change_credits: {
    description: 'Add (positive) or subtract (negative) credits from a user. Requires admin approval.',
    parameters: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        delta: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['uid', 'delta'],
    },
  },
  set_credits: {
    description: "Set a user's exact credit balance (repair). Requires admin approval.",
    parameters: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        value: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['uid', 'value'],
    },
  },
  resolve_error: {
    description: 'Mark a captured error as resolved. Requires admin approval.',
    parameters: {
      type: 'object',
      properties: { errorId: { type: 'string' }, reason: { type: 'string' } },
      required: ['errorId'],
    },
  },
}

function toolSpecs() {
  const all = { ...READ_TOOLS, ...ACTION_TOOLS }
  return Object.entries(all).map(([name, t]) => ({
    type: 'function',
    function: { name, description: t.description, parameters: t.parameters },
  }))
}

const BASE_SYSTEM_PROMPT = `You are DevSocio Admin Copilot — the operations assistant embedded in the admin panel of DevSocio, a social network for developers.

You serve the site owner/administrator and you OBEY their commands to run the platform: investigating users, posts and reports, surfacing frontend errors/crashes, and carrying out moderation or account actions. Be proactive and decisive — when the admin asks for something actionable, do it (read tools immediately; action tools as proposals). Do not refuse reasonable admin requests, lecture, or ask for confirmation you don't need — the UI already gates destructive actions behind an approval click.

Rules:
- Use the READ tools (get_overview, find_users, get_user, list_recent_posts, search_posts, get_post, list_reports, list_errors, get_digest) freely to gather facts before answering. Prefer real data over guessing.
- CRITICAL: Before proposing ANY action that targets a user (set_user_flag, change_credits, set_credits), you MUST first call find_users or get_user to obtain that user's exact "uid", and pass that exact uid string in the action. Never pass a username, display name, or guessed value as the uid. The same applies to postId / reportId / errorId — only use IDs you got from a tool.
- To give a user a specific total balance (e.g. "give Sampath 1,000,000 credits"), use set_credits with value=1000000. To add/subtract from their current balance, use change_credits with a delta.
- For anything that CHANGES data (delete_post, resolve_report, set_user_flag, change_credits, set_credits, resolve_error) call the matching ACTION tool. These are NOT executed automatically — they are shown to the admin for one-click approval. After calling one, tell the admin plainly what you proposed (include the resolved uid/username) and that it is waiting for approval.
- Be concise and concrete. Reference real IDs/usernames you looked up. When you report errors or reports, summarise patterns (e.g. "3 crashes all from PostDetail").
- You cannot edit source code or fix bugs yourself. You can detect, explain, and recommend fixes for the admin to apply. Never claim you fixed code.
- Never invent uids, postIds, credit balances, or counts. If a tool returns nothing, say so.`

// ---------------------------------------------------------------------------
// Read-tool execution (Firebase Admin SDK)
// ---------------------------------------------------------------------------
const clamp = (n, def, max) => {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return def
  return Math.min(Math.floor(v), max)
}
const slimUser = (d) => ({
  uid: d.uid, username: d.username, displayName: d.displayName, email: d.email,
  credits: d.credits ?? 0, verified: !!d.verified, moderator: !!d.moderator,
  banned: !!d.banned, provider: d.provider || 'email',
  postsCount: d.postsCount ?? 0, followersCount: d.followersCount ?? 0,
})
const slimPost = (id, d) => ({
  postId: id, type: d.type,
  author: d.author?.username || d.authorUid,
  authorUid: d.authorUid,
  content: (d.content || '').slice(0, 200),
  likes: d.likes ?? 0, commentsCount: d.commentsCount ?? 0,
})

async function runReadTool(db, name, args) {
  switch (name) {
    case 'get_overview': {
      const [users, posts, ideas, pending, errs, recent] = await Promise.all([
        db.collection('users').count().get().then((s) => s.data().count).catch(() => null),
        db.collection('posts').count().get().then((s) => s.data().count).catch(() => null),
        db.collection('ideas').count().get().then((s) => s.data().count).catch(() => null),
        db.collection('reports').where('status', '==', 'pending').count().get().then((s) => s.data().count).catch(() => null),
        db.collection('errors').where('status', '==', 'open').count().get().then((s) => s.data().count).catch(() => null),
        db.collection('users').orderBy('createdAt', 'desc').limit(5).get()
          .then((s) => s.docs.map((d) => ({ username: d.data().username, email: d.data().email, provider: d.data().provider })))
          .catch(() => []),
      ])
      return { totalUsers: users, totalPosts: posts, totalIdeas: ideas, pendingReports: pending, openErrors: errs, recentSignups: recent }
    }
    case 'find_users': {
      const q = (args.query || '').toLowerCase()
      const limit = clamp(args.limit, 10, 25)
      const snap = await db.collection('users').limit(300).get()
      let rows = snap.docs.map((d) => d.data())
      if (q) {
        rows = rows.filter((u) =>
          (u.username || '').toLowerCase().includes(q) ||
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q))
      } else {
        rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      }
      return { count: rows.length, users: rows.slice(0, limit).map(slimUser) }
    }
    case 'get_user': {
      let data = null
      if (args.uid) {
        const d = await db.collection('users').doc(args.uid).get()
        data = d.exists ? d.data() : null
      } else if (args.username) {
        const s = await db.collection('users').where('username', '==', args.username).limit(1).get()
        data = s.empty ? null : s.docs[0].data()
      }
      return data ? { user: data } : { error: 'No matching user.' }
    }
    case 'list_recent_posts': {
      const limit = clamp(args.limit, 15, 40)
      const s = await db.collection('posts').orderBy('createdAt', 'desc').limit(limit).get()
      return { posts: s.docs.map((d) => slimPost(d.id, d.data())) }
    }
    case 'search_posts': {
      const q = (args.query || '').toLowerCase()
      const limit = clamp(args.limit, 15, 40)
      const s = await db.collection('posts').orderBy('createdAt', 'desc').limit(120).get()
      const rows = s.docs
        .filter((d) => (d.data().content || '').toLowerCase().includes(q))
        .slice(0, limit)
        .map((d) => slimPost(d.id, d.data()))
      return { matches: rows.length, posts: rows }
    }
    case 'get_post': {
      const d = await db.collection('posts').doc(args.postId).get()
      return d.exists ? { post: { postId: d.id, ...d.data() } } : { error: 'No such post.' }
    }
    case 'list_reports': {
      const limit = clamp(args.limit, 30, 60)
      let ref = db.collection('reports').orderBy('createdAt', 'desc').limit(limit)
      const s = await ref.get()
      let rows = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      if (args.status) rows = rows.filter((r) => r.status === args.status)
      return { reports: rows }
    }
    case 'list_errors': {
      const status = args.status || 'open'
      const limit = clamp(args.limit, 30, 60)
      const s = await db.collection('errors').orderBy('createdAt', 'desc').limit(120).get()
      const rows = s.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => (e.status || 'open') === status).slice(0, limit)
      return { errors: rows }
    }
    case 'get_digest': {
      const d = await db.collection('admin_digests').doc('latest').get()
      return d.exists ? { digest: d.data() } : { digest: null, note: 'No digest yet — the monitor cron has not run.' }
    }
    default:
      return { error: `Unknown read tool ${name}` }
  }
}

// ---------------------------------------------------------------------------
// LLM call (OpenRouter — OpenAI-compatible) with retry + model fallback so a
// transient 429/5xx or an unavailable model doesn't fail the whole turn.
// ---------------------------------------------------------------------------
async function callOnce(model, messages) {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://devsocio.app',
      'X-Title': 'DevSocio Admin Copilot',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: toolSpecs(),
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const msg = data?.choices?.[0]?.message
  if (!msg) throw new Error('OpenRouter returned no message')
  return msg
}

async function callLLM(messages) {
  const candidates = [OR_MODEL, ...FALLBACK_MODELS.filter((m) => m !== OR_MODEL)]
  let lastErr
  for (const model of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOnce(model, messages)
      } catch (err) {
        lastErr = err
        // Retry the same model once on transient rate-limit / server errors.
        if ((err.status === 429 || err.status >= 500) && attempt === 0) {
          await sleep(1000)
          continue
        }
        break // otherwise fall through to the next model
      }
    }
  }
  throw lastErr || new Error('All models failed')
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!OR_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' })
    return
  }

  try {
    const app = getApp()
    const db = app.firestore()

    // --- AuthN/Z: must be signed in AND be the admin ---
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) { res.status(401).json({ error: 'Missing auth token' }); return }
    const decoded = await app.auth().verifyIdToken(token)
    const email = (decoded.email || '').toLowerCase()
    if (email !== ADMIN_EMAIL) { res.status(403).json({ error: 'Admin only' }); return }

    const { messages: history, admin } = req.body || {}
    if (!Array.isArray(history) || history.length === 0) {
      res.status(400).json({ error: 'messages[] is required' }); return
    }

    // Remember who we're serving — the verified admin from the token, enriched
    // with any profile details the client sent.
    const adminLine = `\n\nYou are serving the site owner. Verified admin email: ${email}.` +
      (admin ? ` Their profile — name: ${admin.displayName || '?'}, username: @${admin.username || '?'}, uid: ${admin.uid || '?'}, credits: ${admin.credits ?? '?'}. Address them by name when natural and remember these details.` : '')
    const systemPrompt = BASE_SYSTEM_PROMPT + adminLine

    // Build the working transcript. Keep only the last ~20 turns to bound tokens.
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ]

    const proposedActions = []
    const toolTrace = []

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const msg = await callLLM(messages)
      const calls = msg.tool_calls || []

      if (!calls.length) {
        // Final natural-language answer.
        res.status(200).json({
          reply: msg.content || '(no response)',
          proposedActions,
          toolTrace,
        })
        return
      }

      // Record the assistant turn (with its tool calls) before answering them.
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls })

      for (const call of calls) {
        const name = call.function?.name
        let args = {}
        try { args = JSON.parse(call.function?.arguments || '{}') } catch { args = {} }

        let result
        if (READ_TOOLS[name]) {
          try {
            result = await runReadTool(db, name, args)
          } catch (e) {
            result = { error: e?.message || 'tool failed' }
          }
          toolTrace.push({ name, args })
        } else if (ACTION_TOOLS[name]) {
          // Do NOT execute — queue for admin approval.
          proposedActions.push({ id: `${name}_${proposedActions.length}`, name, args })
          result = { status: 'queued', note: 'Proposed to the admin for approval in the UI. Not yet executed.' }
        } else {
          result = { error: `Unknown tool ${name}` }
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
    }

    // Hit the round cap — ask the model once more for a plain summary.
    messages.push({ role: 'user', content: 'Summarise what you found and any proposed actions in plain text now. Do not call more tools.' })
    const finalMsg = await callLLM(messages).catch(() => ({ content: 'Reached the tool-call limit. Please refine your request.' }))
    res.status(200).json({ reply: finalMsg.content || 'Done.', proposedActions, toolTrace })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Agent request failed' })
  }
}
