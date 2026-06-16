# DevSocio — Critical Missing Features Implementation Prompt
### For: Claude Code | Paste this entire file as your session prompt

---

## PROJECT CONTEXT (Read First — Do Not Skip)

You are implementing missing features into an existing production React web app called **DevSocio** — a social platform for developers. The codebase is already built and running. You are ONLY adding what is listed below. Do NOT refactor existing code, rename files, change design, or add anything beyond what is explicitly asked.

**Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Framer Motion
- State: Zustand (`src/store/useStore.js`)
- Backend: Firebase Auth + Firestore (`src/firebase.js`, `src/lib/db.js`)
- Serverless: Vercel (`api/ai.js`, `api/credits.js`)
- AI: OpenRouter via `/api/ai` proxy
- Icons: lucide-react (import from `src/components/icons.jsx`)
- UI primitives: import from `src/components/ui.jsx`
- Toast notifications: `useToast()` from `src/components/Toast.jsx`

**File structure you will touch:**
```
src/
  lib/auth.js         ← auth helpers
  lib/db.js           ← all Firestore ops
  lib/credits.js      ← credit earning API
  pages/Login.jsx     ← login page
  pages/Feed.jsx      ← main feed
  pages/Explore.jsx   ← discover page
  pages/PostDetail.jsx ← single post + comments
  pages/Profile.jsx   ← user profile
  pages/Credits.jsx   ← credits dashboard
  components/
    PostCard.jsx      ← feed card
    CreatePostModal.jsx ← post creation
    Layout.jsx        ← nav + right panel
  store/useStore.js   ← global state
api/
  credits.js          ← Vercel serverless credit function
vercel.json           ← Vercel config
```

**After EVERY completed feature, output:**
```
✅ DONE: [Feature Name] — files changed: [list]
```

**Stop and ask before:**
- Deleting any existing file
- Changing any existing component's visual design
- Modifying Firestore security rules
- Adding new npm dependencies (ask first, then install if approved)

---

## FEATURE 1 — Forgot Password

**Files to change:** `src/pages/Login.jsx`, `src/lib/auth.js`

**Task:** The "Forgot password?" button in `Login.jsx` currently has no handler. Implement it.

**Implementation steps:**

1. In `src/lib/auth.js`, add this function at the bottom:
```js
import { sendPasswordResetEmail } from 'firebase/auth'

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}
```

2. In `src/pages/Login.jsx`:
   - Import `resetPassword` from `../lib/auth`
   - Add state: `const [resetEmail, setResetEmail] = useState('')` and `const [resetSent, setResetSent] = useState(false)`
   - Replace the "Forgot password?" button with this flow:
     - On click: open a small inline form below the password field (not a modal — just conditional render)
     - Show: email input + "Send reset link" button
     - On submit: call `resetPassword(resetEmail)`, show toast "Reset link sent — check your email", set `resetSent(true)`, hide the form
     - On error: show toast with `authErrorMessage(err)`
   - Add to `authErrorMessage` in `auth.js`: `'auth/too-many-requests': 'Too many attempts — try again later.'`

**Success criteria:** User clicks "Forgot password?", enters email, gets Firebase password reset email, sees success toast. No page reload.

---

## FEATURE 2 — DOMPurify XSS Sanitization

**Files to change:** `src/components/PostCard.jsx`, `src/pages/PostDetail.jsx`, `src/pages/Messages.jsx`

**Task:** All user-generated content rendered as text must be sanitized before display.

**Implementation steps:**

1. Install DOMPurify: run `npm install dompurify`

2. Create `src/lib/sanitize.js`:
```js
import DOMPurify from 'dompurify'

// Sanitize plain text rendered via dangerouslySetInnerHTML.
// For text rendered as React children (no HTML), this is a safety-in-depth measure.
export const clean = (str) =>
  DOMPurify.sanitize(str || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

// Sanitize code blocks — allow no HTML at all.
export const cleanCode = (str) =>
  DOMPurify.sanitize(str || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
```

3. In `src/components/PostCard.jsx`:
   - Import `{ clean, cleanCode }` from `../lib/sanitize`
   - Wrap `post.content` render: `{clean(post.content)}`
   - Wrap `post.code` render: `{cleanCode(post.code)}`
   - Wrap `post.repostOf.content` render: `{clean(post.repostOf?.content)}`

4. In `src/pages/PostDetail.jsx`:
   - Import `{ clean }` from `../lib/sanitize`
   - Wrap every `comment.text` render: `{clean(comment.text)}`
   - Wrap `draft` preview if any exists

5. In `src/pages/Messages.jsx`:
   - Import `{ clean }` from `../lib/sanitize`
   - Wrap every `msg.text` render: `{clean(msg.text)}`

**Success criteria:** `<script>alert(1)</script>` pasted as post content renders as plain text, no alert fires.

---

## FEATURE 3 — @Mentions in Comments

**Files to change:** `src/pages/PostDetail.jsx`, `src/lib/db.js`

**Task:** When a user types `@username` in a comment, that username is highlighted in the rendered comment and the mentioned user receives a notification.

**Implementation steps:**

1. In `src/lib/db.js`, add a mention parser:
```js
// Extract @usernames from comment text → array of lowercase strings without @
export function parseMentions(text = '') {
  const found = text.match(/@([a-zA-Z0-9_]+)/g) || []
  return [...new Set(found.map((m) => m.slice(1).toLowerCase()))]
}
```

2. In `src/pages/PostDetail.jsx`, add a text renderer that highlights mentions:
```jsx
function CommentText({ text, users }) {
  if (!text) return null
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const handle = part.slice(1).toLowerCase()
          const found = users.find((u) => u.username?.toLowerCase() === handle)
          return found
            ? <Link key={i} to={`/profile/${found.username}`} className="font-semibold text-primary hover:underline">{part}</Link>
            : <span key={i} className="text-accent">{part}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
```

3. Import `parseMentions` from `../lib/db` and `users` from the store in `PostDetail.jsx`.

4. In the `add()` function inside `PostDetail.jsx`, after a comment is saved successfully, send mention notifications:
```js
import { parseMentions } from '../lib/db'
// After addComment succeeds:
const mentions = parseMentions(text)
const byUsername = Object.fromEntries((users || []).map((u) => [u.username?.toLowerCase(), u]))
for (const handle of mentions) {
  const mentioned = byUsername[handle]
  if (mentioned && mentioned.uid !== user?.uid) {
    pushNotification(mentioned.uid, {
      type: 'mention',
      actorUid: user?.uid,
      actor: authorObj,
      text: `mentioned you in a comment: "${text.slice(0, 40)}"`,
      postId: id,
    })
  }
}
```

5. In `PostDetail.jsx`, replace plain `{comment.text}` renders with `<CommentText text={comment.text} users={users} />`. Import `users` from `useStore`.

6. Add `mention` type to `ICON` map in `src/pages/Notifications.jsx`:
```js
mention: { Icon: AtSign, color: '#00E5FF' },
```
Import `AtSign` from `../components/icons`. Add `AtSign` to `src/components/icons.jsx` if not already exported (it's in lucide-react).

**Success criteria:** Typing `@someuser` in a comment highlights it as a purple link, clicking navigates to their profile, they receive an in-app notification.

---

## FEATURE 4 — Credits Transaction Log

**Files to change:** `src/lib/db.js`, `api/credits.js`, `src/pages/Credits.jsx`

**Task:** Every credit earning/spending event gets written to a `credits_log` subcollection. The Credits page shows a history tab with this log.

**Implementation steps:**

1. In `src/lib/db.js`, add:
```js
// Write a credit transaction log entry (best-effort — never throw).
export async function logCreditTx(uid, { amount, type, description }) {
  try {
    await addDoc(collection(db, 'users', uid, 'credits_log'), {
      amount,        // positive = earned, negative = spent
      type,          // 'earn' | 'spend'
      description,   // human-readable e.g. "Post published +30"
      createdAt: serverTimestamp(),
    })
  } catch { /* non-fatal */ }
}

// Fetch credit log for the current user (last 50 entries).
export function subscribeCreditLog(uid, onData) {
  try {
    return onSnapshot(
      query(collection(db, 'users', uid, 'credits_log'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => onData([]),
    )
  } catch {
    onData([])
    return () => {}
  }
}
```

2. In `src/store/useStore.js`, update `spendCredits` and `addCredits` to call `logCreditTx` after the Firestore write:
```js
import { logCreditTx } from '../lib/db'
// In addCredits: after changeCredits succeeds, call:
logCreditTx(u.uid, { amount, type: 'earn', description: `Credits earned (+${amount})` })
// In spendCredits: after changeCredits succeeds, call:
logCreditTx(u.uid, { amount: -amount, type: 'spend', description: `Credits spent (-${amount})` })
```

3. In `api/credits.js`, add a `logCreditTx` call in each action handler after `tx.update`. Use the Admin SDK:
```js
async function logTx(db, uid, amount, description) {
  try {
    await db.collection('users').doc(uid).collection('credits_log').add({
      amount, type: amount > 0 ? 'earn' : 'spend', description,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch {}
}
// Call after each tx.commit() with relevant description strings e.g.:
// logTx(db, uid, 30, 'Post published')
// logTx(db, uid, 5, 'Daily login')
// logTx(db, uid, 150, 'Referral signup bonus')
// logTx(db, uid, 50, 'Referral first post bonus')
```

4. In `src/pages/Credits.jsx`:
   - Add a "History" tab alongside existing content. Use a simple tab toggle: `const [tab, setTab] = useState('overview')` — `'overview'` | `'history'`
   - Import `subscribeCreditLog` from `../lib/db`
   - Subscribe on mount, store in `const [log, setLog] = useState([])`
   - Render a scrollable list in the history tab:
     ```jsx
     <div className="space-y-2">
       {log.length === 0
         ? <p className="text-sm text-text-muted py-4 text-center">No transactions yet.</p>
         : log.map((tx) => (
           <div key={tx.id} className="flex items-center justify-between rounded-input border border-border px-3 py-2.5 text-sm">
             <span className="text-text-muted">{tx.description}</span>
             <span className={tx.amount > 0 ? 'font-bold text-success' : 'font-bold text-danger'}>
               {tx.amount > 0 ? '+' : ''}{tx.amount}
             </span>
           </div>
         ))
       }
     </div>
     ```
   - Unsubscribe on unmount (return the unsubscribe fn from useEffect)

5. In `src/firestore.rules`, add rules for the new subcollection:
```
match /users/{uid}/credits_log/{logId} {
  allow read: if isUser(uid);
  allow create: if isUser(uid) || isAdmin();
  allow update, delete: if false;
}
```

**Success criteria:** Every credit earn/spend creates a log entry. Credits page "History" tab shows all entries with amount colored green (earned) or red (spent).

---

## FEATURE 5 — Like Milestone Credits (+20 at 10 likes, +50 at 50 likes)

**Files to change:** `src/lib/db.js`, `src/store/useStore.js`, `api/credits.js`

**Task:** When a post reaches exactly 10 or 50 likes, award credits to the post author.

**Implementation steps:**

1. In `api/credits.js`, add two new action handlers inside the existing `handler` function:

```js
// --- Post milestone: 10 likes → +20 credits (once per post) ---
if (action === 'post_10_likes') {
  const { postId } = req.body || {}
  if (!postId) { res.status(400).json({ error: 'postId required' }); return }
  const postRef = db.collection('posts').doc(postId)
  const out = await db.runTransaction(async (tx) => {
    const p = (await tx.get(postRef)).data() || {}
    if (p.authorUid !== uid) return { credits: 0, awarded: 0 } // only author claims
    if (p.milestone10Paid) return { credits: 0, awarded: 0 }
    tx.update(postRef, { milestone10Paid: true })
    tx.update(ref, { credits: inc(20) })
    return { awarded: 20 }
  })
  await logTx(db, uid, out.awarded || 0, 'Post hit 10 likes')
  res.status(200).json(out); return
}

// --- Post milestone: 50 likes → +50 credits (once per post) ---
if (action === 'post_50_likes') {
  const { postId } = req.body || {}
  if (!postId) { res.status(400).json({ error: 'postId required' }); return }
  const postRef = db.collection('posts').doc(postId)
  const out = await db.runTransaction(async (tx) => {
    const p = (await tx.get(postRef)).data() || {}
    if (p.authorUid !== uid) return { credits: 0, awarded: 0 }
    if (p.milestone50Paid) return { credits: 0, awarded: 0 }
    tx.update(postRef, { milestone50Paid: true })
    tx.update(ref, { credits: inc(50) })
    return { awarded: 50 }
  })
  await logTx(db, uid, out.awarded || 0, 'Post hit 50 likes')
  res.status(200).json(out); return
}
```

2. In `src/lib/credits.js`, add:
```js
export async function claimPostMilestone(action, postId) {
  const user = auth.currentUser
  if (!user) return
  const token = await user.getIdToken()
  const res = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, postId }),
  })
  return res.ok ? res.json() : null
}
```

3. In `src/store/useStore.js`, update `toggleLike` to check milestones after writing:
```js
// After setPostLike succeeds and `next === true`:
if (next) {
  // Get fresh like count from the post in the store
  const updatedPost = get().posts.find((p) => p.postId === postId)
  const newCount = (updatedPost?.likes || 0) + 1
  // Only the author can claim — check if the liker IS the author (they can't self-claim)
  if (authorUid && authorUid !== u.uid) {
    // Check if authorUid matches current user — no, we need the author to claim
    // So: if I am the author of this post, check milestone
  }
  // Actually milestone check: let the author's next session auto-claim via a Cloud Function
  // Simpler client path: if I AM the post author, claim after liking my own post is not valid
  // → This is handled via the post snapshot: when post.likes updates in the feed, check it
}
```

> **Revised approach** — milestone trigger via Firestore snapshot in `App.jsx`:

In `src/App.jsx`, inside the `onAuthStateChanged` callback where `subscribePosts` is set up, add a post-snapshot watcher:
```js
// After setPosts(posts):
// Check if any post owned by me just crossed 10 or 50 likes
const mine = posts.filter((p) => p.authorUid === u?.uid)
for (const p of mine) {
  if (p.likes >= 10 && !p.milestone10Paid) {
    import('../lib/credits').then(({ claimPostMilestone }) =>
      claimPostMilestone('post_10_likes', p.postId)
        .then((r) => { if (r?.awarded) get().addCredits(0) }) // refresh store
        .catch(() => {})
    )
  }
  if (p.likes >= 50 && !p.milestone50Paid) {
    import('../lib/credits').then(({ claimPostMilestone }) =>
      claimPostMilestone('post_50_likes', p.postId).catch(() => {})
    )
  }
}
```

> Note to Claude Code: the `get()` in App.jsx won't work — instead import `useStore.getState()` or pass `addCredits` via the subscription callback. Adjust to match the actual App.jsx pattern for calling store actions outside React components.

4. Add `milestone10Paid` and `milestone50Paid` to the Firestore rules — they are fields on `/posts/{postId}` which is already writable by `isAdmin()` and the credit server uses Admin SDK so no rules change needed.

**Success criteria:** When a post reaches 10 likes, the author's credits increase by 20. At 50 likes, +50 more. Each milestone fires only once per post even if likes go 10→9→10 again.

---

## FEATURE 6 — Weekly Login Streak + Bonus

**Files to change:** `api/credits.js`, `src/pages/Credits.jsx`, `src/lib/db.js`

**Task:** Track consecutive daily logins. On day 7, award +100 bonus credits on top of the daily +5.

**Implementation steps:**

1. In `api/credits.js`, update the `daily_login` action handler to track streaks:
```js
if (action === 'daily_login') {
  const out = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() || {}
    const last = d.lastDailyAt?.toMillis ? d.lastDailyAt.toMillis() : 0
    const now = Date.now()
    if (now - last < 20 * 60 * 60 * 1000) return { credits: d.credits || 0, awarded: 0, streak: d.loginStreak || 0 }
    
    // Calculate new streak
    const gapMs = now - last
    const oneDayMs = 24 * 60 * 60 * 1000
    const twoDaysMs = 2 * oneDayMs
    const prevStreak = d.loginStreak || 0
    const newStreak = gapMs <= twoDaysMs && last > 0 ? prevStreak + 1 : 1
    
    // Base award
    let awarded = 5
    let streakBonus = 0
    
    // 7-day streak bonus
    if (newStreak % 7 === 0) {
      streakBonus = 100
      awarded += 100
    }
    
    tx.update(ref, {
      credits: inc(awarded),
      lastDailyAt: now(),
      loginStreak: newStreak,
      longestStreak: Math.max(newStreak, d.longestStreak || 0),
    })
    
    return { credits: (d.credits || 0) + awarded, awarded, streak: newStreak, streakBonus }
  })
  await logTx(db, uid, out.awarded || 0, out.streakBonus ? `Daily login +5 + 7-day streak bonus +100` : 'Daily login')
  res.status(200).json(out); return
}
```

2. In `src/pages/Credits.jsx`, update the `dailyLogin` handler to read `streak` and `streakBonus` from the response and show a richer toast:
```js
const dailyLogin = async () => {
  try {
    const { awarded, streak, streakBonus } = await earnCredits('daily_login')
    if (!awarded) { toast('Already claimed today!', { tone: 'warning' }); return }
    if (streakBonus) {
      toast(`🔥 ${streak}-day streak! +${awarded} credits`, { tone: 'success', icon: Coins })
    } else {
      toast(`+${awarded} daily credits — ${streak} day streak 🔥`, { icon: Coins })
    }
    // Refresh the profile credits display
    addCredits(0) // triggers a re-sync
  } catch {
    toast('Could not claim — try again', { tone: 'warning' })
  }
}
```

3. In `src/pages/Credits.jsx`, display the current streak below the daily login button:
```jsx
{user?.loginStreak > 0 && (
  <p className="mt-2 text-center text-xs text-text-muted">
    🔥 {user.loginStreak}-day streak{user.loginStreak % 7 === 0 ? ' — bonus claimed!' : ` — ${7 - (user.loginStreak % 7)} days to streak bonus`}
  </p>
)}
```

**Success criteria:** Logging in daily increments the streak counter. On day 7 (and 14, 21, etc.), the user receives +100 extra credits and sees a special toast.

---

## FEATURE 7 — Feed Algorithm (Follows-First + Stack Boost)

**Files to change:** `src/pages/Feed.jsx`

**Task:** Sort feed posts client-side using a scoring function. Posts from followed users rank first, posts matching the user's tech stack rank second, everything else ranks by recency.

> Note: Firestore still queries by `createdAt desc` (stays unchanged). The ranking is a client-side sort applied AFTER the snapshot arrives.

**Implementation steps:**

1. Create `src/lib/feed.js`:
```js
// Score a post for the signed-in user's feed.
// Higher score = shown earlier.
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

  // Trending boost: +75 if post has 10+ likes (within last hour = trending)
  if ((post.likes || 0) >= 10 && ageHours <= 1) score += 75

  // Own posts: slight deprioritize (you've seen your own content)
  if (post.authorUid === meUid) score -= 30

  return score
}

export function sortFeed(posts, meUid, following, myStack) {
  return [...posts].sort(
    (a, b) => scorePost(b, meUid, following, myStack) - scorePost(a, meUid, following, myStack)
  )
}
```

2. In `src/pages/Feed.jsx`:
   - Import `sortFeed` from `../lib/feed`
   - Import `firebaseUser`, `following`, and `user` from `useStore`
   - Replace the `posts` render with:
   ```js
   const rawPosts = useStore((s) => s.posts)
   const firebaseUser = useStore((s) => s.firebaseUser)
   const following = useStore((s) => s.following)
   const me = useStore((s) => s.user)
   const posts = sortFeed(rawPosts, firebaseUser?.uid, following, me?.techStack || [])
   ```
   - The rest of the render stays identical — `posts.map(...)` already works

**Success criteria:** After following a user and refreshing the feed, their posts appear at the top. Posts with tags matching your tech stack appear before unrelated posts of the same age.

---

## FEATURE 8 — CSP + Security Headers

**Files to change:** `vercel.json`

**Task:** Add Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers to all responses.

**Implementation:**

Replace the contents of `vercel.json` with:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://openrouter.ai https://api.cloudinary.com https://api.github.com https://res.cloudinary.com; frame-src https://accounts.google.com https://devsocio-8f0c0.firebaseapp.com;"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

> Note to Claude Code: The CSP `connect-src` includes Firebase, OpenRouter, Cloudinary, and GitHub APIs. If any other external API is added later, it must be added here too.

**Success criteria:** After deploying, `curl -I https://your-domain.vercel.app` returns all 5 headers. The app still works (no CSP violations in console).

---

## FEATURE 9 — Profanity Filter on Post Publish

**Files to change:** `src/components/CreatePostModal.jsx`, `src/lib/db.js`

**Task:** Basic profanity check before a post is submitted. Block obvious violations, warn on borderline content.

**Implementation steps:**

1. Install: `npm install bad-words`

2. Create `src/lib/filter.js`:
```js
import { Filter } from 'bad-words'

const filter = new Filter()

// Returns { clean: bool, word: string|null }
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
```

3. In `src/components/CreatePostModal.jsx`, in the `publish()` function, add before the `createPost()` call:
```js
import { checkContent } from '../lib/filter'

// Inside publish(), before createPost():
const check = checkContent(content)
if (!check.clean) {
  toast(`Post blocked — contains inappropriate language`, { tone: 'warning' })
  return
}
```

**Success criteria:** Typing a common profanity in the post content and clicking Publish shows the warning toast and does NOT create the post. Clean content still publishes normally.

---

## FEATURE 10 — Fix AI to Route Through Proxy in Production

**Files to change:** `src/lib/ai.js`

**Task:** The `chat()` function currently always calls `chatDirect()` (which exposes the OpenRouter API key to the browser). Fix it to route through `/api/ai` in production.

**Implementation:**

In `src/lib/ai.js`, find the `chat()` function and replace it with:
```js
async function chat(messages, { temperature = 0.7, maxTokens = 500 } = {}) {
  // In production: call the server proxy (key never leaves the server).
  // In dev: call OpenRouter directly (Vite dead-code-eliminates this from prod builds).
  if (import.meta.env.PROD) {
    return chatViaProxy(messages, { temperature, maxTokens })
  }
  return chatDirect(messages, { temperature, maxTokens })
}
```

That's the entire change. `chatViaProxy` and `chatDirect` already exist in the file — they just weren't being used correctly.

**Success criteria:** In production build (`npm run build && npm run preview`), AI features call `/api/ai` and no `VITE_OPENROUTER_API_KEY` is visible in the browser network tab. In dev (`npm run dev`), still calls OpenRouter directly.

---

## FEATURE 11 — Profile Saved Tab Fix

**Files to change:** `src/pages/Profile.jsx`

**Task:** The "Saved" tab shows the signed-in user's bookmarks even when viewing someone else's profile. Fix it.

**Implementation:**

In `src/pages/Profile.jsx`:

1. Hide the Saved tab when `!isMe`:
```js
const TABS = isMe
  ? ['Posts', 'Projects', 'Ideas', 'Saved']
  : ['Posts', 'Projects', 'Ideas']
```

2. If `tab === 'Saved'` and somehow gets triggered when `!isMe`, short-circuit:
```jsx
{tab === 'Saved' && isMe && (
  savedPosts.length
    ? savedPosts.map((p) => <PostCard key={p.postId} post={p} />)
    : <EmptyState icon={Bookmark} title="Nothing saved yet — save posts to find them here" />
)}
```

3. If the current tab state is `'Saved'` and the user navigates to someone else's profile, reset the tab:
```js
useEffect(() => {
  if (!isMe && tab === 'Saved') setTab('Posts')
}, [isMe, tab])
```

**Success criteria:** Viewing another user's profile shows only Posts, Projects, Ideas tabs. The Saved tab only appears when viewing your own profile.

---

## FEATURE 12 — Onboarding Tour for New Users

**Files to change:** `src/App.jsx`, new file `src/components/OnboardingTour.jsx`

**Task:** First-time users (just signed up) see a 4-step animated walkthrough highlighting Feed, Explore, Ideas, Credits. Shown once, then marked complete in Firestore.

**Implementation steps:**

1. Create `src/components/OnboardingTour.jsx`:
```jsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Home, Compass, Lightbulb, Coins, X, ArrowRight } from './icons'

const STEPS = [
  { Icon: Home, title: 'Your Feed', desc: 'See posts from devs you follow. Share code, projects, ideas, and memes.', route: '/feed' },
  { Icon: Compass, title: 'Explore', desc: 'Discover developers by tech stack, collab status, or trending topics.', route: '/explore' },
  { Icon: Lightbulb, title: 'Ideas Board', desc: 'Drop a startup idea. Get an AI market score. Find a co-founder.', route: '/ideas' },
  { Icon: Coins, title: 'Credits', desc: 'Earn credits for posting, getting likes, and referring friends. Spend them on perks.', route: '/credits' },
]

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) { onDone(); return }
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative mx-4 w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-2xl"
      >
        <button onClick={onDone} className="absolute right-4 top-4 text-text-muted hover:text-text-primary">
          <X size={18} />
        </button>

        <div className="mb-4 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <div className="mb-4 grid h-14 w-14 place-items-center rounded-card bg-primary/15 text-primary">
          <current.Icon size={28} />
        </div>

        <h2 className="font-display text-xl font-bold">{current.title}</h2>
        <p className="mt-2 text-sm text-text-muted">{current.desc}</p>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={onDone} className="text-xs text-text-muted hover:text-text-primary">
            Skip tour
          </button>
          <button onClick={next} className="btn-primary gap-2">
            {isLast ? 'Get started' : 'Next'} <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
```

2. In `src/lib/db.js`, add:
```js
export async function markOnboardingDone(uid) {
  await updateDoc(doc(db, 'users', uid), { onboardingDone: true }).catch(() => {})
}
```

3. In `src/App.jsx`:
   - Import `OnboardingTour` and `markOnboardingDone`
   - Add state: `const [showTour, setShowTour] = useState(false)`
   - In the `onAuthStateChanged` callback, after `setProfile(initial)`, check if it's a brand-new profile:
   ```js
   // Show tour only for users who just signed up (no onboardingDone flag)
   if (!initial.onboardingDone) setShowTour(true)
   ```
   - Add the component to the JSX, inside `<ToastProvider>`, after `<AnimatePresence>`:
   ```jsx
   {showTour && (
     <OnboardingTour onDone={() => {
       setShowTour(false)
       if (auth.currentUser) markOnboardingDone(auth.currentUser.uid)
     }} />
   )}
   ```

**Success criteria:** New users (no `onboardingDone` field on their Firestore doc) see the 4-step tour after login. The tour shows once — never again after completion. Existing users never see it.

---

## FINAL CHECKLIST

After implementing all features, verify:

- [ ] `npm run build` completes with zero errors
- [ ] No TypeScript errors (project is JS but Vite may surface issues)
- [ ] `import.meta.env.PROD` check in `ai.js` routes correctly
- [ ] DOMPurify import works in browser context (it's browser-only)
- [ ] `bad-words` package builds correctly with Vite (it's a CommonJS module — if Vite errors, add to `vite.config.js` optimizeDeps.include)
- [ ] All new Firestore subcollections (`credits_log`) have rules added
- [ ] OnboardingTour renders above everything (z-index 100)
- [ ] No console errors in browser after login

**If `bad-words` has a Vite CommonJS issue**, add to `vite.config.js`:
```js
optimizeDeps: {
  include: ['bad-words']
}
```

---

*End of prompt. Implement features 1–12 in order. Output ✅ DONE after each one.*
EOF