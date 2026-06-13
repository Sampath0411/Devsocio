// AI layer — DevSocio's "AI-native" features (PRD §4) powered by OpenRouter.
//
// NOTE: this is a static client app, so the API key ships in the bundle. That's
// acceptable for a prototype but NOT for production — move these calls behind a
// server proxy before a real launch. Every function degrades gracefully: if the
// key is missing or the request fails, callers get a sensible local fallback so
// the UI never breaks.

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

export const aiEnabled = () => Boolean(API_KEY)

// Low-level chat call. Returns the assistant message text, or throws.
async function chat(messages, { temperature = 0.7, maxTokens = 500 } = {}) {
  if (!API_KEY) throw new Error('OpenRouter API key not configured (VITE_OPENROUTER_API_KEY)')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      // Optional but recommended by OpenRouter for attribution/rankings.
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://devsocio.app',
      'X-Title': 'DevSocio',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      max_tokens: maxTokens,
      messages,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter returned an empty response')
  return text
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
