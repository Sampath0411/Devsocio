# DevSocio 🚀

> **Where Developers Live Online**

A social web platform built exclusively for the global developer community — merging the visual feed of Instagram, the project culture of GitHub, and the networking of LinkedIn. Without the corporate noise.

![Status](https://img.shields.io/badge/Status-Pre--Development-blueviolet?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Firebase%20%2B%20Node.js-blue?style=flat-square)
![AI](https://img.shields.io/badge/AI-Claude%20API-orange?style=flat-square)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## The Problem

- **LinkedIn** is corporate and performative — devs don't actually network there
- **GitHub** is great for code, terrible for community and discovery
- **Twitter/X** is chaotic with no dev-specific structure
- **No platform** currently combines social discovery + project showcase + collab matching for developers

## The Solution

DevSocio fills this gap with a developer-first social platform:

- 📸 Instagram-style feed with dev-specific post types (code, projects, ideas, memes)
- 🤖 AI-powered collab matching, idea scoring, and bio generation
- 💰 Credits + Refer & Earn gamification system
- 🎨 Dark, playful UI with micro-animations — not corporate, not templated
- 📱 Web-first, built to scale into React Native

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast builds, component ecosystem |
| Styling | Tailwind CSS + Framer Motion | Utility-first + smooth animations |
| State | Zustand | Lightweight, zero boilerplate |
| Backend | Node.js + Express | JS consistency across the stack |
| Database | Firebase Firestore | Real-time sync, scalable free tier |
| Auth | Firebase Auth | OAuth built-in, JWT handled |
| Storage | Cloudinary | Image/video optimization |
| AI | Claude API (Anthropic) | Best reasoning for idea analysis + text gen |
| Hosting (FE) | Vercel | Global CDN, instant deploys |
| Hosting (BE) | Render.com | Free-tier Node server |
| Email | Resend.com | Simple transactional email |
| Realtime DMs | Firebase Realtime DB | WebSocket-like without managing sockets |

---

## Features

### Core Social
- **Feed** — 6 post types: Code Snippet, Project Showcase, Idea, Meme, Question, Opinion
- **Stories** — 24-hour disappearing stories with dev-specific emoji reactions
- **Explore** — Search by username, tech stack, dev level, hashtag; filter by collab status
- **DMs** — Real-time direct messages with code block support and collab request cards
- **Notifications** — In-app + email for likes, comments, follows, collabs, referrals

### AI Features
| Feature | What it does |
|---|---|
| Bio Generator | Generates 160-char bio from your stack + dev level |
| Idea Analyzer | Market score, strengths, weaknesses, competitors |
| Code Explainer | 1-line plain English explanation on code posts |
| Collab Matcher | Top 5 complementary devs based on your stack |
| Project Rater | Rates concept out of 10 with quick feedback |
| Meme Validator | Rates humor level — shown as badge on post |

10 free AI uses/day on free tier. Extra calls unlockable via Credits.

### Admin Copilot (AI agent)
An AI operations assistant (powered by **OpenRouter**) lives **inside the Admin
panel** (`/admin`, admin-only). Chat with it to run the site; it reads live data
and proposes actions you approve.

| Capability | How it works |
|---|---|
| Investigate | Reads users, posts, reports and captured errors via server-side tools (`api/agent.js`) |
| Moderate (with approval) | Proposes delete-post, resolve-report, verify/moderator/**ban** flags, credit changes — each shown as a one-click **Approve & run** card; nothing is executed without you |
| Error capture | `window.onerror` + promise-rejection + a React ErrorBoundary log crashes to the `errors` collection, deduped (`src/lib/errorReporter.js`) |
| 24/7 monitoring | A **Vercel Cron** (`api/monitor.js`, daily) scans errors + pending reports into `admin_digests/latest`; the panel shows a health badge |

**Security:** the agent endpoint verifies the Firebase ID token **and** the admin
email server-side. The OpenRouter key never reaches the browser. All writes go
through the same Firestore rules the admin already uses. The agent **cannot edit
source code** — it detects and recommends; humans apply code fixes.

Requires these Vercel env vars (see `.env.example`): `OPENROUTER_API_KEY` (shared
with `/api/ai`), `AGENT_MODEL` (must support tool calling, e.g.
`openai/gpt-4o-mini`), `FIREBASE_SERVICE_ACCOUNT`, and `CRON_SECRET`.

### Credits & Gamification
- Earn credits for: daily login, posts getting likes, accepting collabs, referring friends
- Spend credits on: featured posts, profile boosts, verified badge, profile themes
- **Refer & Earn** — 150 credits for you + your referral on signup, +50 bonus on their first post
- Weekly leaderboard resets to keep engagement ongoing

### Ideas Board
Dedicated section for public project/startup ideas:
- AI instantly generates market score + 3 strengths + 3 weaknesses + similar products
- Community can "Invest" fake credits to back ideas
- One-click collab request to idea poster

---

## Project Structure

```
devsocio/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   ├── store/           # Zustand state stores
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Firebase config, API clients
│   │   └── styles/          # Global CSS, Tailwind config
│   └── public/
├── server/                  # Node.js + Express backend
│   ├── routes/              # API route handlers
│   ├── middleware/          # JWT auth, rate limiting, validation
│   ├── services/            # AI integration, email, credits logic
│   └── index.js
├── .env.example
├── README.md
└── package.json
```

---

## Pages & Routes

| Route | Page | Auth |
|---|---|---|
| `/` | Landing Page | No |
| `/login` | Login | No |
| `/signup` | Sign Up | No |
| `/feed` | Main Feed | Yes |
| `/explore` | Explore | Yes |
| `/ideas` | Ideas Board | Yes |
| `/profile/:username` | User Profile | Yes |
| `/messages` | DMs | Yes |
| `/notifications` | Notifications | Yes |
| `/credits` | Credits Dashboard | Yes |
| `/post/:id` | Single Post | Yes |
| `/admin` | Admin Panel | Admin only |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (Firestore + Auth + Realtime DB enabled)
- Cloudinary account
- Anthropic API key
- Resend account

### Setup

```bash
# Clone the repo
git clone https://github.com/Sampath0411/devsocio.git
cd devsocio

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Set up environment variables
cp .env.example .env
# Fill in your Firebase, Cloudinary, Anthropic, Resend keys

# Run dev servers
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

### Environment Variables

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=

# JWT
JWT_SECRET=
```

---

## Roadmap

**Phase 1 — MVP (Weeks 1–4)**
- [ ] Landing page + auth (signup, login, OAuth)
- [ ] User profile (avatar, bio, tech stack, dev level)
- [ ] Feed: create post, like, comment, follow
- [ ] Explore page with basic search
- [ ] Credits system + referral link generation

**Phase 2 — Core Features (Weeks 5–8)**
- [ ] Stories (24-hour, reactions)
- [ ] DMs (real-time messaging)
- [ ] Ideas Board with AI analysis
- [ ] AI features: bio generator, code explainer, collab matcher
- [ ] Notifications system
- [ ] Credits shop

**Phase 3 — Polish & Growth (Weeks 9–12)**
- [ ] Admin moderation panel
- [ ] Email notifications (weekly digest, collab alerts)
- [ ] Leaderboard (weekly credits, top builders)
- [ ] Performance optimization + beta launch (100 devs)

**Phase 4 — Mobile App**
- [ ] React Native port of all web features
- [ ] FCM push notifications
- [ ] App Store + Play Store submission

---

## Security

- JWT access tokens (15 min) + refresh tokens (7 day, httpOnly cookies)
- Google + GitHub OAuth 2.0 — no passwords stored for OAuth users
- bcrypt hashing (cost factor 12) for email/password users
- Account lockout after 5 failed attempts
- Firestore security rules: users can only read/write their own data
- All user content sanitized with DOMPurify (XSS prevention)
- Zod schema validation on all endpoints
- CORS restricted to allowed origins only
- Claude API key server-side only — never exposed to frontend

---

## Design System

**Colors**
- Background: `#0D0D0D` | Surface: `#16161E`
- Primary: `#6C63FF` | Accent: `#00E5FF`
- Text: `#EEEEFF` | Muted: `#8888AA`

**Typography**
- Display/Headings: Space Grotesk
- Body: Inter
- Code: JetBrains Mono

**Philosophy:** Dark, playful, developer-coded. Not corporate. Not templated. Personality-first.

---

## Author

**Sampath Satya Saran**  
B.Tech CSE @ Andhra University · Full-Stack Developer · UI/UX Designer  
[LinkedIn](https://linkedin.com/in/sampath1904) · [GitHub](https://github.com/Sampath0411)

---

*DevSocio — PRD v1.0 · June 2026 · Pre-Development*
