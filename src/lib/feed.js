// Feed scoring algorithm (PRD §3.2 — personalized ranking).
// Applied client-side after the Firestore snapshot arrives; Firestore still
// queries by createdAt desc. Higher score = shown earlier.

export function scorePost(post, meUid, following = {}, myStack = []) {
  let score = 0

  // Recency: decay based on hours since posted (max +100 for brand new)
  const ageMs = Date.now() - (post.createdAt?.toMillis?.() || Date.now())
  const ageHours = ageMs / (1000 * 60 * 60)
  score += Math.max(0, 100 - ageHours * 2) // loses 2 pts per hour

  // Follows-first: +200 if author is followed
  if (post.authorUid && following[post.authorUid]) score += 200

  // Tech stack match: +50 if any post tag matches user's stack
  const postTags = [...(post.tags || []), ...(post.hashtags || [])]
    .map((t) => t.toLowerCase().replace('#', ''))
  const myLower = myStack.map((s) => s.toLowerCase())
  if (postTags.some((t) => myLower.includes(t))) score += 50

  // Trending boost: +75 if post has 10+ likes within the last hour
  if ((post.likes || 0) >= 10 && ageHours <= 1) score += 75

  // Own posts: slight deprioritize (you've already seen your own content)
  if (post.authorUid === meUid) score -= 30

  // Clamp so even very old own posts don't sort below everything.
  return Math.max(0, score)
}

export function sortFeed(posts, meUid, following, myStack) {
  return [...posts].sort(
    (a, b) => scorePost(b, meUid, following, myStack) - scorePost(a, meUid, following, myStack)
  )
}
