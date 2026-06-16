// Content safety filter — wraps bad-words for server-safe usage.
// Returns { clean: bool, word: string|null } — fail open (never blocks on error).
import { Filter } from 'bad-words'

const filter = new Filter()

export function checkContent(text = '') {
  try {
    if (filter.isProfane(text)) {
      const words = text.split(/\s+/)
      const bad = words.find((w) => {
        try { return filter.isProfane(w) } catch { return false }
      })
      return { clean: false, word: bad || 'inappropriate language' }
    }
    return { clean: true, word: null }
  } catch {
    return { clean: true, word: null } // fail open
  }
}
