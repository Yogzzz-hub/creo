# Live dashboard audit ? 7 October 2026

Site: https://creo.yogalakshmibaskar20.workers.dev/

Previous live checks covered ten public/auth routes at 320 and 1440 pixels,
thirteen admin desktop routes, six admin mobile routes, a client brand detail,
and ten client/onboarding routes. The seeded client is still at stage 1:
protected client features remain locked and require a dedicated test account.

This run adds fourteen authenticated mobile pages at 390 pixels: team lead
dashboard/tasks/deliverables/schedule/clients/chat, editor overview/tasks/schedule/chat,
and designer overview/tasks/schedule/chat. No document overflow or uncaught
application JavaScript errors were recorded. Checks were read-only.

| Baseline API | Browser request duration |
| --- | --- |
| Staff session profile | 2.6?5.5 seconds |
| Notifications | 2.6?3.4 seconds |
| Pod dashboard | 4.6?8.9 seconds |
| Chat messages | 2.1?2.4 seconds |

These are individual request durations, not page completion times or p95.
Each page had a ten-second observation window; that window is not a latency
measurement. Target-closed warnings from audit response handlers on browser
teardown are separate from the recorded application page errors.

## Resulting changes

Independent user-scoped dashboard queries and a separate revenue-chart chunk
remove the slowest-request barrier. Staff screens share their pod cache.
Incomplete onboarding avoids protected dashboard requests; navigation
subscription queries share a 30-second freshness window. Support list polling
pauses in hidden tabs and runs every 30 seconds.

Notifications fetch recent items and the complete unread count in one query.
Session profiles use one joined query, and every authentication/refresh flow
preserves agency identity in signed tokens. Pod data follows actual reporting
lines/assignments and never falls back to unrelated clients or global tasks.

The calendar uses current-month production records instead of November 2024
demo entries. It filters both data sources before their limits, excludes linked
deliverables consistently, validates dates and applies agency/staff scope.
Tenant settings use parameter-safe set_config in one round trip. Server-Timing
separates application, SQL duration/query count and suspension-cache duration;
SQL and credentials are not exposed. Gemini stops at its total deadline.

Provider PostgreSQL URLs normalize to asyncpg. Render builds run inside the
backend directory; worker and beat reference the web JWT secret using Render's
documented service environment references:
https://render.com/docs/blueprint-spec#setting-environment-variables

## Validation and limits

Twenty backend tests passed, including new checks for timing-context cleanup,
unread counts outside the latest twenty records, invalid calendar dates,
empty-pod scoping, refreshed agency claims and async database URL handling.
Production frontend build passed. Chromium at 320 and 1440 pixels showed the
current October 2026 calendar without overflow or JavaScript errors. Controlled
2?3 second API delays confirmed the dashboard renders independently of queue
completion. Controlled checks do not establish production latency.

The under-one-second production API target remains unachieved. Deployment
samples must separate database/Redis/application delays. The hosting blueprint
is not evidence of actual deployed regions, instance sizes or environment.
Actual infrastructure access is needed for hosting changes. End-to-end Gemini,
unlocked client pages, sales and investor roles need dedicated test accounts.

## Deployment timing results

The new backend was confirmed live by its detailed Server-Timing headers.
All 26 sampled authenticated read requests across admin, team lead, editor,
designer and client returned HTTP 200. Warm staff session calls measured
approximately 2.0?2.1 seconds in the browser; the server spent 1.48?1.55 seconds
in two SQL calls (transaction context plus the joined profile query) and about
215 milliseconds checking Redis. Warm notifications measured 2.16 seconds;
warm admin queue 3.07 seconds and calendar 3.04 seconds. Pod data measured
4.18?4.94 seconds. Client session/status requests still take several seconds.

The fixed SQL round-trip cost dominates these samples. This is evidence of a
database-path bottleneck; a region mismatch is a hypothesis, not a verified
hosting configuration. Moving the API, database and Redis onto a nearby/private
network needs actual hosting access. No unrelated subscription or permission
results were cached to manufacture a faster benchmark.

Cloudflare CLI is not authenticated in this workspace. Git-connected automatic
deployment did update the frontend: live mobile calendar displays October 2026
and real API entries. Deployment monitoring must confirm any subsequent commits.

## Additional functional correction

The staff schedule page previously fabricated leave balances and reported saved
requests/cancellations without an API call. It now loads real requests, submits
validated date/reason fields to POST /admin/leave and cancels through the existing
DELETE endpoint. Success appears only after the server responds; failures remain
visible. Upcoming assignments come from the scoped pod data. No fabricated leave
allowance or balance is displayed because the API does not provide that ledger.

A controlled Chromium check at 320 pixels verified submission, persistence after
reload, cancellation, and failed submission without false success or an optimistic
phantom record. No production leave or notification was created. Staff route chunks
now preload while idle, respecting data-saver and slow-network preferences.

Post-deployment desktop checks confirmed lead/editor/designer dashboards have
three actual pod members and two assigned clients each, no overflow and no page
errors. Thirteen live admin pages at 320 pixels also showed no overflow/page errors.
These checks do not establish that every production mutation or feature is complete.
The complete client/Gemini flow and sales/investor roles still await test accounts.

The latest staff leave bundle was confirmed deployed by its real form/API markers.
All lead/task/review/schedule/client/chat pod queries now use the same user-scoped
key and freshness policy. A controlled browser navigation check visited six staff
pages using a single pod-data request, without overflow or JavaScript errors.

The lead schedule's separate November 2025 demo was also replaced with the scoped
live calendar and actual leave queue/history. Approval/rejection waits for the
server before refreshing. Chromium at 320 pixels verified that a failed review
preserves the pending request and a successful review refreshes its status; the
calendar shows October 2026 with no overflow or page errors.

An admin-only GET /api/v1/admin/performance/runtime exposes non-secret region hints
and pool settings without SQL. It supplies a database-independent request baseline.
It returns no hostname, URL, password or signing secret. Tests verify anonymous
401, client-role 403, admin access and zero SQL calls. Twenty-one backend tests pass.

Live runtime diagnostics confirm Supabase's ap-southeast-1 database region hint
and an active AsyncAdaptedQueuePool (pool size 5, overflow 5). The API does not
provide RENDER_REGION, so its actual hosting region still requires account access.
Database pooling is already enabled; blindly increasing it does not address the
measured round-trip cost.

A further configuration issue was corrected: configuring REDIS_URL alone used
to leave Celery's broker/result backend at localhost. Both now inherit REDIS_URL
unless explicitly configured. This is covered by a regression check preserving
explicit separate brokers. Twenty-two backend tests pass. Worker/beat deployment
and live recovery remain infrastructure verification tasks.
