// Vercel Serverless Function — server-side proxy for OpenRouter (PRD §4).
// The OpenRouter key lives ONLY here (server env), never in the client bundle.
// The client posts { messages, temperature, maxTokens } and gets { text } back.
//
// SECURITY:
//   - Requires a valid Firebase ID token (Bearer auth)
//   - Caps messages array length, per-message content size, and total payload
//   - Clamps temperature and maxTokens to prevent cost amplification
//   - Per-IP rate limit
//   - Returns slim, stable error codes (no upstream detail leak)
//
// Set these in Vercel → Project → Settings → Environment Variables:
//   FIREBASE_SERVICE_ACCOUNT  (required) — service account JSON
//   OPENROUTER_API_KEY        (required) — your sk-or-... key
//   OPENROUTER_MODEL          (optional) — defaults to openai/gpt-oss-120b:free
//   ALLOWED_ORIGIN            (optional) — defaults to https://devsocio.app

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://devsocio.app'

// Hard limits — keep tight to prevent cost amplification.
const MAX_MESSAGES = 50
const MAX_MESSAGE_BYTES = 4 * 1024
const MAX_TOTAL_BYTES = 32 * 1024
const MAX_TEMPERATURE = 2
const MAX_TOKENS = 2000
const RATE_BUCKET = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_IP = 30
const RATE_MAX_PER_UID = 60

// Free models are shared and often rate-limited (429); fall through these.
const FALLBACK_MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function rateLimit(key, max) {
  if (!key) return true
  const now = Date.now()
  const bucket = RATE_BUCKET.get(key) || []
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS)
  if (fresh.length >= max) {
    RATE_BUCKET.set(key, fresh)
    return false
  }
  fresh.push(now)
  RATE_BUCKET.set(key, fresh)
  return true
}

async function callModel(model, messages, temperature, maxTokens) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': ALLOWED_ORIGIN,
      'X-Title': 'DevSocio',
    },
    body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
  })
  if (!res.ok) {
    const err = new Error(`OpenRouter ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty_response')
  return text
}

function bad(res, status, code, message) {
  res.status(status).json({ ok: false, error: { code, message } })
}

export default async function handler(req, res) {
  // CORS — only allow known origin.
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    bad(res, 405, 'method_not_allowed', 'Use POST.')
    return
  }
  if (!API_KEY) {
    bad(res, 500, 'misconfigured', 'AI is not configured on the server.')
    return
  }

  // Per-IP rate limit.
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  if (!rateLimit(`ip:${ip}`, RATE_MAX_PER_IP)) {
    bad(res, 429, 'rate_limited', 'Too many requests from this IP.')
    return
  }

  // Auth — require Firebase ID token.
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) {
    bad(res, 401, 'unauthorized', 'Missing authorization.')
    return
  }
  let decoded
  try {
    decoded = await getApp().auth().verifyIdToken(token, true)
  } catch {
    bad(res, 401, 'unauthorized', 'Invalid or expired token.')
    return
  }
  if (!decoded?.uid) {
    bad(res, 401, 'unauthorized', 'Invalid token claims.')
    return
  }
  if (!rateLimit(`uid:${decoded.uid}`, RATE_MAX_PER_UID)) {
    bad(res, 429, 'rate_limited', 'Too many requests for this user.')
    return
  }

  try {
    const body = req.body || {}
    const { messages } = body
    let { temperature = 0.7, maxTokens = 500 } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      bad(res, 400, 'bad_request', 'messages[] is required.')
      return
    }
    if (messages.length > MAX_MESSAGES) {
      bad(res, 400, 'bad_request', `Too many messages (max ${MAX_MESSAGES}).`)
      return
    }

    // Validate each message.
    let totalBytes = 0
    for (const m of messages) {
      if (!m || typeof m !== 'object') {
        bad(res, 400, 'bad_request', 'Each message must be an object.')
        return
      }
      if (m.role !== 'user' && m.role !== 'system' && m.role !== 'assistant') {
        bad(res, 400, 'bad_request', 'message.role must be user|system|assistant.')
        return
      }
      const content = m.content
      if (typeof content !== 'string') {
        bad(res, 400, 'bad_request', 'message.content must be a string.')
        return
      }
      const bytes = Buffer.byteLength(content, 'utf8')
      if (bytes > MAX_MESSAGE_BYTES) {
        bad(res, 400, 'bad_request', `Message too long (max ${MAX_MESSAGE_BYTES} bytes).`)
        return
      }
      totalBytes += bytes
      if (totalBytes > MAX_TOTAL_BYTES) {
        bad(res, 400, 'bad_request', `Total messages too long (max ${MAX_TOTAL_BYTES} bytes).`)
        return
      }
    }

    // Clamp params.
    const tNum = Number(temperature)
    temperature = Number.isFinite(tNum) ? Math.max(0, Math.min(MAX_TEMPERATURE, tNum)) : 0.7
    const mNum = Number(maxTokens)
    maxTokens = Number.isFinite(mNum) ? Math.max(1, Math.min(MAX_TOKENS, Math.round(mNum))) : 500

    const candidates = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)]
    let lastErr
    for (const model of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await callModel(model, messages, temperature, maxTokens)
          res.status(200).json({ ok: true, text })
          return
        } catch (err) {
          lastErr = err
          if (err.status === 429 && attempt === 0) {
            await sleep(1200)
            continue
          }
          break
        }
      }
    }
    bad(res, 502, 'upstream_failed', 'All AI models are currently unavailable. Try again shortly.')
  } catch (err) {
    console.error('ai handler error:', err?.message || err)
    bad(res, 500, 'internal_error', 'AI request failed.')
  }
}
