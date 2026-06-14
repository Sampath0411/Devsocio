// Vercel Serverless Function — server-side proxy for OpenRouter (PRD §4).
// The OpenRouter key lives ONLY here (server env), never in the client bundle.
// The client posts { messages, temperature, maxTokens } and gets { text } back.
//
// Set these in Vercel → Project → Settings → Environment Variables:
//   OPENROUTER_API_KEY   (required)  — your sk-or-... key
//   OPENROUTER_MODEL     (optional)  — defaults to openai/gpt-oss-120b:free

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'

// Free models are shared and often rate-limited (429); fall through these.
const FALLBACK_MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callModel(model, messages, temperature, maxTokens) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://devsocio.app',
      'X-Title': 'DevSocio',
    },
    body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${detail.slice(0, 160)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter returned an empty response')
  return text
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!API_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' })
    return
  }

  try {
    const { messages, temperature = 0.7, maxTokens = 500 } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages[] is required' })
      return
    }

    const candidates = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)]
    let lastErr
    for (const model of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await callModel(model, messages, temperature, maxTokens)
          res.status(200).json({ text })
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
    res.status(502).json({ error: lastErr?.message || 'All OpenRouter models failed' })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'AI request failed' })
  }
}
