// Derive a developer's earned achievement badges from their profile stats.
// Pure function — no storage needed; recomputed from live data.
export function achievementsFor(user = {}, livePostCount = 0) {
  // Prefer the persisted counter when it's a finite number (incl. 0); fall
  // back to the live computed count only when the counter is missing.
  const posts = Number.isFinite(user.postsCount) ? user.postsCount : (livePostCount || 0)
  const followers = Math.max(0, user.followersCount || 0)
  const credits = user.credits || 0
  const out = []
  if (posts >= 1) out.push({ id: 'first_post', label: 'First Post', emoji: '🚀' })
  if (posts >= 10) out.push({ id: 'prolific', label: 'Prolific (10+ posts)', emoji: '✍️' })
  if (followers >= 10) out.push({ id: 'rising', label: 'Rising (10+ followers)', emoji: '🌱' })
  if (followers >= 100) out.push({ id: 'influencer', label: 'Influencer (100+)', emoji: '🔥' })
  if (credits >= 500) out.push({ id: 'saver', label: '500+ Credits', emoji: '💰' })
  if (user.verified) out.push({ id: 'verified', label: 'Verified', emoji: '✅' })
  if (user.topDev) out.push({ id: 'topdev', label: 'Top Dev', emoji: '👑' })
  if (user.moderator) out.push({ id: 'mod', label: 'Moderator', emoji: '🛡️' })
  if (user.lookingForCofounder) out.push({ id: 'founder', label: 'Seeking Co-founder', emoji: '🤝' })
  return out
}
