// Fetch public GitHub repos for a username (no auth — public API, 60 req/hr/IP).
// Used to show a developer's real projects on their DevSocio profile.
const cache = new Map() // username -> repos[] (per session)

export async function fetchRepos(username, { limit = 8 } = {}) {
  if (!username) return []
  if (cache.has(username)) return cache.get(username)
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
  )
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const data = await res.json()
  const repos = (Array.isArray(data) ? data : [])
    .filter((r) => !r.fork)
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      url: r.html_url,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || '',
      updatedAt: r.updated_at,
    }))
  cache.set(username, repos)
  return repos
}
