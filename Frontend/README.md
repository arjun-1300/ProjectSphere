# ProjectSphere — Frontend

A React 19 + TypeScript single-page app for **ProjectSphere**, a showcase and
discovery platform for software projects. It consumes the ProjectSphere REST API
(Node/Express/TypeScript · Prisma/PostgreSQL) and covers the full product:
discovery feeds, search, project pages with media and comments, the project
editor, profiles, notifications, a creator analytics dashboard, an AI studio, and
an admin console.

---

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Build | **Vite 6** | Fast dev server, native ESM, tiny config. |
| UI | **React 19 + TypeScript** (strict) | `noUnusedLocals`/`noUnusedParameters` on. |
| Server state | **TanStack Query v5** | The app is API-centric — caching, background refetch, and mutation invalidation belong to a server-state library, not a global store. |
| Routing | **react-router-dom v7** | Nested layout route + role guards. |
| HTTP | **axios** | One instance with auth + refresh interceptors. |
| Forms | **react-hook-form** | Uncontrolled inputs in the project editor. |
| Charts | **recharts** | Analytics dashboards (code-split). |
| Icons | **lucide-react** | Consistent, tree-shakeable line icons. |

### Why React Query here (and Redux Toolkit in AgroFinance)

A deliberate, defensible contrast. AgroFinance had genuine **client state** to
coordinate (multi-step flows, cross-cutting UI), so Redux Toolkit earned its
keep. ProjectSphere is almost entirely **server state** — lists, a project, a
profile — where the hard problems are caching, staleness, and refetching. Reaching
for Redux here would mean hand-rolling what React Query already does well. Same
engineer, different problem, different tool.

---

## Architecture highlights

- **Access token in memory, refresh token in an httpOnly cookie.** The access
  token lives in a module-level observable store (`src/lib/api/types.ts`), never
  in `localStorage`, which shrinks the XSS blast radius. The long-lived refresh
  token is a cookie the browser manages and JS can't read.
- **Silent refresh-on-401 with single-flight.** `src/lib/api/client.ts` retries a
  request once after transparently refreshing the token. Concurrent 401s share a
  single in-flight refresh so we never stampede `/auth/refresh`.
- **Typed API layer mapped 1:1 to the OpenAPI contract.** Every endpoint is a
  typed function under `src/lib/api/`, and every response is unwrapped from the
  `{ success, message, data, errors, meta }` envelope in one place.
- **Route-based code splitting.** Charts (recharts) and the editor
  (react-hook-form) load only when their routes are visited, so the Discover feed
  ships ~122 kB gzip instead of ~250 kB.
- **Role-aware routing.** `ProtectedRoute` gates authenticated pages;
  `RoleRoute role="ADMIN"` gates the admin console.

---

## Design identity — "engineering spec-sheet"

A distinct visual language, chosen so it reads as its own product rather than a
restyle of AgroFinance's glassmorphism:

- Projects are exhibited like **technical index cards** — a monospace metadata row
  (difficulty · `/slug`), a bold grotesk title, and a monospace stat footer, over
  a faint **drafting-grid** paper.
- **Type:** Space Grotesk (display) · Inter (body) · **JetBrains Mono for all
  metadata** — the signature that ties the interface to its subject (code).
- **Palette:** paper `#F6F5F1`, ink `#15171C`, one electric-indigo signal
  `#3A2BEA` for links/primary, marigold `#F5A623` reserved strictly for
  "featured", rose `#E5484D` for destructive/like-active.

---

## Getting started (Windows / VS Code / PowerShell)

Prerequisites: Node 18+ and the ProjectSphere backend running on
`http://localhost:5000`.

```powershell
npm install
Copy-Item .env.example .env      # then set VITE_API_BASE_URL if needed
npm run dev                      # http://localhost:5173
```

The backend's CORS allows credentials from `http://localhost:5173`, so the refresh
cookie flows correctly in dev.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `tsc -b` then production `vite build` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check without emitting |

### Environment

```
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## Project structure

```
src/
  lib/api/        Typed endpoint modules + axios client (envelope, interceptors)
  auth/           AuthContext: bootstrap, login/register/logout, token store
  components/
    ui/           Button, Field, Badge, Avatar, Modal, Tabs, Toast, ...
    layout/       Navbar, AppShell, AuthLayout
    project/      ProjectCard (the signature spec-sheet), grid, comments
    routing/      ProtectedRoute, RoleRoute, ScrollToTop
  pages/          One file per route (auth/ and admin/ grouped)
  styles/         Design tokens + component classes
  types/          Domain models mirroring the API
```

---

## How it maps to the backend

- **Auth** → `/auth/*` (login returns the access token in the body; refresh via
  cookie).
- **Discovery** → `/discover/{trending,featured,newest,recommended}`, `/search`.
- **Project page** → `/projects/:slug` (+ view tracking via `/analytics/track`),
  `/projects/:slug/{like,bookmark}`, `/projects/:slug/comments`,
  `/reports/projects/:slug`.
- **Editor** → `POST/PUT /projects`, multipart cover upload.
- **Profile** → `/profiles/:username`, `PUT /profiles/me`, avatar upload,
  `/users/:username/{follow,projects}`.
- **Dashboard** → `/analytics/dashboard`. **AI Studio** → `/ai/*`.
- **Admin** → `/admin/{dashboard,users,reports}` behind the `ADMIN` guard.

---

## Interview talking points

1. Server-state vs client-state — why React Query here, Redux Toolkit there.
2. Token strategy — in-memory access token + httpOnly refresh, single-flight
   silent refresh on 401.
3. A typed API boundary that unwraps one response envelope in one place.
4. Route-level code splitting and its measured effect on the initial bundle.
5. A design system built around one signature element, kept deliberately distinct
   from a previous project.
