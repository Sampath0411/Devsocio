// Public GitHub API (no auth — 60 req/hr/IP). Powers the profile repo showcase.
const profileCache = new Map() // username -> profile
const repoCache = new Map() // username -> repos[]

const norm = (r) => ({
  id: r.id,
  name: r.name,
  fullName: r.full_name,
  description: r.description || '',
  url: r.html_url,
  stars: r.stargazers_count || 0,
  forks: r.forks_count || 0,
  language: r.language || '',
  updatedAt: r.updated_at,
  isPrivate: !!r.private,
  fork: !!r.fork,
})

// GitHub user profile: avatar, name, public repo count, totals.
export async function fetchGithubProfile(username) {
  if (!username) return null
  if (profileCache.has(username)) return profileCache.get(username)
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`)
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const u = await res.json()
  const profile = {
    username: u.login,
    name: u.name || u.login,
    avatar: u.avatar_url,
    url: u.html_url,
    bio: u.bio || '',
    publicRepos: u.public_repos || 0,
    followers: u.followers || 0,
  }
  profileCache.set(username, profile)
  return profile
}

// All public repos (paginated up to `max`), sorted by stars then recency.
export async function fetchRepos(username, { max = 100 } = {}) {
  if (!username) return []
  if (repoCache.has(username)) return repoCache.get(username)
  const out = []
  for (let page = 1; page <= Math.ceil(max / 100); page++) {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&page=${page}`,
    )
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    out.push(...batch)
    if (batch.length < 100) break
  }
  const repos = out
    .filter((r) => !r.fork)
    .map(norm)
    .sort((a, b) => b.stars - a.stars || new Date(b.updatedAt) - new Date(a.updatedAt))
  repoCache.set(username, repos)
  return repos
}

// Force-refresh (bypass cache) — used by the "Refresh" button.
export async function refreshRepos(username) {
  repoCache.delete(username)
  profileCache.delete(username)
  return fetchRepos(username)
}

// Aggregate showcase stats from a list of repos.
export function repoStats(repos = []) {
  return repos.reduce(
    (acc, r) => ({ stars: acc.stars + (r.stars || 0), forks: acc.forks + (r.forks || 0), count: acc.count + 1 }),
    { stars: 0, forks: 0, count: 0 },
  )
}
