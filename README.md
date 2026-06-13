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
profile falls back to a default and the feed shows seeded sample posts).

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

## Not yet built (would be the next phase)

Firebase Auth + Firestore (users/credits/posts) are wired. Still simulated or pending:
real Claude (`claude-sonnet-4-6`) calls (AI features run client-side mocks behind
`CreatePostModal`/`Ideas`/`EditProfile`), Cloudinary image uploads, real-time DMs and
notifications (currently mock data in `src/data/mock.js`), and email (Resend). Wire these
in by swapping the mock/simulated calls for a Claude API route and additional Firestore
collections.
