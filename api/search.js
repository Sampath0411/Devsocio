// Vercel Serverless Function — Server-side search for posts and users.
// Replaces client-side O(N) filtering with indexed Firestore queries.
//
// SECURITY: Requires a valid Firebase ID token. Returns slim DTOs only
// (no authorUid, no full body) so an attacker cannot use this endpoint
// to enumerate the post corpus.

import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const cred = JSON.parse(raw)
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
  return admin.initializeApp({ credential: admin.credential.cert(cred) })
}

const db = () => getApp().firestore()

const MAX_Q_LENGTH = 100
const MAX_RESULTS = 50
const DEFAULT_RESULTS = 20
// Simple in-memory per-IP rate limit. Production: swap for Upstash/Redis.
const RATE_BUCKET = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 60

function rateLimit(ip) {
  if (!ip) return true
  const now = Date.now()
  const bucket = RATE_BUCKET.get(ip) || []
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS)
  if (fresh.length >= RATE_MAX) {
    RATE_BUCKET.set(ip, fresh)
    return false
  }
  fresh.push(now)
  RATE_BUCKET.set(ip, fresh)
  return true
}

function tokenize(text) {
  if (!text) return []
  const tokens = text.toLowerCase().match(/[a-z0-9_]{2,}/g)
  return tokens ? [...new Set(tokens)].slice(0, 12) : []
}

function slimPost(doc) {
  const d = doc.data() || {}
  return {
    type: 'post',
    id: doc.id,
    content: typeof d.content === 'string' ? d.content.slice(0, 280) : '',
    type_: d.type || 'text',
    authorUsername: d.author?.username || '',
    authorDisplayName: d.author?.displayName || '',
    authorAvatar: d.author?.avatar || '',
    imageUrl: d.imageUrl || null,
    tags: Array.isArray(d.tags) ? d.tags.slice(0, 6) : [],
    likes: Number(d.likes) || 0,
    commentsCount: Number(d.commentsCount) || 0,
    createdAt: d.createdAt || null,
  }
}

export default async function handler(req, res) {
  // CORS — same-origin by default; allow known prod origin explicitly.
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin && /^https:\/\/(devsocio\.app|devsocio-8f0c0(?:-[a-z0-9]+)?\.(?:web\.app|firebaseapp\.com))$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: { code: 'method_not_allowed', message: 'Method not allowed. Use GET.' } })
    return
  }

  // Rate limit by IP.
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  if (!rateLimit(ip)) {
    res.status(429).json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } })
    return
  }

  try {
    // Auth — require a valid Firebase ID token.
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer /, '')
    if (!token) {
      res.status(401).json({ ok: false, error: { code: 'unauthenticated', message: 'Missing authorization' } })
      return
    }
    let decoded
    try {
      decoded = await getApp().auth().verifyIdToken(token, true)
    } catch {
      res.status(401).json({ ok: false, error: { code: 'invalid_token', message: 'Invalid or expired token' } })
      return
    }
    if (!decoded?.uid) {
      res.status(401).json({ ok: false, error: { code: 'invalid_token', message: 'Invalid token claims' } })
      return
    }

    const { q, limit = DEFAULT_RESULTS } = req.query
    if (!q || typeof q !== 'string') {
      res.status(400).json({ ok: false, error: { code: 'missing_query', message: 'Query parameter "q" is required' } })
      return
    }
    if (q.length > MAX_Q_LENGTH) {
      res.status(400).json({ ok: false, error: { code: 'query_too_long', message: `Query too long (max ${MAX_Q_LENGTH} chars)` } })
      return
    }

    const tokens = tokenize(q)
    if (tokens.length === 0) {
      res.status(200).json({ ok: true, results: [], count: 0, query: q })
      return
    }

    const numResults = Math.max(1, Math.min(Number(limit) || DEFAULT_RESULTS, MAX_RESULTS))

    // Requires composite index: posts(searchTokens ASC, createdAt DESC).
    // See firestore.indexes.json — must be deployed before this query works.
    const postsSnap = await db().collection('posts')
      .where('searchTokens', 'array-contains-any', tokens)
      .orderBy('createdAt', 'desc')
      .limit(numResults * 2)
      .get()

    const seen = new Set()
    const results = []
    for (const doc of postsSnap.docs) {
      if (seen.has(doc.id)) continue
      seen.add(doc.id)
      results.push(slimPost(doc))
      if (results.length >= numResults) break
    }

    res.status(200).json({ ok: true, results, count: results.length, query: q })
  } catch (err) {
    console.error('Search error:', err?.message || err)
    res.status(500).json({ ok: false, error: { code: 'search_failed', message: 'Search failed' } })
  }
}
