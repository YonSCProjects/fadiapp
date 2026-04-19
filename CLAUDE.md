# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project identity

FadiApp is a Hebrew-first (RTL) mobile app for Israeli middle- and high-school PE/gym teachers (grades 7–12). It does three things: design pedagogically-grounded lessons, run them in real time on the gym floor, and document what happened — plus a subtle coaching layer that grows the teacher's practice over time. The app is positioned as the teacher's personal tool, not a school system of record.

**The architecture plan at `C:\Users\Yon\.claude\plans\i-would-like-to-pure-sifakis.md` is the source of truth** for scope, data model, phased delivery, and out-of-scope items. Read it before proposing features or refactors.

## Two deployables, one repo

This repo contains two independent Node projects that deploy to different places. Don't conflate them.

| Dir | What | Runtime | Package manifest |
|---|---|---|---|
| `/` (root) | Expo/React Native app | iOS + Android (Expo Go in dev) | `package.json` |
| `worker/` | Cloudflare Worker that proxies Anthropic API | V8 isolate on Cloudflare | `worker/package.json` |

The Expo app has path alias `@/*` → `src/*` (see `tsconfig.json`). The worker has its own `tsconfig.json` and uses `@cloudflare/workers-types`. Jest is configured to ignore `/worker/`.

## Commands

**Expo app (run from repo root):**
- `npm install` — first time only
- `npm start` — Expo dev server; open with Expo Go on device
- `npm run android` / `npm run ios` — platform-specific dev builds
- `npm test` — Jest, pure-logic tests (no device required)
- `npm test -- src/runner/wallClock.test.ts` — single file
- `npm run typecheck` — `tsc --noEmit`

**Cloudflare Worker (run from `worker/`):**
- `npm install`
- `npx wrangler secret put ANTHROPIC_API_KEY` — one-time, interactive
- `npx wrangler secret put TEACHER_JWT_SECRET` — one-time, interactive
- `npx wrangler dev` — local dev
- `npx wrangler deploy` — production deploy
- `npm run typecheck`

## Architecture patterns that must be preserved

### 1. Wall-clock timer, never `setInterval` for correctness

`src/runner/wallClock.ts` is a pure, JSON-serializable state model. All time math is computed from `Date.now()` against persisted `segments: {startedAt, endedAt}[]`. `setInterval` exists only to drive UI re-renders — it is never the source of truth. This pattern is load-bearing because iOS and Android both pause JS timers in the background; a lesson timer that loses 20 minutes to a screen lock would be a critical bug. The `AppState` `active` listener in `app/spike/timer.tsx` calls `advanceIfComplete(state, Date.now())` to reconcile on resume. If you touch timer logic, keep the pure model separate from React and extend `wallClock.test.ts` with the new case.

### 2. RTL bootstrap runs once, before any render

`src/i18n/rtl.ts` calls `I18nManager.forceRTL(true)` for `he-IL` and triggers `Updates.reloadAsync()` on Android (iOS picks it up without reload). `app/_layout.tsx` awaits this before mounting the `Stack`. Don't add screens that read `I18nManager.isRTL` at module-evaluation time — only inside component render — because the reload can momentarily desync.

### 3. Two-boundary PII defense for LLM calls

Student names never reach the LLM. Enforcement happens at both boundaries:

- **Device (authoritative)**: a future `src/llm/sanitizer.ts` replaces student tokens before the request leaves the phone.
- **Worker (defense-in-depth)**: `worker/src/sanitizer.ts` inspects `messages[].content` for Hebrew-name-pair patterns, Israeli ID numbers, and student-prefix constructs, and rejects the request with 400 `pii_blocked` if any match.

Both must stay. The worker guard is not a substitute for the device guard — it's the tripwire that detects a device-side bug.

### 4. Worker is the only LLM caller; model list is a whitelist

`worker/src/index.ts` hard-codes `ALLOWED_MODELS = {claude-opus-4-7, claude-sonnet-4-6}`. Requests with any other model return 400. The Anthropic key never leaves the worker. The mobile bundle calls only `extra.workerBaseUrl` (from `app.json`) with a per-teacher JWT bearer token.

### 5. Google Drive: teacher-owned, `drive.file` scope only

`src/sync/drive.ts` uses `https://www.googleapis.com/auth/drive.file`, which restricts the app to files it creates. The OAuth access token is stored in `expo-secure-store` via `src/sync/tokenStore.ts` and **never sent to the worker**. All Drive reads/writes happen client-side from the teacher's device. Do not expand the scope without user consent flow updates.

### 6. OAuth client IDs live in `app.json → extra`, not in code

Placeholders `REPLACE_WITH_*` in `app.json` must be set to real Google OAuth client IDs before Drive sign-in works. `app/spike/drive.tsx` detects placeholders and shows a warning banner instead of failing silently.

## Data model

The SQLite schema lives (will live) at `src/db/schema.ts`. Table design, PII classification, and sync semantics are specified in the plan file (section "Data Model"). The three rules that survive any refactor:

- `students.full_name_enc` and `students.medical_flags_json` are PII, encrypted, never uploaded to Drive plaintext, never sent to LLM.
- Drive writes contain aggregate attendance counts only — never per-student names.
- Every row has `id (ULID)`, `created_at`, `updated_at`, `deleted_at` (soft-delete), `sync_rev`.

## Testing posture

Pure logic (timer model, sanitizer, future coaching rules) gets unit tests that don't touch React Native. UI and device-dependent code (RTL reload, background audio, Drive OAuth) are validated via the spike screens under `app/spike/` — run the app and exercise them manually; automated E2E via Detox is planned for later.

## Known placeholders and TODOs

- `app.json` Google OAuth client IDs.
- `wrangler.toml` `workerBaseUrl` / `app.json extra.workerBaseUrl` must match a real deployed worker.
- `src/db/schema.ts` not yet written — only its location is referenced.
- `src/llm/sanitizer.ts` (device-side) not yet written; the worker-side one exists as defense-in-depth.
- `settings.json` at repo root was not created by us; leave it alone unless the user asks.
