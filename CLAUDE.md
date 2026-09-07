# CLAUDE.md — Creo Platform

Read this file completely before writing any code. It is the constitution for this
repo. When a phase prompt and this file disagree, this file wins. When you think an
invariant below is wrong, stop and say so — do not silently work around it.

---

## 1. What Creo is

A content-production SaaS for a social-media agency. Three audiences, one codebase:

- **Clients** buy a monthly plan, complete onboarding, then review and approve Reels,
  Posters, Stories and Carousels the agency produces for their Instagram.
- **Creatives** (editors, designers) receive tasks, upload deliverables, respond to
  revision requests.
- **Team leads and admins** run QA, dispatch work, monitor SLAs, watch revenue.

Approved deliverables are auto-published to Instagram on a schedule.

## 2. Stack — fixed, do not substitute

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19, Vite 6, TypeScript strict | no Next.js, no CRA |
| Styling | Tailwind CSS v4 | `@theme` in CSS, not `tailwind.config.js` |
| Components | Radix UI primitives, wrapped in `src/ui/` | no MUI, Chakra, Ant, shadcn CLI |
| Motion | `motion` v12 (`import { motion } from "motion/react"`) | not `framer-motion` v10 imports |
| Server state | TanStack Query v5 | no Redux, no Zustand for server data |
| Routing | React Router v7, declarative mode | every route lazy |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic v2 | no Django, no Flask |
| Migrations | Alembic | mandatory from Phase 1 |
| DB | PostgreSQL 15 (local Docker, Supabase in prod) | never SQLite, even in tests |
| Cache/broker | Redis 7 | |
| Jobs | Celery 5 | worker and beat are separate processes |
| Storage | Supabase Storage (S3-compatible), presigned URLs | never proxy files through FastAPI |
| Lint/format | Ruff + mypy (backend), Biome (frontend) | |
| Tests | pytest + httpx (backend), Vitest + Playwright (frontend) | |

## 3. Repo layout — create exactly this

```
creo/
├── CLAUDE.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/versions/
│   └── app/
│       ├── main.py
│       ├── config.py            # pydantic-settings, no secret defaults
│       ├── db/
│       │   ├── base.py          # DeclarativeBase + TimestampMixin
│       │   └── session.py       # engine, sessionmaker, get_db dependency
│       ├── models/              # one module per aggregate
│       ├── schemas/             # Pydantic request/response, never reused as models
│       ├── repositories/        # every method takes scope: TenantScope
│       ├── services/            # pure business logic, no Request/Response objects
│       ├── routers/             # thin: validate → call service → serialize
│       ├── workers/
│       │   ├── celery_app.py
│       │   └── tasks/
│       ├── core/                # security, errors, deps, cache, ratelimit, logging
│       └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── app/                 # router, providers, error boundary
        ├── lib/                 # http, query-keys, auth-store, format
        ├── features/<name>/     # api.ts hooks.ts components/ routes/
        ├── ui/                  # design system primitives
        ├── styles/tokens.css
        └── types/api.ts         # GENERATED — never hand-edit
```

## 4. Invariants — violating any of these is a bug, not a preference

### Security

1. **Access tokens live in a JavaScript module variable.** Never `localStorage`,
   `sessionStorage`, or a non-httpOnly cookie. Refresh tokens live only in an
   `httpOnly; Secure` cookie scoped to `/api/v1/auth`.
2. **No token, code, or secret ever appears in a URL.** The OAuth callback redirects
   with a single-use 60-second opaque `auth_code` that the SPA exchanges via POST.
3. **Every JWT carries `tv` (token_version).** Every authenticated request compares it
   to `users.token_version`. Mismatch → 401. This is the only revocation mechanism;
   do not build a denylist.
4. **Webhook signatures verify against `await request.body()`** — the raw bytes, before
   any JSON parsing. Use `hmac.compare_digest`.
5. **`VITE_`-prefixed variables are public.** No service key, no secret, ever.
6. **Auth is enforced server-side on every endpoint.** Client-side route guards are
   UX only and are never the security boundary.
7. **Passwords are not stored** — auth is Google OAuth (PKCE S256) or email OTP only.

### Data integrity

8. **`onboarding_stage` is derived, never stored and never accepted from a client.**
   It is computed from `email_verified_at`, `terms_accepted_at`, an active
   subscription row, and a questionnaire row.
9. **All deliverable status changes go through `services/deliverable_state.transition()`.**
   No router, no task, no repository assigns `.status` directly. The function checks
   the transition table, the actor's role, and the revision ceiling, and writes an
   `audit_log` row in the same transaction.
10. **Quota is consumed with one atomic conditional UPDATE** (`... AND used < quota
    RETURNING`). Never SELECT-then-UPDATE. `usage_counters` also has a CHECK constraint
    as the last line of defence.
11. **Webhooks are idempotent via `payment_events (provider, provider_event_id) UNIQUE`
    + `ON CONFLICT DO NOTHING`.** The gateway webhook is the only thing that activates
    a subscription. The browser callback only polls our own DB.
12. **Instagram publishing is three phases**: create container → poll `status_code`
    until `FINISHED` → `media_publish`. `ig_creation_id` is committed to the DB before
    publishing so a crashed worker resumes instead of double-posting.
13. **Times are `TIMESTAMPTZ`, stored in UTC, rendered in the user's timezone.**
    `DATE` is only for whole-day concepts (leave, calendar slots, billing periods).
14. **Money is `BIGINT` minor units** (paise, cents) plus `CHAR(3)` currency.
    Never float, never `NUMERIC` for gateway amounts.
15. **Every repository method takes `scope: TenantScope`** as a keyword-only argument
    and filters on it. There is no way to query deliverables without saying whose.

### Correctness

16. **Migrations are hand-written for enums and constraints.** `alembic revision
    --autogenerate` is a starting point you must read and edit; it mishandles Postgres
    enums and partial indexes.
17. **Tests run against real PostgreSQL.** A test that passes on SQLite proves nothing.
18. **Files upload browser → storage directly** via presigned PUT. FastAPI issues the
    URL and confirms the object afterwards with a HEAD request.
19. **Celery beat runs as exactly one process.** Task dispatch uses
    `FOR UPDATE SKIP LOCKED` anyway.
20. **`src/types/api.ts` is generated from `/openapi.json`.** If the frontend needs a
    field, add it to the Pydantic schema first.

## 5. Code conventions

**Backend**

- Async everywhere. `async def` routes, `AsyncSession`, `asyncpg`.
- Routers are thin. If a router function is over ~25 lines, the logic belongs in a service.
- Errors: raise typed exceptions from `app/core/errors.py` (`NotFound`, `Conflict`,
  `Forbidden`, `QuotaExceeded`), mapped to HTTP by one exception handler. Routers do
  not raise `HTTPException` except for genuinely HTTP-level concerns.
- Every error response has the shape `{"error": {"code": "REVISION_LIMIT_REACHED",
  "message": "...", "details": {...}}}`. The `code` is stable and the frontend
  switches on it.
- Type hints on every function. `mypy --strict` on `app/services` and `app/core`.
- No `SELECT *` through the ORM into a response — always an explicit Pydantic schema.
- Eager-load with `selectinload` anything a serializer touches. Assert query counts in tests.

**Frontend**

- No `any`. No `@ts-ignore`. `strict: true`, `noUncheckedIndexedAccess: true`.
- Every network call goes through `lib/http.ts`. No bare `fetch` in a component.
- Every query key comes from the `qk` factory in `lib/query-keys.ts`.
- Components render; hooks fetch. A component never calls `useQuery` inline with a
  literal key.
- Named exports only, except route modules which need a default for lazy loading.
- One component per file, file named after the component.

**Both**

- Comments explain *why*, never *what*. Delete a comment that restates the code.
- No dead code, no commented-out blocks, no `console.log` / `print` left behind.
- Conventional commits: `feat(auth): rotate refresh tokens on use`.

## 6. Design system — apply from Phase 4 onward

Two surfaces, because there are two jobs. Clients judge creative work, so the portal is
a dark review surface where the work is the only bright thing. Staff move fifty items
through a pipeline, so the ops side is light and dense.

```css
/* src/styles/tokens.css */
@theme {
  /* review surface — client portal */
  --color-ink:        #0E1116;
  --color-raised:     #171B22;
  --color-hairline:   #262B34;
  --color-ink-text:   #E9ECF2;
  --color-ink-muted:  #8A93A3;

  /* ops surface — team + admin */
  --color-paper:      #FAFAF8;
  --color-card:       #FFFFFF;
  --color-rule:       #E4E4DF;
  --color-paper-text: #14171C;
  --color-paper-muted:#6B7280;

  /* functional — meaning-bearing, never decorative */
  --color-waiting:    #F0A202;  /* needs the client's decision */
  --color-motion:     #4C6FFF;  /* in progress */
  --color-settled:    #23A26D;  /* approved / published */
  --color-blocked:    #E5484D;  /* SLA breach, publish failure */

  --font-display: "Bricolage Grotesque Variable", system-ui, sans-serif;
  --font-body:    "Instrument Sans Variable", system-ui, sans-serif;
}
```

Rules that follow from this:

- Functional colors appear **only** to convey that state. No amber headings, no green
  borders for decoration, no gradient washes anywhere.
- Deliverables render as real **9:16 frames**, not cards. Status is a 3px rail down the
  left edge, not a floating pill badge.
- Tabular figures (`font-variant-numeric: tabular-nums`) on every number in a table.
  No monospace for labels.
- **One orchestrated motion moment: the approval.** Rail sweeps amber → green, the
  frame reflows into "Ready to publish". Spring, ~600ms.
- Everything else is quiet: 120ms opacity on route change, skeletons at true aspect
  ratio, `layout` animation on kanban drop only.
- **No scroll-triggered reveals. Anywhere.**
- `useReducedMotion()` collapses all durations to 0 and disables `layout`. Ship in
  the same commit as the animation, not later.
- Copy: the button says **Approve**, the toast says **Approved**. The revision button
  says **Ask for changes**, not "Reject". Empty states invite ("Your first reels land
  here once the team starts production"), they don't apologise ("No data found").

Accessibility floor, shipped not announced: visible focus rings (2px `--color-motion`,
2px offset), 44px touch targets, 4.5:1 body contrast on both surfaces, full keyboard
path through approve and ask-for-changes.

## 7. How to work

- **One phase at a time.** Finish the phase, run its acceptance checks, report, stop.
  Do not start the next phase because you have context left.
- **Run the code you write.** Migrations applied, tests executed, server booted. Paste
  real output, not a claim that it should work.
- **If an acceptance check fails, fix it before reporting.** If you cannot, say exactly
  what failed and what you tried.
- **Ask before deviating.** If an invariant blocks you, stop and explain — do not
  route around it and mention it in a footnote.
- **No placeholders.** No `# TODO: implement`, no mock data standing in for a real
  query, no stubbed function that returns a hardcoded value. If a phase genuinely
  cannot complete something, leave it out and say so in your report.
- **Never invent an external API contract.** If you are unsure of a Razorpay field or
  an Instagram parameter, say so and ask rather than guessing.
