// Shared serverless helpers — applied uniformly to every Vercel API handler.
// Centralises: CORS preflight, body-size limit, in-memory rate limiting, and
// a thin auth wrapper around the Firebase Admin SDK.
//
// Usage:
//   import { applyCors, rateLimit, readJson, requireAuth } from './_lib/secure'
//
//   export default async function handler(req, res) {
//     if (applyCors(req, res)) return           // handles OPTIONS + origin
//     if (!rateLimit(req, res, { key: 'search', max: 60 })) return
//     const body = await readJson(req, res, { max: 1024 * 32 })  // 32 KB cap
//     if (!body) return
//     const decoded = await requireAuth(req, res)   // sends 401 on miss
//     if (!decoded) return
//     ...
//   }

import admin from 'firebase-admin'

// ---------- CORS ----------
// Single allow-list shared by every endpoint. Keep in sync with the
// production deployment domains; production should set ALLOWED_ORIGIN in env.
const DEFAULT_ALLOWED = [
  'https://devsocio.app',
  'https://devsocio-8f0c0.web.app',
  'https://devsocio-8f0c0.firebaseapp.com',
]
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : DEFAULT_ALLOWED)
    .map((s) => s.trim())
    .filter(Boolean),
)
const ALLOWED_RE = /^https:\/\/devsocio-[a-z0-9-]+\.(?:web\.app|firebaseapp\.com)$/

function originAllowed(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  return ALLOWED_RE.test(origin)
}

// Set CORS headers and short-circuit OPTIONS preflights. Returns true if the
// response was already sent (caller should bail out).
export function applyCors(req, res, methods = 'GET, POST, OPTIONS') {
  const origin = req.headers.origin
  if (origin && originAllowed(origin)) {
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', methods)
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '600')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

// ---------- In-memory rate limit (per-process; fine for free tier) ----------
const BUCKETS = new Map()
function bucketHit(key, max, windowMs) {
  const now = Date.now()
  const arr = BUCKETS.get(key) || []
  const fresh = arr.filter((t) => now - t < windowMs)
  if (fresh.length >= max) {
    BUCKETS.set(key, fresh)
    return false
  }
  fresh.push(now)
  BUCKETS.set(key, fresh)
  return true
}

function ipOf(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return fwd || req.socket?.remoteAddress || 'unknown'
}

// Apply a rate limit. On block, writes 429 + standard envelope and returns false.
// `opts.key` namespaces the bucket (so different endpoints don't share quota),
// `opts.max` requests, `opts.windowMs` window. If `opts.uidFn` is provided, the
// limit is applied to that uid (e.g. the verified caller's uid) instead of IP.
export function rateLimit(req, res, opts = {}) {
  const { key = 'global', max = 60, windowMs = 60_000, uidFn } = opts
  const id = uidFn ? uidFn() : ipOf(req)
  if (!bucketHit(`${key}:${id}`, max, windowMs)) {
    res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
    res.status(429).json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } })
    return false
  }
  return true
}

// ---------- Body size + JSON parsing ----------
// Vercel gives us the raw body; we cap bytes before parsing so a malicious
// caller can't OOM the function with a giant payload.
export async function readJson(req, res, opts = {}) {
  const max = opts.max || 64 * 1024 // 64 KB default
  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength && contentLength > max) {
    res.status(413).json({ ok: false, error: { code: 'payload_too_large', message: `Body exceeds ${max} bytes` } })
    return null
  }
  // Vercel may have already parsed the body; fall back to manual read.
  if (req.body && typeof req.body === 'object') return req.body
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > max) {
        res.status(413).json({ ok: false, error: { code: 'payload_too_large', message: `Body exceeds ${max} bytes` } })
        req.destroy()
        resolve(null)
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8') || '{}'
      try {
        resolve(JSON.parse(raw))
      } catch {
        res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'Body is not valid JSON' } })
        resolve(null)
      }
    })
    req.on('error', () => {
      res.status(400).json({ ok: false, error: { code: 'bad_request', message: 'Body read failed' } })
      resolve(null)
    })
  })
}

// ---------- Admin SDK bootstrap ----------
function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

// ---------- Auth helpers ----------
// Verifies a Bearer Firebase ID token. On failure, writes 401 + envelope and
// returns null. On success returns the decoded claims.
export async function requireAuth(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) {
    res.status(401).json({ ok: false, error: { code: 'unauthenticated', message: 'Missing auth token' } })
    return null
  }
  try {
    return await getApp().auth().verifyIdToken(token, true)
  } catch {
    res.status(401).json({ ok: false, error: { code: 'invalid_token', message: 'Invalid or expired token' } })
    return null
  }
}

// Same as requireAuth but additionally requires the `admin: true` custom
// claim. The Firestore rules also enforce this; checking here means we never
// hit Firestore for non-admins.
export async function requireAdmin(req, res) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return null
  if (decoded.admin !== true) {
    res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin claim required' } })
    return null
  }
  return decoded
}

export { getApp }
