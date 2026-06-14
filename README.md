# DevSocio — Where Developers Live Online

A frontend prototype of **DevSocio**, built from `DevSocio_PRD_v1.0.docx`. It implements
the design system and core screens of the developer-first social platform described in the PRD.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build to /dist
npm run preview  # preview the production build
```

## Firebase (real auth + database)

Auth and user data are **live on Firebase** (project `devsocio`):

- **Real-time login** — `onAuthStateChanged` keeps the session in sync; Email/Password
  plus Google and GitHub OAuth (`src/lib/auth.js`).
- **Firestore database** — each user is a `users/{uid}` doc; credits update in real time
  via `onSnapshot`. New posts write to the `posts` collection (`src/lib/db.js`).
- Config lives in `src/firebase.js`. Security rules are in `firestore.rules`.

**Before login works, enable in the [Firebase console](https://console.firebase.google.com/project/devsocio):**
1. **Authentication → Sign-in method** → enable **Email/Password**, **Google**, **GitHub**.
2. **Firestore Database** → create a database (production mode is fine).
3. Deploy the included rules: `firebase deploy --only firestore:rules`.
4. **Authentication → Settings → Authorized domains** → add your hosting domain
   (`localhost` is allowed by default for local dev).

If Firestore/providers aren't set up yet, the app degrades gracefully (auth still works;
profile falls back to a default and the feed/explore/ideas show seeded sample data).

## AI features (OpenRouter, server-side)

Post analysis, idea scoring, and bio generation (PRD §4) run through a **Vercel
serverless function** (`api/ai.js`) that proxies OpenRouter. The API key lives
**only on the server** — it is never bundled into the browser. The client
(`src/lib/ai.js`) just POSTs to `/api/ai`.

**Production (Vercel → Settings → Environment Variables):**

```ini
OPENROUTER_API_KEY=sk-or-v1-...          # server-only, no VITE_ prefix
OPENROUTER_MODEL=openai/gpt-oss-120b:free   # optional; has a sensible default
```

**Local dev** (`npm run dev` has no serverless runtime, so it calls OpenRouter
directly using a `VITE_` key — this branch is stripped from production builds):

```bash
cp .env.example .env
# VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

The function tries a primary free model, retries once on a 429, then falls
through other free models — and every caller has a local fallback, so the UI
never breaks. (Free models have daily caps; add a small OpenRouter credit
balance for reliable, higher limits.)

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting,firestore:rules
```

`firebase.json`, `.firebaserc`, and `firestore.rules` are already configured — you can skip
`firebase init` (or run it and decline overwriting these files).

## What's implemented

UI/UX and flows from the PRD, with a top-navbar layout and a lucide-react icon set
(no emoji in the chrome):

| PRD section | In the prototype |
|---|---|
| §6 Design system | Color tokens, fonts (Space Grotesk / Inter / JetBrains Mono), 12/8/24/999px radii |
| §6.5 Loaders | Typing page loader, shimmer skeletons, AI pulse loader, bouncing-dots infinite scroll |
| §6.6 Micro-animations | Heart burst, follow morph, credit toasts, post spring-in, modal scale, tab underline |
| §3.1 Auth | Landing → Signup (stack + level + referral) / Login (OAuth + email) |
| §3.3 Feed | 6 post types, like/comment/save/repost, stories bar, create-post modal with AI |
| §3.5 Explore | Search, filters, AI suggested devs, Dev of the Week, trending |
| §3.6 Ideas Board | AI score ring, strengths/weaknesses, invest credits, sort |
| §3.2 Profile | Cover, level badge, stack pills, collab toggles, tabs, AI bio generator (edit) |
| §5 Credits | Balance, earn rules, rewards shop, referral link, leaderboard |
| §3.7 / §3.8 | DMs with collab-request card, notifications, post detail w/ comments |
| §7.4 / §9 | Admin moderation panel, full route map with auth guard |

**Try it:** click *Join DevSocio* → pick a stack → land in the feed. Use the sidebar to
explore. Credits update live (invest in ideas, redeem rewards, copy your referral link).

## Tech stack (per PRD §8.1)

React 18 + Vite · Tailwind CSS · Framer Motion · Zustand · React Router

## Now wired to the backend

Everything below is **live Firestore data only — no demo/mock fallback**. Empty
collections render clean empty states, never seeded placeholders:

- **Likes / saves / follows** — per-user docs + atomic counters; hydrated in real time
  via `onSnapshot` (`subscribeMyLikes` / `subscribeMySaves` / `subscribeMyFollowing`).
- **Comments** — `posts/{id}/comments` subcollection, live on the post-detail page.
- **Ideas board** — real `ideas` collection; posting an idea runs a real AI score
  (strengths/weaknesses/competitors) and investing persists.
- **Notifications** — per-user `notifications` feed; likes/follows/comments push to it.
- **Direct messages** — `conversations` + `messages` subcollections, real-time threads.
- **Explore / Suggested / Leaderboard / Admin stats** — query the live `users` directory.
- **AI** — OpenRouter calls (see above) for post analysis, idea scoring, and bios.

## Still pending (next phase)

Cloudinary image uploads (post images/avatars/covers still use generated art) and
transactional email (Resend) — both need a server/Cloud Function, so they're deferred.
