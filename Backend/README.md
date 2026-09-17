# ProjectSphere — Backend

> Developer Portfolio & Project Discovery Platform. Node.js · Express · TypeScript · Prisma · PostgreSQL.

This repository contains the **Phase 1** backend: foundation, database schema, and a complete authentication system (local + OAuth + email verification).

---

## Architecture

ProjectSphere uses a **module-based** architecture. Each feature owns its full vertical slice:

```
src/
├── config/                 # env (Zod-validated), Prisma client, mail transporter
├── shared/
│   ├── errors/             # AppError hierarchy + error codes
│   ├── utils/              # jwt, password, tokens, response envelope, asyncHandler
│   └── types/              # Express Request augmentation
├── middleware/             # requestId, auth, role, validate, rateLimiter, error, notFound
├── modules/
│   ├── auth/               # controller → service → repository (+ schema, cookies)
│   ├── oauth/              # Google + GitHub (authorization-code flow, no Passport)
│   ├── email/              # templates + send service
│   └── health/             # health check
├── routes/                 # v1 router (mounts all modules)
├── app.ts                  # Express app assembly
└── server.ts               # entrypoint + graceful shutdown
```

Within each module the flow is **Controller → Service → Repository**:
- **Controller** — HTTP only (parse request, set cookies, shape response). No business logic.
- **Service** — business logic and orchestration. No `req`/`res`, no raw SQL.
- **Repository** — all Prisma calls. Swappable/mockable data layer.

> **Design note:** ProjectSphere is deliberately module-based, in contrast to a layer-based backend. Module-based scales better for large feature sets (high cohesion per feature, low coupling across them); layer-based is simpler for smaller domains. Choosing per project is the point.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (ESM, NodeNext) | End-to-end type safety |
| Framework | Express 4 | Minimal, explicit, ubiquitous |
| ORM | Prisma | Schema-as-truth, fully typed client |
| Database | PostgreSQL | Relational integrity + full-text search |
| Auth | JWT access + rotating refresh tokens | Stateless access, revocable sessions |
| Validation | Zod | One schema → validation + inferred types |
| Email | Nodemailer | Provider-agnostic SMTP |
| OAuth | Native `fetch` (no Passport) | Understand the flow at the HTTP level |

---

## Getting started

### 1. Prerequisites
- Node.js ≥ 20
- A PostgreSQL database (local, or a free [Neon](https://neon.tech) instance)

### 2. Install
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL and the two JWT secrets.
```
The app **validates env on startup** and exits with a readable report if anything is missing or malformed.

### 4. Generate client + run migrations
```bash
npm run prisma:generate      # generates the typed Prisma client
npm run prisma:migrate       # creates tables (name the migration e.g. "init")
```

### 5. Seed demo data (optional but recommended)
```bash
npm run prisma:seed
# 5 users, 15 projects, tags, likes, comments.
# Login: midhu@projectsphere.dev / Password123!
```

### 6. Run
```bash
npm run dev                  # tsx watch, hot reload
# → http://localhost:5000/api/v1
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:studio` | Visual DB browser |
| `npm run prisma:seed` | Seed demo data |
| `npm run db:reset` | Drop, re-migrate, re-seed |

---

## API — Phase 1 endpoints

Base URL: `/api/v1`

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | email, username, password, name? | Creates account + profile, sends verification email |
| POST | `/auth/login` | email, password, rememberMe? | Returns access token; sets refresh cookie |
| POST | `/auth/refresh` | — (uses cookie) | Rotates refresh token, returns new access token |
| POST | `/auth/logout` | — (uses cookie) | Revokes refresh token |
| POST | `/auth/verify-email` | token \| (email + code) | Verifies email |
| POST | `/auth/resend-verification` | email | Rate limited (1/60s) |
| POST | `/auth/forgot-password` | email | Sends reset link (no account enumeration) |
| POST | `/auth/reset-password` | token, password | Resets password, revokes all sessions |
| GET | `/auth/me` | — (Bearer token) | Current user |

### OAuth
| Method | Path | Notes |
|---|---|---|
| GET | `/auth/google` | Redirects to Google consent |
| GET | `/auth/google/callback` | Handles code, issues session, redirects to frontend |
| GET | `/auth/github` | Redirects to GitHub consent |
| GET | `/auth/github/callback` | Handles code, issues session, redirects to frontend |

### Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness + DB ping + uptime |

### Response envelope
Every response uses one shape:
```json
{ "success": true, "message": "…", "data": { }, "errors": null }
```

---

## Security highlights

- **Passwords** — bcrypt (12 rounds). Policy enforced by Zod: min 8, upper, lower, number, special.
- **Access tokens** — short-lived JWT (15m), carry `sub`, `role`, `email`.
- **Refresh tokens** — opaque, random, **stored only as SHA-256 hashes**. Rotated on every use.
- **Reuse detection** — presenting a revoked refresh token revokes the entire token *family* (theft response).
- **Refresh delivery** — httpOnly, SameSite cookie scoped to `/api/v1/auth`.
- **Email/reset tokens** — hashed at rest, single-use, time-boxed (verify 15m, reset 1h).
- **No account enumeration** — resend-verification and forgot-password always return a neutral message.
- **OAuth account linking** — an OAuth identity links to an existing email only when the provider reports it *verified* (prevents takeover).
- **Rate limiting** — login, resend-verification, forgot-password (in-memory in Phase 1; Redis-backed in Phase 3).
- **Headers/CORS** — Helmet + credentialed CORS restricted to configured origins.

---

## Phase 2 — Core Platform API

Phase 2 adds the full product surface. **Schema changed**, so after pulling run:
```bash
npm run prisma:generate
npm run prisma:migrate      # new migration: notificationPrefs + SearchQuery
```
Media features need Cloudinary env vars (see `.env.example`); without them the app still runs and upload endpoints return a clear "not configured" error.

### Profiles
`GET /profiles/:username` · `PUT /profiles/me` · `PATCH /profiles/me/avatar|cover|resume` · `DELETE /profiles/me`
Owner vs public view, completion %, open-to-work, dedup'd view counter, Cloudinary avatar/cover/resume.

### Projects & media
`POST /projects` · `GET|PUT|DELETE /projects/:slug` · `PATCH /projects/:slug/status` · `POST /projects/:slug/duplicate`
`POST /projects/:slug/cover|architecture|gallery` · `PATCH /projects/:slug/gallery/reorder` · `DELETE /projects/:slug/gallery/:imageId`
Auto-slug with collision suffix, find-or-create technologies/tags, WebP transforms, gallery ordering, YouTube/Vimeo validation.

### Discovery & search
`GET /discover/trending|featured|newest|recommended` · `GET /search` · `GET /search/autocomplete|popular|recent`
Postgres full-text search (relevance ranking), trending score `likes×5 + views×1 + bookmarks×3 − age_days×2`, cursor pagination, per-user + global search history.

### Social
`POST /projects/:slug/like|bookmark` · `POST /users/:username/follow` · `GET /users/:username/followers|following` · `GET /users/:username/projects`
Toggle semantics, self-action guards, denormalized counters, relationship flags on project detail.

### Comments
`GET|POST /projects/:slug/comments` · `POST /comments/:id/replies` · `PUT|DELETE /comments/:id`
Single-level replies, 15-minute edit window, delete by author/project-owner/admin, `@mention` parsing.

### Notifications
`GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` · `GET|PUT /notifications/preferences`
Auto-created in the service layer, unread count in meta, read-time "X and N others" aggregation, per-type email prefs.

### Analytics
`POST /analytics/track` · `GET /analytics/projects/:slug` · `GET /analytics/dashboard`
Per-visitor-per-day dedup, unique visitors, demo/GitHub CTR, daily time-series, dashboard aggregates with 7-day growth.

## Phase 3 — Admin, AI & Production Hardening

**Schema changed** (moderation + audit log). After pulling, run:
```bash
npm run prisma:generate
npm run prisma:migrate      # adds Project.isHidden/moderatedAt + AdminAuditLog
```

### Run the whole stack with Docker
```bash
cp .env.example .env        # fill in JWT/SMTP/Cloudinary/Gemini
docker compose up --build
```
- API → http://localhost:5000/api/v1
- **Interactive API docs (Swagger UI)** → http://localhost:5000/api/v1/docs
- pgAdmin → http://localhost:5050

### Admin panel (`ADMIN` role only)
`GET /admin/dashboard` · `GET /admin/audit` · `GET /admin/users` · `PATCH /admin/users/:id/ban|role` · `DELETE /admin/users/:id` · `GET /admin/projects` · `PATCH /admin/projects/:id/feature` · `DELETE /admin/projects/:id` · `GET /admin/reports` · `PATCH /admin/reports/:id` · `CRUD /admin/categories` · `CRUD /admin/technologies` (+ `/technologies/merge`)
Dashboard growth %, searchable user list, feature/ban/role, category & technology management with duplicate-merge, and an append-only audit log of every privileged action.

### Reporting & moderation
`POST /reports/projects/:slug` · `POST /reports/comments/:id`
Reasons: SPAM, FAKE, ABUSE, COPYRIGHT, INAPPROPRIATE. One report per user per target (DB-enforced). A project auto-hides at 3+ open reports; admins resolve/dismiss with notes and optional actions (hide/unhide/delete).

### AI (Gemini)
`POST /ai/summarize` · `/improve-description` · `/suggest-tags` · `/generate-readme` · `/interview-questions` · `/seo-suggestions`
Every capability returns structured JSON (`responseMimeType: application/json`). Auth + per-user rate limit (default 10/hour). Disabled gracefully with a clear 400 when `GEMINI_API_KEY` is unset.

### Security hardening
express-rate-limit (global 100/15min, auth 5/15min, AI 10/hr per user), Helmet with a strict CSP, `hpp` parameter-pollution guard, XSS input sanitization, 1MB body cap, `/api/v1` versioning, and Prisma slow-query logging (>200ms).

### Testing
Jest + ts-jest (ESM) with Supertest. `npm run test:unit` (auth hash/verify, JWT, tokens, slug, pagination, trending) runs with no database; `npm run test:integration` runs the register→verify→login→create→like→comment flow against a test DB (`.env.test.example`).

## Roadmap

- **Phase 1** — Foundation, DB schema, auth (local + OAuth + email). ✅
- **Phase 2** — Profiles, project CRUD + media, search/discovery, social, comments, notifications, analytics. ✅
- **Phase 3** — Admin panel, reporting/moderation, AI (Gemini), security hardening, tests, Swagger, Docker. ✅

**ProjectSphere backend is feature-complete.**
