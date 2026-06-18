# DevSocio — Flutter mobile client

Native Android/iOS client for DevSocio. It talks to the **same Firebase project
as the web app** (`devsocio-8f0c0`), so every account, post, message, idea and
credit balance syncs in real time across web and mobile — no separate backend.

## Architecture

- **State:** Riverpod (`flutter_riverpod`)
- **Routing:** GoRouter, with auth-gated redirects
- **Data:** `cloud_firestore` + `firebase_auth` against project `devsocio-8f0c0`
- **AI / credits:** calls the deployed web app's Vercel `/api/{credits,ai,agent}`
  endpoints over HTTPS with the Firebase ID token (keys stay server-side, exactly
  like the web client)

```
lib/
  firebase_options.dart        # points at devsocio-8f0c0
  src/
    core/      theme, colors, constants, env
    models/    Firestore document models (match src/lib/db.js shapes)
    data/      repositories + Riverpod providers
    router/    GoRouter + auth gating
    widgets/   shared UI (app shell, etc.)
    features/  auth, feed, stories, explore, profile, messages,
               notifications, ideas, credits, settings, admin
```

## Run

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE=https://YOUR-WEB-APP.vercel.app \
            --dart-define=CLOUDINARY_CLOUD=your-cloud \
            --dart-define=CLOUDINARY_PRESET=your-unsigned-preset
```

`API_BASE` must point at the deployed web app that hosts the serverless
functions. Cloudinary defines are optional (image upload falls back to URL paste).

## Before shipping to stores

The committed `firebase_options.dart` reuses the public web app config so
Firestore works immediately. For native builds + native Google Sign-In, register
platform apps once:

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=devsocio-8f0c0
```

This adds `google-services.json` / `GoogleService-Info.plist` and per-platform
app IDs. For Google Sign-In on Android, also add your debug/release SHA-1 in the
Firebase console.

## Features (full parity with the web app)

- **Auth** — email/password + Google, signup with dev-level/tech-stack/referral, password reset, presence heartbeat, banned-user auto-logout
- **Feed** — 6 post types, likes, saves, comments (+@mentions), follow, AI analyze, report, delete, quote-repost
- **Stories** — 24h ephemeral rail, composer, full-screen viewer, 6 emoji reactions
- **Explore** — search (name/bio/stack/#tag), 5 filters, trending tags, suggested devs
- **Profile / Edit** — stats, posts/ideas tabs, GitHub repo showcase, AI bio generator, image upload, social links
- **Messages** — real-time DMs, typing indicator, collab request cards
- **Notifications** — real-time feed, unread nav badge, mark-read, deep links
- **Ideas** — AI market scoring (strengths/weaknesses/competitors), invest, collab
- **Credits** — server-trusted daily login, rewards shop, referral, leaderboard, tx history
- **Settings** — privacy toggles, logout, delete-account request
- **Admin + AI Copilot** — user/credit/flag management, reports, errors, health digest, chat agent with approve-to-run action cards

## Build status

All 13 build phases complete; `flutter analyze` passes with **no issues**.
Build/run requires a JDK on the machine (install Android Studio, which bundles one).
