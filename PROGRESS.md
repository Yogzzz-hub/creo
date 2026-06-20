# Creo — Implementation Progress

## Phase 1: Project Setup & Monorepo

- [x] 1.1 Initialise monorepo — create root directory creo/ with apps/ and packages/ folders
- [x] 1.2 Initialise Next.js 15 app in apps/web/ with TypeScript and App Router
- [x] 1.3 Initialise FastAPI project in apps/api/ with uvicorn, pydantic-settings, and folder structure per TRD
- [x] 1.4 Configure Tailwind CSS v4 in apps/web/ with CSS custom properties from UI/UX Design Brief Section 11
- [x] 1.5 Install and configure shadcn/ui — add Button, Card, Table, Dialog, Form, Input, Badge, Toast components
- [x] 1.6 Set up Inter and JetBrains Mono fonts via Google Fonts in Next.js layout
- [x] 1.7 Create shared packages/types/ with TypeScript interfaces for all major entities
- [x] 1.8 Create .env.example at root with all variables listed in TRD Section 9
- [x] 1.9 Set up GitHub repository with main and dev branches. Add .gitignore for both Next.js and Python
- [ ] 1.10 Configure GitHub Actions CI workflow — runs Next.js build check and Python pytest on every push
- [x] 1.11 Create docker-compose.yml for local development: PostgreSQL + Redis services
- [x] 1.12 Set up Alembic in apps/api/alembic/ — configure env.py to read DATABASE_URL from environment
- [x] 1.13 Configure FastAPI main.py — CORS, router registration, health check endpoint at /health
- [x] 1.14 Add requirements.txt with all packages listed in TRD Section 11.2
- [x] 1.15 Configure apps/web/package.json with all packages listed in TRD Section 11.1

## Phase 2: Database & Migrations

- [x] 2.1 Create Supabase project — note project URL, anon key, service role key, and JWT secret. Add to .env files.
- [x] 2.2 Write migration 001 — create all enum types listed in Schema Document Section 2
- [x] 2.3 Write migration 002 — create users table with all columns from Schema Section 3.1
- [x] 2.4 Write migration 003 — create plans table + seed Starter, Growth, Pro rows with placeholder prices
- [x] 2.5 Write migration 004 — create subscriptions table
- [x] 2.6 Write migration 005 — create questionnaires table
- [x] 2.7 Write migration 006 — create team_members table
- [x] 2.8 Write migration 007 — create client_assignments table
- [x] 2.9 Write migration 008 — create content_plans table
- [x] 2.10 Write migration 009 — create content_calendar table
- [x] 2.11 Write migration 010 — create tasks table
- [x] 2.12 Write migration 011 — create deliverables and deliverable_comments tables
- [x] 2.13 Write migration 012 — create tickets and ticket_messages tables
- [x] 2.14 Write migration 013 — create addons and addon_pricing tables + seed addon_pricing with TBD prices
- [x] 2.15 Write migration 014 — create notifications table
- [x] 2.16 Write migration 015 — create leave_requests table
- [x] 2.17 Write migration 016 — create escalations table
- [x] 2.18 Write migration 017 — create announcements table
- [x] 2.19 Write migration 018 — create custom_pricing table
- [ ] 2.20 Write migration 021 — enable RLS on all tables and create all policies from Schema Section 6
- [ ] 2.21 Write migration 022 — create updated_at auto-update trigger function and apply to all tables
- [ ] 2.22 Write migration 023 — create all indexes listed in Schema Section 5
- [x] 2.23 Run alembic upgrade head against Supabase — verify all tables created correctly in Supabase dashboard
- [x] 2.24 Create SQLAlchemy async models in apps/api/models/ for every table — one file per table
- [x] 2.25 Create Pydantic v2 schemas in apps/api/schemas/ for request and response types for all entities
- [x] 2.26 Set up Supabase Storage buckets: deliverables, portfolio, avatars, announcements, ticket-attachments, content-plans

## Phase 3: Authentication

- [x] 3.1 Configure Supabase Auth in Supabase dashboard — enable Google OAuth provider and Phone/OTP provider
- [ ] 3.2 Configure Google OAuth — create Google Cloud project, set OAuth credentials, add redirect URI (Deferred to later phase)
- [ ] 3.3 Configure MSG91 for OTP SMS delivery — set up Supabase Auth custom SMS provider hook to use MSG91 (Deferred to later phase)
- [x] 3.4 Create FastAPI JWT middleware in core/security.py — validate Supabase JWT, extract user ID and role
- [x] 3.5 Create FastAPI dependency get_current_user() — returns user from DB using auth_id from JWT
- [x] 3.6 Create FastAPI role dependencies: require_client(), require_team_member(), require_admin(), etc.
- [x] 3.7 Create auth router in routers/auth.py — POST /api/v1/auth/register (creates user row after Supabase signup)
- [x] 3.8 Create /login page in Next.js — two options: Continue with Google, Continue with Phone
- [ ] 3.9 Implement Google OAuth sign-in flow in Next.js using Supabase JS client
- [ ] 3.10 Implement Phone OTP flow — phone input → OTP send → OTP verify → session created
- [x] 3.11 Create auth callback page at /auth/callback — handles OAuth redirect, creates session
- [x] 3.12 Create Supabase auth state listener in Next.js — updates session on auth state change
- [x] 3.13 Implement role-based redirect after login — reads role from JWT claims, routes to correct surface
- [x] 3.14 Create Next.js middleware (middleware.ts) — protects all /portal/*, /dashboard/*, /admin/*, /kpi/* routes
- [x] 3.15 Implement onboarding gate in middleware — redirects clients with incomplete onboarding to correct step
- [x] 3.16 Implement logout — clears Supabase session, clears cookies, redirects to /login
- [x] 3.17 Create /signup and /signup/plan pages — account creation and plan selection forms with validation
- [x] 3.18 Wire sign-up form to Supabase Auth signUp() — creates auth user, then calls /api/v1/auth/register
- [x] 3.19 Write Pytest tests for auth middleware — test each role accessing allowed and forbidden routes
- [x] 3.20 Test full auth flow end-to-end: Google sign-in → role redirect → logout → OTP sign-in → role redirect

## Phase 4: Public Website

- [x] 4.1 Build shared public layout — top navigation bar with links and 'Get Started' CTA button
- [x] 4.2 Build sticky bottom CTA bar — desktop/tablet only, disappears at footer
- [x] 4.3 Build footer component with all links, contact options, and legal links
- [x] 4.4 Build exit intent popup — triggers on cursor-to-close-button on desktop, once per session
- [x] 4.5 Build Home page (/) — hero section, How It Works, stats strip, lead magnet banner
- [x] 4.6 Build About Us page (/about) — mission, team section, differentiators, bottom CTA
- [x] 4.7 Build Portfolio page (/portfolio) — case study cards + filterable creative gallery
- [x] 4.8 Build Our Clients page (/clients) — logo wall, testimonials, success stats, team profiles
- [x] 4.9 Build Pricing page (/pricing) — 3 plan cards with urgency triggers, scarcity indicator
- [x] 4.10 Build FAQ page (/faq) — accordion FAQ with objection-handling copy, bottom CTA
- [x] 4.11 Create FastAPI endpoint GET /api/v1/plans — returns plan data for pricing page
- [x] 4.12 Wire pricing page to /api/v1/plans — plan cards populated from database
- [x] 4.13 Implement plan pre-selection — /signup?plan=growth pre-selects Growth on sign-up plan step
- [x] 4.14 Add meta titles, descriptions, and OpenGraph tags to all public pages
- [x] 4.15 Add LocalBusiness JSON-LD schema markup to home page
- [x] 4.16 Implement full mobile responsiveness for all public pages — hamburger menu, stacked layouts
- [x] 4.17 Configure Next.js Image component for all portfolio and team images — optimise and lazy-load
- [x] 4.18 Build admin-configurable scarcity counter — reads from platform settings API

## Phase 5: Onboarding Flow

- [x] 5.1 Build shared onboarding layout — step indicator, no sidebar, Sky Wash background
- [x] 5.2 Build /onboarding/verify page — email sent message, resend button, auto-redirect on verify
- [x] 5.3 Build /onboarding/terms page — scrollable T&C panel, scroll-gated 'I Agree' button
- [x] 5.4 Create FastAPI endpoint POST /api/v1/onboarding/accept-terms
- [x] 5.5 Wire /onboarding/terms to 5.4 — on accept, updates DB and advances to payment step
- [x] 5.6 Create FastAPI endpoint POST /api/v1/payments/create-subscription
- [ ] 5.7 Build /onboarding/payment page — detects country, renders Razorpay or Stripe payment modal
- [x] 5.8 Implement Razorpay payment modal integration
- [x] 5.9 Implement Stripe payment modal integration
- [x] 5.10 Create FastAPI Razorpay webhook handler at /api/webhooks/razorpay
- [x] 5.11 Create FastAPI Stripe webhook handler at /api/webhooks/stripe
- [ ] 5.12 Build /onboarding/questionnaire page — 3-step form with step indicator
- [x] 5.13 Create FastAPI endpoint POST /api/v1/questionnaire
- [x] 5.14 Set up Celery app in workers/celery_app.py — connect to Redis broker
- [x] 5.15 Write Celery task generate_ai_analysis() — calls OpenAI GPT-4o, stores result in DB
- [x] 5.16 Write OpenAI prompt in services/ai_analysis.py
- [ ] 5.17 Build /onboarding/complete page — confirmation message, animated progress indicator
- [x] 5.18 Wire questionnaire submission — POST to 5.13, poll for AI completion
- [x] 5.19 Add 'Not satisfied with pricing?' link on /onboarding/payment
- [x] 5.20 Test complete onboarding flow end-to-end

## Phase 6: Client Portal

- [x] 6.1 Build client portal layout — left sidebar (desktop), bottom tab bar (mobile)
- [x] 6.2 Build portal Dashboard — activity summary strip, brand summary card, onboarding tracker
- [x] 6.3 Create FastAPI endpoint GET /api/v1/portal/dashboard
- [ ] 6.4 Wire dashboard to 6.3 — all dashboard components populated from API
- [x] 6.5 Build Deliverables list page — card grid, filter bar, empty state
- [x] 6.6 Build Deliverable detail page — image/video preview, approve/reject actions
- [x] 6.7 Create FastAPI endpoints: GET /api/v1/deliverables, approve, reject
- [ ] 6.8 Wire deliverables pages to API
- [x] 6.9 Implement rejection flow — mandatory comment box, revision ticket created
- [x] 6.10 Implement download — signed Supabase Storage URL
- [x] 6.11 Build Content Calendar page — monthly grid + list view toggle
- [x] 6.12 Create FastAPI endpoint GET /api/v1/calendar
- [ ] 6.13 Wire calendar to API
- [x] 6.14 Build Payments page — current plan card, payment history, plan change buttons
- [x] 6.15 Create FastAPI endpoints: GET /api/v1/payments/history, POST /api/v1/payments/change-plan
- [ ] 6.16 Implement plan upgrade/downgrade — proration calculation
- [x] 6.17 Build Add-ons page — type cards, quantity selector, payment flow
- [x] 6.18 Create FastAPI endpoints: GET /api/v1/addons/pricing, POST /api/v1/addons/purchase
- [ ] 6.19 Implement add-on purchase — payment, task auto-creation on webhook
- [x] 6.20 Build contextual upsell prompts
- [x] 6.21 Build Support page — ticket list, new ticket form, ticket detail with chat thread
- [x] 6.22 Create FastAPI endpoints: tickets CRUD + messages
- [~] 6.23 Implement Supabase Realtime for live chat
- [x] 6.24 Build Account Settings pages — business profile, password, Instagram, 2FA
- [~] 6.25 Implement Instagram OAuth flow
- [x] 6.26 Create FastAPI endpoint POST /api/v1/account/instagram
- [x] 6.27 Build in-portal notification system — bell icon, dropdown, mark-as-read
- [x] 6.28 Create FastAPI endpoint GET /api/v1/notifications
- [x] 6.29 Wire all portal pages to loading skeletons
- [x] 6.30 Test all client portal flows

## Phase 7: Internal Dashboard

- [x] 7.1 Build internal dashboard layout — Deep Navy sidebar, role-filtered navigation
- [x] 7.2 Build team member Dashboard — daily goal metrics, today's tasks
- [x] 7.3 Create FastAPI endpoint GET /api/v1/dashboard/team
- [x] 7.4 Build Tasks list page — Today/Upcoming/All tabs, priority-sorted
- [x] 7.5 Build Task detail page — client info, brief, file upload
- [x] 7.6 Create FastAPI endpoints: tasks CRUD + submit
- [x] 7.7 Implement deliverable file submission from task card
- [x] 7.8 Build team member Calendar page — 1-day pre-assignment view
- [x] 7.9 Create FastAPI endpoint GET /api/v1/calendar/team
- [x] 7.10 Build Live Chat page — assigned client threads, real-time chat
- [x] 7.11 Wire live chat to Supabase Realtime
- [x] 7.12 Build Leave Requests page — list + new request form
- [x] 7.13 Create FastAPI endpoints: GET /api/v1/leave, POST /api/v1/leave
- [x] 7.14 Build Team Overview page (team leads only) — per-member metrics
- [x] 7.15 Create FastAPI endpoint GET /api/v1/team/overview
- [x] 7.16 Implement task self-assignment from pending queue
- [x] 7.17 Create FastAPI endpoints: request-assignment, approve-assignment
- [x] 7.18 Build Sales dashboard — client pipeline, custom pricing form
- [x] 7.19 Create FastAPI endpoints: GET /api/v1/sales/clients, POST custom-pricing-request
- [x] 7.20 Test all internal dashboard flows

## Phase 8: Admin Panel & KPI

<<<<<<< HEAD
- [ ] 8.1 Build admin panel layout — Deep Navy sidebar, admin-specific navigation
- [ ] 8.2 Build Admin Dashboard — platform health overview
- [x] 8.3 Create FastAPI endpoint GET /api/v1/admin/dashboard
- [ ] 8.4 Build Client Management page — full list with search and filter
- [ ] 8.5 Build Client Profile page — two-panel layout
- [x] 8.6 Create FastAPI endpoints: GET /api/v1/admin/clients, GET /api/v1/admin/clients/{id}
- [ ] 8.7 Build Team Management page — departments, employee list, daily cap
- [x] 8.8 Create FastAPI endpoints: team CRUD
- [ ] 8.9 Build Leave Approvals page — pending requests, approve/reject
- [x] 8.10 Create FastAPI endpoints: leave approve/reject
- [ ] 8.11 Build Escalations page — active and historical
- [x] 8.12 Create FastAPI endpoints: escalations CRUD
- [ ] 8.13 Build Consolidated Calendar page — all client calendars
- [ ] 8.14 Build Admin Reports page — weekly, monthly, financial with export
- [x] 8.15 Write Celery task generate_weekly_report()
- [x] 8.16 Write Celery task generate_monthly_report()
- [x] 8.17 Write Celery task generate_financial_report()
- [x] 8.18 Schedule Celery beat — weekly Monday 08:00, monthly 1st 08:00
- [x] 8.19 Implement PDF export using ReportLab or WeasyPrint
- [x] 8.20 Implement Excel export using openpyxl
- [ ] 8.21 Build KPI Dashboard — live metric cards, delivery rate, capacity bars
- [x] 8.22 Create FastAPI endpoint GET /api/v1/admin/kpi
- [x] 8.23 Implement KPI role filtering
- [ ] 8.24 Build Announcements page — MoM, newsletter, general
- [x] 8.25 Create FastAPI endpoints: announcements CRUD
- [ ] 8.26 Build Platform Settings page — pricing editors, SLA thresholds
- [x] 8.27 Create FastAPI endpoints: settings CRUD
- [x] 8.28 Implement custom pricing approval flow
- [ ] 8.29 Build Sales Admin section
- [x] 8.30 Test admin panel end-to-end
=======
- [x] 8.1 Build admin panel layout — Deep Navy sidebar, admin-specific navigation
- [x] 8.2 Build Admin Dashboard — platform health overview
- [ ] 8.3 Create FastAPI endpoint GET /api/v1/admin/dashboard
- [x] 8.4 Build Client Management page — full list with search and filter
- [x] 8.5 Build Client Profile page — two-panel layout
- [ ] 8.6 Create FastAPI endpoints: GET /api/v1/admin/clients, GET /api/v1/admin/clients/{id}
- [x] 8.7 Build Team Management page — departments, employee list, daily cap
- [ ] 8.8 Create FastAPI endpoints: team CRUD
- [x] 8.9 Build Leave Approvals page — pending requests, approve/reject
- [ ] 8.10 Create FastAPI endpoints: leave approve/reject
- [x] 8.11 Build Escalations page — active and historical
- [ ] 8.12 Create FastAPI endpoints: escalations CRUD
- [x] 8.13 Build Consolidated Calendar page — all client calendars
- [x] 8.14 Build Admin Reports page — weekly, monthly, financial with export
- [ ] 8.15 Write Celery task generate_weekly_report()
- [ ] 8.16 Write Celery task generate_monthly_report()
- [ ] 8.17 Write Celery task generate_financial_report()
- [ ] 8.18 Schedule Celery beat — weekly Monday 08:00, monthly 1st 08:00
- [ ] 8.19 Implement PDF export using ReportLab or WeasyPrint
- [ ] 8.20 Implement Excel export using openpyxl
- [x] 8.21 Build KPI Dashboard — live metric cards, delivery rate, capacity bars
- [ ] 8.22 Create FastAPI endpoint GET /api/v1/admin/kpi
- [ ] 8.23 Implement KPI role filtering
- [x] 8.24 Build Announcements page — MoM, newsletter, general
- [ ] 8.25 Create FastAPI endpoints: announcements CRUD
- [x] 8.26 Build Platform Settings page — pricing editors, SLA thresholds
- [ ] 8.27 Create FastAPI endpoints: settings CRUD
- [ ] 8.28 Implement custom pricing approval flow
- [x] 8.29 Build Sales Admin section
- [ ] 8.30 Test admin panel end-to-end
>>>>>>> test-yoga-merge

## Phase 9: Third-party Integrations

- [x] 9.1 Build Resend email service in services/email.py
- [x] 9.2 Create React Email templates in apps/web/emails/
- [ ] 9.3 Wire all notification trigger points to Resend
- [x] 9.4 Build MSG91 service in services/whatsapp.py
- [ ] 9.5 Implement incomplete sign-up WhatsApp automation
- [ ] 9.6 Submit WhatsApp message templates to Meta for approval
- [ ] 9.7 Wire payment failure WhatsApp
- [x] 9.8 Build Instagram publishing service in services/instagram.py
- [x] 9.9 Create FastAPI endpoint POST /api/v1/deliverables/{id}/publish-instagram
- [x] 9.10 Add 'Publish to Instagram' button on approved deliverables
- [x] 9.11 Handle Instagram token refresh
- [x] 9.12 Write Celery task check_sla_breaches()
- [x] 9.13 Write Celery task send_renewal_reminders()
- [x] 9.14 Write Celery task check_quota_exhaustion()
- [x] 9.15 Write Celery task auto_assign_tasks()
- [x] 9.16 Write Celery task generate_content_calendar()
- [x] 9.17 Test all Celery tasks
- [x] 9.18 Test all WhatsApp messages
- [x] 9.19 Test all Resend emails
- [x] 9.20 Test Instagram publishing

## Phase 10: Hardening & Deployment

- [x] 10.1 Add global error boundary in Next.js
- [ ] 10.2 Add FastAPI global exception handler
- [ ] 10.3 Implement rate limiting on auth endpoints
- [ ] 10.4 Audit all API endpoints — role dependencies
- [ ] 10.5 Add webhook signature validation tests
- [ ] 10.6 Encrypt Instagram access tokens at rest
- [x] 10.7 Run Lighthouse audit on all public pages
- [x] 10.8 Add TanStack Query caching strategy
- [x] 10.9 Implement optimistic updates on approve/reject
- [ ] 10.10 Write Pytest integration tests
- [x] 10.11 Write Playwright E2E tests
- [ ] 10.12 Manual QA pass — all 7 user journeys
- [ ] 10.13 Set up Vercel project
- [ ] 10.14 Set up Railway project
- [ ] 10.15 Configure Railway Redis service
- [ ] 10.16 Update GitHub Actions CI — Railway deploy step
- [ ] 10.17 Run alembic upgrade head against production Supabase
- [ ] 10.18 Configure Supabase production project — RLS, Auth redirect URLs
- [ ] 10.19 Configure Vercel production environment variables
- [ ] 10.20 Configure production Razorpay — live keys
- [ ] 10.21 Configure production Stripe — live keys
- [ ] 10.22 Submit Instagram Graph API app for Meta review
- [ ] 10.23 Set up Celery beat scheduler in Railway
- [ ] 10.24 Deploy to production
- [ ] 10.25 Post-deploy smoke test

## Integration Point 1: PR Review Fixes

- [x] Fixed idempotency in payments router
- [x] Fixed Razorpay webhook notes payload mapping
- [x] Fixed dependency override leaks and relative imports in tests
