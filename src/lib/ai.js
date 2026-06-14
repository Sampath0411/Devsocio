// AI layer — DevSocio's "AI-native" features (PRD §4).
//
// In production the browser calls our own serverless proxy at /api/ai, which
// holds the OpenRouter key server-side (see api/ai.js) — the key is NEVER in the
// shipped bundle. During local `vite dev` (no serverless runtime) we call
// OpenRouter directly using a VITE_ key; that branch is dead-code-eliminated
// from production builds, so the dev key never ships. Every caller has a local
// fallback so the UI never breaks.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const aiEnabled = () => true

// --- Production path: call our serverless proxy (key stays on the server) ---
async function chatViaProxy(messages, { temperature, maxTokens }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature, maxTokens }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `AI request failed (${res.status})`)
  }
  const data = await res.json()
  if (!data.text) throw new Error('Empty AI response')
  return data.text
}

// --- Dev-only path: call OpenRouter directly so `vite dev` works offline of Vercel ---
async function chatDirect(messages, { temperature, maxTokens }) {
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
  const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'
  const FALLBACK_MODELS = [
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ]
  if (!API_KEY) throw new Error('Set VITE_OPENROUTER_API_KEY in .env for local AI dev')

  const once = async (model) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'DevSocio',
      },
      body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
    })
    if (!res.ok) {
      const e = new Error(`OpenRouter ${res.status}`)
      e.status = res.status
      throw e
    }
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  }

  const candidates = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)]
  let lastErr
  for (const model of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await once(model)
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
  throw lastErr || new Error('All OpenRouter models failed')
}

// Low-level chat call. Production goes through the secure Cloud Function
// (/api/ai) so the key never ships in the bundle. Local dev calls OpenRouter
// directly (that branch is stripped from production builds).
async function chat(messages, { temperature = 0.7, maxTokens = 500 } = {}) {
  if (import.meta.env.DEV) return chatDirect(messages, { temperature, maxTokens })
  return chatViaProxy(messages, { temperature, maxTokens })
}

// Pull the first JSON object/array out of a model response (handles ```json fences).
function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()
  const start = candidate.search(/[[{]/)
  if (start === -1) throw new Error('No JSON found in model output')
  return JSON.parse(candidate.slice(start))
}

// ---------- §4.1 Post analysis (one short, type-aware line) ----------
const POST_DIRECTIVE = {
  'Code Snippet': 'Explain in ONE sentence what this code does and why it is useful.',
  'Project Showcase': 'Rate the project concept out of 10 and give ONE concrete next step.',
  'Idea Post': 'Give a market score out of 10, then ONE strength and ONE risk.',
  'Dev Meme': 'Rate the humor out of 10 in ONE witty line.',
  'Question / Help': 'Give ONE concise first-pass answer or debugging direction.',
  'Opinion / Take': 'Offer ONE thoughtful counter-argument.',
}

export async function analyzePost(type, content) {
  const directive = POST_DIRECTIVE[type] || 'Give one short, useful insight.'
  return chat(
    [
      {
        role: 'system',
        content:
          'You are DevSocio AI, a sharp, friendly assistant for developers. ' +
          'Reply with a single short line (max 30 words). No preamble, no markdown.',
      },
      { role: 'user', content: `Post type: ${type}\n${directive}\n\nPost:\n"""${content}"""` },
    ],
    { temperature: 0.6, maxTokens: 120 },
  )
}

// ---------- §4.1 Idea scoring (structured) ----------
export async function scoreIdea(text) {
  const raw = await chat(
    [
      {
        role: 'system',
        content:
          'You are DevSocio AI, a startup analyst. Score the idea and respond ONLY with ' +
          'minified JSON of shape: {"score":number 0-10 one decimal,"strengths":[3 short strings],' +
          '"weaknesses":[3 short strings],"competitors":[2-3 real product names]}. No prose.',
      },
      { role: 'user', content: `Idea:\n"""${text}"""` },
    ],
    { temperature: 0.5, maxTokens: 400 },
  )
  const obj = extractJSON(raw)
  return {
    score: Math.max(0, Math.min(10, Number(obj.score) || 0)),
    strengths: (obj.strengths || []).slice(0, 3).map(String),
    weaknesses: (obj.weaknesses || []).slice(0, 3).map(String),
    competitors: (obj.competitors || []).slice(0, 3).map(String),
  }
}

// ---------- §4.1 Bio generator ----------
export async function generateBio({ techStack = [], devLevel = 'Builder', lookingForCofounder = false } = {}) {
  const text = await chat(
    [
      {
        role: 'system',
        content:
          'You write punchy developer bios for a dev social network. ' +
          'Max 160 characters, first person, no hashtags, no quotes, one line.',
      },
      {
        role: 'user',
        content:
          `Level: ${devLevel}. Stack: ${techStack.join(', ') || 'generalist'}. ` +
          `${lookingForCofounder ? 'Looking for a co-founder.' : 'Open to collaborations.'}`,
      },
    ],
    { temperature: 0.9, maxTokens: 90 },
  )
  return text.replace(/^["']|["']$/g, '').slice(0, 160)
}
