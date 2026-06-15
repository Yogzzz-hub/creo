# AGENTS.md — Creo Development Guide

## What is Creo?

Digital marketing agency management platform. Two user-facing surfaces (public website + client portal) plus internal dashboards for teams and admins. 14 modules covering sign-up, payment, content delivery, and business ops.

## Architecture

**Monorepo** with two apps sharing common types:

```
creo/
├── apps/
│   ├── web/              # Next.js 15 (App Router, TypeScript)
│   └── api/              # Python FastAPI (async, SQLAlchemy 2.0)
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
├── .env.example          # All env vars — never commit .env
├── docker-compose.yml    # Local PostgreSQL + Redis
└── AGENTS.md
```

**Request flow:** Browser → Vercel (Next.js) → Railway (FastAPI) → Supabase (PostgreSQL/Auth/Storage/Realtime)
**Payments:** Razorpay (India) / Stripe (International) → webhook → FastAPI
**Notifications:** FastAPI → Resend (email) + MSG91 (WhatsApp + OTP)
**Instagram publishing:** FastAPI → Meta Graph API

## Tech Stack — Non-Negotiable

| Layer | Tool | Version |
|---|---|---|
| Frontend | Next.js 15, TypeScript (strict), React 19 | App Router only — no Pages Router |
| Styling | Tailwind CSS v4 + shadcn/ui | CSS custom properties, no tailwind.config.js |
| State | Zustand (global) + TanStack Query v5 (server) | |
| Forms | React Hook Form + Zod validation | |
| Backend | Python 3.12+, FastAPI | Pydantic v2 for validation |
| ORM | SQLAlchemy 2.0 (async) + Alembic | asyncpg driver, no sync DB calls |
| Queue | Celery + Redis | Background tasks only |
| DB | Supabase (PostgreSQL 15) | PgBouncer pooler in production |
| Auth | Supabase Auth (Google OAuth + Phone OTP via MSG91) | JWT validated in FastAPI middleware |

## Directory Conventions

**Frontend** (`apps/web/`):
```
app/
├── (public)/          # Marketing pages — no auth required
│   ├── page.tsx       # Home /
│   ├── about/
│   ├── portfolio/
│   ├── clients/
│   ├── pricing/
│   ├── faq/
│   └── signup/        # Account creation + plan selection
├── (auth)/            # Auth flow — pre-login
│   ├── login/
│   └── onboarding/    # Post-payment questionnaire
├── (portal)/          # Client portal — protected
│   └── portal/
│       ├── page.tsx   # Dashboard
│       ├── deliverables/
│       ├── calendar/
│       ├── payments/
│       ├── addons/
│       ├── support/
│       └── account/
├── (internal)/        # Team & admin — protected
│   ├── dashboard/     # Team member view
│   ├── admin/         # Admin panel
│   └── kpi/           # KPI dashboard
└── layout.tsx         # Root layout
```

Server Components by default. `'use client'` only when needed (interactivity, hooks, browser APIs).

**Backend** (`apps/api/`):
```
├── main.py            # FastAPI entry point
├── core/
│   ├── config.py      # pydantic-settings from env vars
│   ├── database.py    # SQLAlchemy async engine + session
│   └── security.py    # JWT validation, Supabase auth helpers
├── models/            # SQLAlchemy ORM — one file per table
├── schemas/           # Pydantic request/response
├── routers/           # Route modules — one per domain
├── services/          # Business logic (ai_analysis, whatsapp, email, payments, instagram)
├── workers/           # Celery tasks (reports, notifications)
├── alembic/           # Database migrations
└── tests/
```

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Python files | snake_case | `ai_analysis.py` |
| Python functions | snake_case | `get_client_deliverables()` |
| Python classes | PascalCase | `DeliverableSchema` |
| TypeScript files | kebab-case | `deliverable-card.tsx` |
| TS components | PascalCase | `DeliverableCard` |
| TS hooks | `use` prefix camelCase | `useDeliverables` |
| DB tables | snake_case plural | `content_calendar` |
| DB columns | snake_case | `created_at` |
| API routes | kebab-case under `/api/v1/` | `/api/v1/content-calendar` |
| Env vars | SCREAMING_SNAKE_CASE | `RAZORPAY_KEY_SECRET` |
| Git commits | Conventional Commits | `feat: add Razorpay webhook handler` |
| Git branches | kebab-case | `feat/add-addon-system` |

## Security Rules — Hard

- `SUPABASE_SERVICE_ROLE_KEY` — NEVER expose to frontend or commit to git
- All payment webhook endpoints — validate signatures before processing
- Instagram access tokens — store encrypted, never in plaintext
- All API endpoints except `/health` and webhooks — require valid JWT
- Auth endpoints — rate limit 5 attempts/minute/IP

## Key Technical Decisions

- **Soft deletes on clients** — `deleted_at` column, never hard delete
- **All timestamps UTC** — convert to local time in frontend
- **File uploads go directly to Supabase Storage** — never through FastAPI
- **Heavy ops (reports, AI, email) go to Celery** — never block API thread
- **API response envelope:** `{ data, error, meta }` for all endpoints
- **Role enforcement:** FastAPI dependency injection on every protected route
- **Session timeouts:** client 30 days, internal 8 hours, admin 4 hours

## User Roles & Access

| Role | Can Access |
|---|---|
| client | `/portal/*` only |
| team_member | `/dashboard/*` |
| team_lead | `/dashboard/*` + team overview |
| sales | `/sales/*` |
| admin | `/admin/*`, `/kpi` |
| investor_relations | `/admin/reports`, `/kpi` only |
| super_admin | Everything + platform settings |

Role-based redirect after login is mandatory. Wrong-role access → silent redirect to correct surface (no 403 page).

## Onboarding Gate

Client with incomplete onboarding visiting `/portal/*` → redirected to correct pending step. Check order: verify → terms → payment → questionnaire. Never skip steps.

## Design Tokens

Brand Blue: `#2B7BC4` · Sky Wash: `#E8F4FD` · Deep Navy: `#0D2137` · Steel Mid: `#6BAED6` · Ocean Accent: `#0EA5E9`

Font: Inter (primary), JetBrains Mono (monospace). Base-4 spacing scale. 12-col grid desktop, 6-col tablet, 4-col mobile.

## Implementation Order

10 phases — build sequentially, never skip ahead:
1. Project setup & monorepo
2. Database & migrations (all 20 tables + RLS)
3. Authentication (Supabase Auth + JWT + role routing)
4. Public website (6 pages)
5. Onboarding flow (signup → payment → questionnaire → AI analysis)
6. Client portal (7 sections — largest phase)
7. Internal dashboard (team tasks, calendar, chat, leave)
8. Admin panel & KPI (reports, escalations, announcements)
9. Third-party integrations (MSG91, Resend, Instagram, Celery)
10. Hardening & deployment (testing, CI/CD, production)

## Local Development

```bash
# Frontend
cd apps/web && npm run dev          # localhost:3000

# Backend
cd apps/api && uvicorn main:app --reload  # localhost:8000

# Database + Redis
docker-compose up -d

# Migrations
cd apps/api && alembic upgrade head
```

## CI/CD

- GitHub Actions on every push
- Frontend: Vercel auto-deploys (main → production, dev → staging)
- Backend: Pytest → Railway deploy via CLI
- Alembic migrations run automatically on Railway deployment

## Testing

- Backend: `pytest` + `pytest-asyncio` in `apps/api/tests/`
- Frontend: Playwright E2E for critical user journeys
- Run `pytest` before any deployment
- All critical paths covered: auth, deliverables, payments, tasks, tickets

## Open Items to Know

- Payment gateway: Razorpay (India) recommended, Stripe (International)
- SMS provider: MSG91
- Email: Resend (3,000 free/month)
- AI: OpenAI GPT-4o for brand analysis
- Pricing amounts — TBD, managed via admin panel from DB `plans` table
