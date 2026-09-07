# Creo — Phase Build Prompts

Nine prompts. Run them **one at a time**, in order, in the same agent session or repo.
Each assumes `CLAUDE.md` sits at the repo root and the agent has read it.

## How to run

```bash
mkdir creo && cd creo
# drop CLAUDE.md at the root
claude          # or your agent of choice
```

Then paste Phase 0. When it reports done, verify the acceptance checks yourself, then
paste Phase 1. Never paste two phases at once — the agent will rush the first to get
to the second.

If a phase fails, do not paste the next one. Paste this instead:

> The acceptance check `<paste the exact failing command and output>` did not pass.
> Fix it. Do not change the acceptance criteria to match the code. Re-run and show me
> the real output.

---

# PHASE 0 — Foundations

```
Read CLAUDE.md fully before you start. This is Phase 0 of 9. Do only Phase 0.

Goal: a running local development environment. No business logic yet.

Build:

1. Repo skeleton exactly as laid out in CLAUDE.md §3. Create every directory with a
   .gitkeep where it would otherwise be empty.

2. docker-compose.yml with postgres:15-alpine (db "creo", port 5432) and redis:7-alpine
   (port 6379), both with healthchecks and a named volume for Postgres.

3. backend/ :
   - pyproject.toml with fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg,
     alembic, pydantic, pydantic-settings, celery[redis], redis, httpx, structlog,
     python-jose[cryptography], and dev extras: pytest, pytest-asyncio, ruff, mypy.
   - app/config.py using pydantic-settings. Secrets have NO defaults — a missing
     JWT_SECRET must raise at import. Non-secrets (ACCESS_TOKEN_MINUTES, ENVIRONMENT)
     may have defaults.
   - app/db/session.py: async engine with the PgBouncer-safe connect_args from
     CLAUDE.md, async_sessionmaker, and a get_db dependency that yields and closes.
   - app/core/logging.py: structlog to JSON in prod, console renderer in dev.
   - app/core/errors.py: AppError base plus NotFound, Conflict, Forbidden,
     QuotaExceeded, each with a `code` string. One FastAPI exception handler that
     renders them as {"error": {"code","message","details"}}.
   - app/core/middleware.py: RequestIdMiddleware that reads or generates X-Request-Id,
     binds it to the structlog context, and echoes it on the response.
   - app/main.py: FastAPI app, CORS from settings (explicit origin list, credentials
     true), the middleware, the exception handler, and
     GET /api/v1/health returning {"status","db","redis","version"} where db and redis
     are checked with a real SELECT 1 and PING.

4. frontend/ : npm create vite@latest with react-ts, then React 19, Tailwind v4 via
   @tailwindcss/vite, TanStack Query v5, React Router v7, motion v12, Biome.
   - vite.config.ts proxies /api to http://localhost:8000 so the browser sees one origin.
   - src/styles/tokens.css with the @theme block from CLAUDE.md §6.
   - tsconfig with strict, noUncheckedIndexedAccess, noImplicitOverride.
   - A single route "/" that calls /api/v1/health through the proxy and renders the
     three status values. Plain, unstyled beyond the tokens — this is a smoke test,
     not a screen.

5. .env.example listing every variable from the architecture doc with empty values and
   a one-line comment each. .gitignore covering .env, __pycache__, node_modules, dist,
   .venv.

6. .github/workflows/ci.yml: on push and PR, spin up postgres+redis services, run
   ruff check, mypy app/core, pytest, then npm ci, biome check, tsc --noEmit, npm run build.

Acceptance — run these and paste the real output:
  docker compose up -d && docker compose ps          # both healthy
  cd backend && uvicorn app.main:app --reload        # boots clean
  curl localhost:8000/api/v1/health                  # db:"ok", redis:"ok"
  cd frontend && npm run dev                         # localhost:5173 shows ok/ok
  unset JWT_SECRET; python -c "from app.config import settings"   # must RAISE

Report what you built, then stop. Do not begin Phase 1.
```

---

# PHASE 1 — Data layer

```
Phase 1 of 9. Phase 0 is done and passing. Do only Phase 1.

Goal: the complete schema, migrated, seeded, and covered by tests.

Source of truth: the DDL in Part III of the Creo Architecture v2 document. Reproduce it
faithfully as SQLAlchemy 2.0 declarative models with Mapped[] annotations.

Build:

1. app/db/base.py: DeclarativeBase, a TimestampMixin (created_at, updated_at, both
   TIMESTAMPTZ server_default now()), and a UUIDPrimaryKeyMixin.

2. app/models/ — one module per aggregate, all of:
   user.py         users, client_profiles, staff_profiles
   billing.py      plans, subscriptions, payment_events, usage_counters
   work.py         tasks, deliverables, content_calendar, client_assignments
   support.py      tickets, ticket_messages
   ops.py          leave_requests, announcements, audit_log, notifications
   auth.py         refresh_tokens, idempotency_keys
   questionnaire.py questionnaires
   enums.py        every Postgres enum as a Python StrEnum

   Every column, constraint, partial index and CHECK from the architecture doc.
   Do not simplify, do not drop a constraint because SQLAlchemy makes it awkward.

3. Migration 0001, HAND-WRITTEN, not autogenerated:
   - CREATE EXTENSION pgcrypto, citext, pg_trgm, btree_gist
   - every CREATE TYPE ... AS ENUM
   - the touch_updated_at() trigger function and a trigger on every table with updated_at
   - all tables, in dependency order
   - all indexes including the partial ones (uq_sub_active_per_client,
     uq_deliv_creation, idx_deliv_due, uq_one_primary_am, idx_notif_unread)
   - a downgrade() that actually reverses it, including DROP TYPE

4. Migration 0002: the v_client_onboarding VIEW from Part IV.2 of the architecture doc,
   and the mv_exec_kpis MATERIALIZED VIEW with its unique index.

5. alembic/env.py reads DIRECT_DATABASE_URL (port 5432), never the pooler. Add a
   comment saying why.

6. app/repositories/base.py: a TenantScope dataclass (client_id, user_id, role) and a
   BaseRepository whose every read method signature requires `*, scope: TenantScope`.
   Implement DeliverableRepository and TaskRepository against it.

7. scripts/seed.py — idempotent, safe to re-run:
   3 plans (starter/growth/pro with real quota JSON and revision_rounds 1/2/3),
   1 super_admin, 1 team_lead, 2 editors, 1 designer with staff_profiles,
   4 clients at onboarding stages 1, 2, 3 and 5,
   ~40 deliverables for the stage-5 client spread across EVERY deliverable_status,
   ~25 tasks across every task_status, 3 tickets with message threads,
   usage_counters seeded for the current period.

8. tests/conftest.py: a session-scoped fixture that creates a real test database,
   runs alembic upgrade head against it, and gives each test a transaction that
   rolls back. NO SQLite.
   tests/test_models.py: assert every constraint actually bites —
   - inserting usage_counters with used > quota raises IntegrityError
   - a second active subscription for one client raises IntegrityError
   - two deliverables with the same (root_id, version) raises IntegrityError
   - two deliverables with the same non-null ig_creation_id raises IntegrityError
   - status='scheduled' with scheduled_at NULL raises IntegrityError
   - updated_at actually changes on UPDATE

Acceptance:
  alembic upgrade head && alembic downgrade base && alembic upgrade head   # clean both ways
  python scripts/seed.py && python scripts/seed.py                          # idempotent
  pytest tests/test_models.py -v                                            # all green
  psql -c "\d+ deliverables"                                                # every index present

Report, then stop.
```

---

# PHASE 2 — Authentication

```
Phase 2 of 9. Do only Phase 2.

Goal: the complete auth system. Every invariant in CLAUDE.md §4.1–4.7 must hold.

Build:

1. app/core/security.py
   - create_access_token(user) → HS256 JWT with sub, role, tv, jti, exp (15 min)
   - decode_access_token(token) → claims or raise
   - new_refresh_token() → (plaintext 32 random bytes urlsafe, sha256 hash)
   - hash_otp / verify_otp using a pepper and hmac.compare_digest
   - encrypt/decrypt helpers (Fernet) for ig_token_encrypted

2. app/core/cache.py — Redis user cache:
   get_cached_user(user_id) / set_cached_user(user, ttl=300) / invalidate_user(user_id)
   Cache the user row, NOT token validity.

3. app/core/deps.py
   - get_current_user: read Bearer → decode → load user (Redis, fall back to DB) →
     compare claims["tv"] to user.token_version → 401 on mismatch → 403 if
     account_status in (suspended, churned)
   - require_roles(*roles) factory, plus the ClientUser / StaffUser / AdminUser aliases
     from the architecture doc

4. app/core/ratelimit.py — Redis fixed-window limiter, usable as a dependency:
   rate_limit("otp_send", key=email, limit=5, window=3600)

5. app/services/auth_service.py — all logic lives here, routers stay thin:
   - send_otp: generate 6 digits, store {hash, attempts} in Redis with 300s TTL,
     enqueue the email. Return an IDENTICAL response and similar latency whether or
     not the email exists. This must not be a user-enumeration oracle.
   - verify_otp: constant-time compare, increment attempts, burn the code at 5,
     upsert the user, set email_verified_at, issue tokens.
   - google_auth_url: PKCE S256 verifier + signed state, both in Redis for 10 min.
   - google_callback: validate state, exchange code + verifier, upsert user, mint a
     single-use 60-second opaque auth_code in Redis, return a redirect URL carrying
     ONLY that code.
   - exchange_auth_code: burn the code, issue tokens.
   - rotate_refresh: look up sha256(presented). If used_at IS NOT NULL → the family was
     stolen: revoke every token in family_id, increment users.token_version, invalidate
     the Redis cache, return 401. Otherwise mark used, issue a new token in the same
     family, return both.
   - logout: revoke the family. logout_all: increment token_version.

6. app/routers/auth.py
   POST /auth/send-otp, /auth/verify-otp, /auth/refresh, /auth/logout, /auth/logout-all
   GET  /auth/google/url, /auth/google/callback
   POST /auth/exchange
   GET  /auth/me
   Refresh cookie: httponly, secure, samesite from settings, path="/api/v1/auth",
   max_age 30 days. Access token in the JSON body only.

7. Frontend:
   - src/lib/auth-store.ts: the access token in a module variable. Exported getter and
     setter. If you write to localStorage anywhere you have failed this phase.
   - src/lib/http.ts: the fetch wrapper from Part V of the architecture doc, with the
     SHARED refreshPromise so ten concurrent 401s trigger exactly one rotation.
   - src/features/auth/: AuthProvider that boots by calling /auth/refresh and holds
     status 'loading'|'authed'|'anon'; ProtectedRoute that renders a skeleton while
     loading (never a login flash) and redirects with a returnTo; login route with the
     OTP form and the Google button; /auth/complete route that POSTs the auth_code.

8. Tests — these five must be green, they are the point of the phase:
   1. expired access token → 401 → silent refresh → the original request succeeds
   2. replaying a used refresh token revokes the whole family, bumps token_version,
      and every sibling access token 401s on its next request
   3. the 6th OTP send within an hour → 429
   4. the 6th wrong OTP attempt burns the code; a subsequent correct guess fails
   5. incrementing token_version invalidates live access tokens within one request
   Plus: send-otp returns an identical body for a known and an unknown email.

Acceptance:
  pytest tests/test_auth.py -v                    # all green including the five above
  grep -rn "localStorage\|sessionStorage" frontend/src   # ZERO hits
  Manual: log in, hard-refresh the page, stay logged in. Log out in tab A,
          tab B's next request 401s and redirects.

Report, then stop.
```

---

# PHASE 3 — Onboarding and payments

```
Phase 3 of 9. Do only Phase 3.

Goal: a client can go from signup to an active portal account, paying real test money,
with webhooks that survive replay.

Build:

1. app/services/onboarding_service.py
   - current_stage(db, client_id): query v_client_onboarding. Never read a stored
     column, never accept a stage from the request body.
   - accept_terms: write terms_accepted_at + terms_version. Reject if stage < 1.
   - complete_onboarding: write onboarding_completed_at, assign the creative team via
     client_assignments, start the 7-day window.
   - Each downstream endpoint guards on the derived stage: questionnaire requires
     stage >= 3, and returns 402 with code PAYMENT_REQUIRED otherwise.

2. app/services/payment_service.py
   - create_order(client, plan, provider): create the gateway order, insert
     subscriptions with status='incomplete', return the checkout payload.
   - confirm(order_id): verify the client-side signature, then POLL OUR OWN DATABASE
     for up to 8 seconds and return {"status": "active"} or {"status": "pending"}.
     It must NOT activate anything. Add a comment saying why.
   - process_event(payment_event_id): the only path that activates a subscription.
     Sets status, current_period_start/end, users.account_status='active', seeds
     usage_counters from plans.quotas with the ON CONFLICT DO NOTHING insert from the
     architecture doc, enqueues the welcome notification, sets processed_at.
   - Handle: payment.captured, payment.failed, subscription.charged,
     subscription.halted, refund.created — and the Stripe equivalents.

3. app/routers/webhooks.py — mounted so CORS does not apply to it:
   POST /webhooks/razorpay and /webhooks/stripe, both:
     raw = await request.body()          # BEFORE any parsing
     verify HMAC with compare_digest     # 400 on mismatch, and log it
     INSERT INTO payment_events ... ON CONFLICT DO NOTHING
     if 0 rows → return 200 immediately, we have seen this event
     enqueue process_event.delay(row_id)
     return 200 in under 2 seconds, always

4. app/services/brand_dna.py + a Celery task:
   Gemini 1.5 Flash with a prompt demanding strict JSON → validate against a Pydantic
   BrandDNA model → on ValidationError retry once with the error appended → then fall
   back to OpenAI gpt-4o-mini → then fall back to a deterministic template summary.
   The client NEVER ends up with nothing. Store into client_profiles.brand_dna and
   brand_summary. Expose GET /onboarding/brand-dna/status for the UI to poll.

5. Frontend src/features/onboarding/: a stage-driven router that reads the derived
   stage from /auth/me and renders the right step.
   - Stage 1 → OTP (already built)
   - Stage 2 → the MSA. The Accept button stays disabled until an IntersectionObserver
     on a sentinel at the bottom of the scroll container fires. Not a timer.
   - Stage 3 → plan cards, then Razorpay Checkout (INR) or Stripe Elements (other).
     After the callback, poll /payments/confirm with backoff and show honest copy while
     pending: "Confirming your payment with the bank."
   - Stage 4 → the brand questionnaire: niche, audience, tone, HEX colors, asset links,
     content goals. On submit, poll brand-dna/status and show the generated summary.
   - Stage 5 → the completion screen and the button into the portal.

Acceptance:
  A full signup → OTP → terms → test payment → questionnaire → portal, with ZERO
  manual database edits. Paste the resulting rows.

  Replay the SAME webhook payload three times:
    exactly 1 subscription row, exactly 1 set of usage_counters, 3 payment_events
    with 1 processed and 2 conflict-skipped.
  POST /onboarding/questionnaire with {"onboarding_stage": 5} in the body while the
    real derived stage is 2 → 402, and nothing changes in the database.
  Tamper with one byte of the webhook signature → 400, and no payment_events row.
  Kill the Gemini key entirely → onboarding still completes via the fallback chain.

Report, then stop.
```

---

# PHASE 4 — Deliverables

```
Phase 4 of 9. Do only Phase 4. This is the heart of the product.

Build:

1. app/services/deliverable_state.py — the ONLY place .status is ever assigned.
   Implement the TRANSITIONS table and ALLOWED_ACTORS map from Part IV.5 of the
   architecture doc, exactly. transition() must:
     - raise Conflict("...is not a valid transition") on an illegal edge
     - raise Forbidden on a wrong actor role
     - on 'revision_requested', load the client's plan and raise
       Conflict(code="REVISION_LIMIT_REACHED") if revision_round >= plan.revision_rounds,
       otherwise increment revision_round
     - stamp approved_at / published_at
     - write the audit_log row in the SAME transaction
   Then grep the codebase and prove no other file assigns deliverable.status.

2. app/services/quota_service.py
   consume(db, client_id, kind) → the single atomic UPDATE ... AND used < quota
   RETURNING. Zero rows → raise QuotaExceeded with the remaining count in details.
   release(db, client_id, kind) for cancellations, guarded by used > 0.

3. app/services/storage_service.py
   - upload_intent: validate mime against an allowlist (video/mp4, video/quicktime,
     image/png, image/jpeg), bytes <= 512MB, quota available. Return a presigned PUT
     with a 15-minute TTL and a storage_key of
     clients/{client_id}/{yyyy}/{mm}/{uuid}.{ext}
   - confirm: HEAD the object, check it exists and the content-length matches what was
     declared. Reject the mismatch.
   - signed_get(key, ttl): short-lived read URLs. Never make a bucket public.

4. app/routers/deliverables.py
   POST /deliverables/upload-intent
   POST /deliverables/confirm
   POST /deliverables/{id}/submit-qa      (editor/designer)
   POST /deliverables/{id}/qa-approve     (team_lead+)
   POST /deliverables/{id}/qa-reject      (team_lead+, requires qa_notes)
   POST /deliverables/{id}/approve        (client, Idempotency-Key honoured)
   POST /deliverables/{id}/request-changes(client, requires rejection_comment)
   POST /deliverables/{id}/schedule       (staff, requires scheduled_at TIMESTAMPTZ)
   GET  /portal/deliverables              keyset paginated, filter by status
   GET  /deliverables/{id}/versions       the full root_id chain, newest first
   Revisions call submit_revision(): a NEW row with version+1 sharing root_id; the
   previous row goes to 'archived'. Never mutate a file in place.

5. Frontend src/features/deliverables/ — the contact sheet from CLAUDE.md §6:
   - A strict grid of real 9:16 frames on --color-ink. Not cards.
   - A 3px status rail down each frame's left edge, colored by the functional tokens.
   - Header reads "3 waiting on you" — the count that matters, not a total.
   - Selecting a frame docks a decision bar at the viewport bottom: caption, duration,
     [Ask for changes] [Approve].
   - Approve is optimistic per Part V of the architecture doc, sending an
     Idempotency-Key, and rolls back visibly on error.
   - THE motion moment: on approve, the rail sweeps amber→green and the frame reflows
     into the "Ready to publish" group via layout animation, ~600ms spring. This is the
     only orchestrated animation in the product.
   - Ask for changes opens a Radix dialog requiring a comment. When the API returns
     REVISION_LIMIT_REACHED, the dialog swaps to an honest upsell, not a red toast.
   - Skeletons at true 9:16 so nothing shifts. useReducedMotion() honoured in the same
     commit.
   - Video: poster image first, load the MP4 on play.

6. Tests:
   - a table-driven test over ALL 12 statuses × 12 targets asserting exactly the legal
     edges pass and every other edge raises Conflict
   - each ALLOWED_ACTORS pair, positive and negative
   - the revision ceiling: N revisions succeed, the (N+1)th returns
     REVISION_LIMIT_REACHED and does not increment
   - quota: 20 concurrent consume() calls against quota=10 → exactly 10 succeed
     (run them truly concurrently with asyncio.gather)
   - audit_log replays the exact status sequence for a deliverable
   - the query-count assertion on GET /portal/deliverables?limit=50 (<= 3 queries)

Acceptance:
  The full loop with REAL files: editor uploads a 40MB mp4 → team lead rejects with
  notes → editor resubmits v2 → team lead approves → client asks for changes → v3 →
  client approves. Paste the version chain and the audit_log.
  The concurrency test passes on 10 consecutive runs.
  grep for direct status assignment outside deliverable_state.py → ZERO hits.

Report, then stop.
```

---

# PHASE 5 — Team and admin

```
Phase 5 of 9. Do only Phase 5.

Build:

1. app/services/dispatch_service.py — the workload-aware assigner.
   Use the ranked-eligibility CTE from Part VI Phase 5 of the architecture doc:
   staff who are accepting work, not on approved leave today, hold the required skill,
   and whose WIP is under daily_capacity — ordered by load ratio, tie-broken randomly.
   Wrap the assignment in FOR UPDATE on the chosen staff row so two dispatches cannot
   both fill the last slot. If nobody is eligible, leave the task in backlog and raise
   a notification to the team lead — never silently assign anyway.

2. app/services/sla_service.py
   sla_due_at is computed at task creation from the plan tier and deliverable kind.
   breach_sweep() finds tasks past sla_due_at that are not terminal, writes an
   audit_log row, and notifies the assignee and their team lead. It must be idempotent
   — the same breach does not notify twice (track the last-notified timestamp).

3. app/routers/tasks.py: kanban list (grouped, ONE query using json_agg per column),
   create, assign, reassign, move, bulk-assign. Every status change writes audit_log.

4. app/routers/admin.py (admin+ only):
   GET /admin/kpis        from mv_exec_kpis — MRR, active clients, churn, avg turnaround
   GET /admin/clients     roster with derived onboarding stage, plan, quota usage
   GET /admin/queue       global dispatch queue
   GET /admin/sla         open breaches and escalations
   PATCH /admin/plans/{id}  scarcity slots and pricing
   POST /admin/users/{id}/suspend  → account_status='suspended', token_version++,
                                     Redis cache invalidated. Their next request 401s.

5. Frontend, on the OPS surface (--color-paper), deliberately not the portal skin:
   - src/features/kanban/: five columns (Backlog, In production, Internal QA,
     Client review, Ready to publish). Drag with dnd-kit. Optimistic move with
     rollback. layout animation on drop only — nothing on hover.
   - src/features/admin/: KPI row with tabular figures and Bricolage numerals, client
     roster table, dispatch queue, SLA panel where breaches use --color-blocked and
     nothing else on the page does.

6. Tests:
   - the dispatcher never picks someone on approved leave (seed one and assert)
   - the dispatcher never exceeds daily_capacity under 10 concurrent dispatches
   - suspending a user kills their live session within one request
   - a client calling any /admin route gets 403, not 404 and not a leaked payload
   - kanban list for 200 tasks issues <= 2 queries

Acceptance:
  Seed 10k deliverables and 2k tasks, then measure:
    GET /admin/kpis            p95 < 150ms
    GET /admin/dashboard       p95 < 400ms
    GET /tasks/kanban          p95 < 250ms
  Paste the numbers. If a target misses, add the index and re-measure — do not
  relax the target.

Report, then stop.
```

---

# PHASE 6 — Async and automation

```
Phase 6 of 9. Do only Phase 6. Idempotency is the entire point of this phase.

Build:

1. app/workers/celery_app.py with the exact config from Part VI Phase 6 of the
   architecture doc: acks_late, reject_on_worker_lost, prefetch_multiplier=1,
   time_limit 900 / soft 840, timezone Asia/Kolkata, queues default + publish.

2. app/workers/tasks/publish.py — Instagram, THREE PHASES, per Part IV.6:
   - SELECT FOR UPDATE the deliverable; return early if already published
   - refresh the long-lived token if it expires within 3 days
   - check /content_publishing_limit; if quota_usage >= 25, retry in 1 hour
   - Phase 1: create the container with the right media_type per kind
     (REELS with video_url + thumb_offset, STORIES, or image_url), then
     COMMIT ig_creation_id BEFORE going further. Write a comment saying why.
   - Phase 2: poll GET /{creation_id}?fields=status_code every 5s for up to 300s.
     FINISHED → continue. ERROR → publish_failed, clear ig_creation_id so a retry
     rebuilds instead of looping on a dead container. Timeout → raise TransientIGError.
   - Phase 3: media_publish, store ig_media_id and permalink, transition to published
     through deliverable_state.transition(), notify the client.

3. app/workers/tasks/scheduler.py — dispatch_due_publishes() using the
   UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 50) RETURNING
   pattern, then .delay() each id.

4. Remaining tasks: notify.send (email via Resend, WhatsApp via the Business API, both
   writing to the notifications table with sent_at or failed_reason), refresh_expiring_ig,
   refresh_kpis (REFRESH MATERIALIZED VIEW CONCURRENTLY), weekly_client_reports,
   sla_breach_sweep, expire_stale_onboarding.

5. beat_schedule exactly as specified in the architecture doc.

6. An IG client with a fake mode: a FakeInstagramClient that simulates the real
   transcoding delay (returns IN_PROGRESS for 3 polls, then FINISHED) and can be told
   to fail at any phase. Tests use it; production uses the real one; the switch is an
   env var, not an if-statement scattered through the task.

Acceptance — the kill test is mandatory, do not skip it:
  1. Schedule a deliverable 1 minute out. Beat picks it up, it publishes, exactly one
     post exists.
  2. Start a publish, kill -9 the worker after the container commits but before
     media_publish. Restart. The task resumes from the stored ig_creation_id and
     produces EXACTLY ONE post. Paste evidence.
  3. Force the container into ERROR. Assert status='publish_failed' AND
     ig_creation_id IS NULL.
  4. Run publish_deliverable on an already-published row → returns skipped, no API call.
  5. Set quota_usage to 25 → the task retries rather than erroring.
  6. Run two beat processes deliberately for 5 minutes → still exactly one publish per
     deliverable (SKIP LOCKED earns its keep).

Report, then stop.
```

---

# PHASE 7 — UI polish and performance

```
Phase 7 of 9. Do only Phase 7. No new features — this phase only makes what exists good.

Build:

1. Complete the design system in src/ui/ on Radix primitives, using ONLY the tokens
   from CLAUDE.md §6: Button, Dialog, Sheet, Toast, Tooltip, Select, Tabs, Table,
   Skeleton, EmptyState, Avatar, Badge, Field. Both surfaces via a data-surface
   attribute on a wrapper — not two copies of every component.

2. Motion audit. Go through every animated element and delete anything that is not:
   - the approval sequence (the one orchestrated moment)
   - a 120ms opacity crossfade on route change
   - skeleton → content crossfade
   - layout animation on kanban drop
   - a Radix enter/exit on a dialog or toast
   In particular: remove every scroll-triggered reveal, every hover lift on a card,
   and every staggered fade-up on a section. Report what you deleted.

3. Empty and error states for every list and every failure path, written to the copy
   rules in CLAUDE.md §6. An error says what happened and what to do. An empty state
   invites. Neither apologises.

4. Accessibility pass: keyboard path through approve and ask-for-changes end to end,
   focus trap in every dialog, focus visible on --color-ink, aria-live on the toast,
   alt text or aria-hidden on every image, 4.5:1 contrast verified on both surfaces
   with a real checker.

5. Performance:
   - route-level lazy with Suspense boundaries per feature
   - manualChunks splitting react/router/query/motion vendors
   - preconnect to the storage origin, poster images before video
   - keyset pagination wired through the deliverables and tasks lists
   - rollup-plugin-visualizer, and cut anything unexpected

6. Backend perf: add selectinload where the query-count tests reveal N+1, then extend
   the query-count assertions to every list endpoint. Run EXPLAIN ANALYZE on the six
   hot queries and paste the plans — every one must use an index, no seq scans.

Acceptance:
  npm run build && ls -la dist/assets     # initial JS <= 180KB gzipped
  Lighthouse on /portal:  performance >= 92, accessibility >= 95, CLS < 0.05
  k6: 100 VU, 5 min → API p95 < 120ms, p99 < 400ms, zero 5xx
  Every flow completed with the keyboard only. Record it.
  System reduced-motion on → zero animation, no layout jumps, everything still works.

Report, then stop.
```

---

# PHASE 8 — Deploy and harden

```
Phase 8 of 9. Do only Phase 8.

Build:

1. render.yaml exactly as in Part VII of the architecture doc: creo-api web service
   (2 instances, singapore, alembic upgrade head in startCommand not buildCommand),
   creo-worker, creo-beat (with a comment: NEVER scale above 1), creo-redis with
   maxmemoryPolicy noeviction and a comment explaining that allkeys-lru silently
   eats queued tasks.

2. vercel.json with the /api proxy rewrite to Render, the SPA catch-all rewrite, the
   immutable cache header on /assets, and the five security headers.
   Because /api is proxied, set the refresh cookie SameSite=Lax and add a comment
   explaining that this avoids third-party cookie blocking in Safari.

3. Supabase: create the project, apply migrations against the DIRECT url (5432), point
   the app at the pooler (6543, ?pgbouncer=true), create the private
   creo-deliverables bucket with a CORS policy allowing PUT from the app origin only.
   Prove the PgBouncer settings work: run the load test against the pooler and show
   no DuplicatePreparedStatementError.

4. Observability:
   - Sentry on both sides, with the frontend release tied to the git SHA and
     source maps uploaded
   - structlog JSON with request_id propagated from the API into the Celery task
     headers so one request id traces across both. Prove it with a real trace.
   - /api/v1/health checking db, redis, and storage
   - an uptime monitor hitting it every 5 minutes

5. Backups and the drill:
   - a nightly pg_dump to a bucket separate from the deliverables bucket, 30-day retention
   - RESTORE IT. Create a scratch database, restore the dump, run the test suite
     against the restored data. A backup you have never restored is not a backup.
     Paste the output.

6. Deploy staging first, run the full Playwright suite against it, then production.

7. Write RUNBOOK.md: how to roll back a deploy, how to replay a failed webhook, how to
   re-run a stuck publish, how to rotate JWT_SECRET without logging everyone out
   (you cannot — document that, and document the plan), what each alert means and the
   first thing to check.

Acceptance:
  Staging green: every Playwright journey passes against the deployed URL.
  Deep link https://<staging>/portal/deliverables/<uuid> → hard refresh → loads.
  Cookies work in Safari and Firefox with third-party cookies blocked.
  A restore drill completed against a scratch DB, test suite green on restored data.
  Load test against production infra meets the Phase 7 budget.
  Trace one request id from an API log through to a Celery task log. Paste both lines.

Report. This is the last phase.
```

---

## Prompts for when things go wrong

**The agent claims something works without running it**

> You reported this passing but I do not see the command output. Run it now and paste
> the actual terminal output, including any failures. Do not summarise.

**The agent stubs something out**

> You left a placeholder at `<file:line>`. CLAUDE.md §7 says no placeholders. Either
> implement it fully or remove it and tell me it is missing. Which is it?

**The agent violates an invariant**

> This violates invariant #<n> in CLAUDE.md §4. Do not work around the invariant.
> Revert that change and either implement it correctly or explain why the invariant is
> wrong — I will decide.

**Scope creep**

> That is Phase <n>, not this one. Revert it and finish the current phase's acceptance
> checks first.

**Before merging any phase**

> Before I accept this phase: list every file you created or modified, every
> acceptance check with its real output, everything you could not complete and why,
> and any decision you made that CLAUDE.md did not cover.
