# Live dashboard audit ? 7 October 2026

Latest update ? 7 October 2026: the region mismatch is confirmed and corrected.
The public frontend now uses the tested Singapore API. Warm API samples are
substantially faster; see the final verification below. Earlier latency and
region-access limitations in this report describe the Virginia deployment.
Free-hosting cold starts and the remaining account-specific flows still apply.


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

Final live verification confirms the new lead schedule is deployed, shows October
2026 and has no mobile overflow or JavaScript errors. A warm runtime probe without
SQL took 605 ms in the browser and 216 ms on the server. Another probe took 19.9
seconds in the browser while server processing was 217 ms; transport/deployment
routing variability must be investigated separately. These samples overlapped
rolling deployments and must not be presented as steady-state p95 results.
The under-one-second requirement remains unmet; neither database nor browser
transport delays should be hidden by reporting only the fastest sample.


## Singapore deployment and final verification

Signed-in Render dashboard/API inspection confirmed the original API was on a
free Virginia instance. The database is in Singapore. Created a separate Singapore
API, verified it, then deployed the frontend endpoint switch through GitHub main.
The live Cloudflare bundle and 28 authenticated mobile route visits all confirmed
requests go to creo-api-singapore.onrender.com. No failed API requests, JavaScript
page errors, or horizontal overflow were observed across 13 admin, 6 lead,
4 editor, 4 designer, and the client's current onboarding route. Full completed
client onboarding and sales/investor role flows are still unverified.

Read-only latency sampling covered 16 role/endpoint combinations with ten warm
requests each (160 warm samples; first requests recorded separately). All returned
HTTP 200. These sequential diagnostic samples are not a concurrency/load test or
a production SLO guarantee. Warm end-to-end p95 ranges:

- Admin: 204?599 ms across eight routes.
- Lead/staff: 147?406 ms across five routes.
- Current client: 236?351 ms across three routes.

Cached pod dashboard server p95: 9 ms. Cached KPI server p95: 11 ms.
Direct sample cache hits: KPI 6 ms, queue 20 ms, with zero SQL calls.
Not all server p95 values are below 100 ms; transport alone can exceed 100 ms.
Dependency probe: Redis ping 1.17 ms, database checkout 0.15 ms, warm SELECT 1
round trip 8.33 ms, PostgreSQL execution 0.013 ms. The trivial SELECT 1 probe does
not substitute for business-query analysis. Existing Redis and database were kept;
no database migration or new datastore was required for the improvement.

Backend: 25 tests pass; core mypy passes nine files. Frontend production build
passes, with the existing lazy 519 kB hero chunk warning. Redis dashboard snapshots
are tenant/user/role scoped, retain per-request authorization/revocation checks,
and expire after 15 seconds. API writes invalidate shared generations before and
after mutation; tests cover stale in-flight publication and cross-agency isolation.

Free hosting still sleeps when idle. Paid always-on hosting awaits explicit
approval of its recurring charge; no billing change was made. No Celery worker or
beat service was verified running in the account's original single-service project.
Gemini remains outside the onboarding request path, but durable worker recovery
and actual A?G output quality require the remaining dedicated test flow.
Temporary Render API access was revoked (dashboard shows no provisioned API keys),
and local temporary secret exports were removed. Old Virginia API remains live
for rollback and existing OAuth callback compatibility.

Evidence: singapore-admin-latency-2026-10-07.json,
singapore-staff-latency-2026-10-07.json,
singapore-client-latency-2026-10-07.json,
singapore-dependency-probe-2026-10-07.json,
singapore-live-mobile-audit-2026-10-07.json,
and SINGAPORE_DEPLOYMENT_REVIEW.md.


## Concurrent checks and additional cache coordination

Five concurrent readers, twenty warm samples per endpoint and a five-request/second
cap produced zero HTTP errors in the initial eight-endpoint run, but all client-side
samples exceeded 100 ms. Initial client p95 ranged from 236 to 856 ms. Only two of
eight endpoint server p95 values were below 100 ms. This disproves an all-endpoint
100 ms claim on the current deployment; it does not establish maximum capacity.

Added per-process snapshot refresh coordination to avoid duplicate database work
on simultaneous cache misses, with a ten-reader regression test. Added a scoped
five-second calendar cache retaining existing authentication dependencies and write
invalidation. Backend now passes 26 tests and nine-file core mypy checks.
A live calendar cache hit was confirmed at 16.7 ms server time with zero SQL calls.

A second broad run overlapped rolling deployment and had larger outliers (profile
p95 1,739 ms, calendar client p95 2,014 ms); its raw results and caveat are preserved
in singapore-concurrent-after-2026-10-07.json. Do not present it as a clean before/after
comparison. See ARCHITECTURE_LATENCY_DECISIONS.md for implemented load safeguards,
connection budgets and the remaining six-requirement deployment decisions.

Private datastore migration, paid always-on compute, separately deployed durable
workers and full cold-start/capacity testing remain incomplete. No new billing or
data migration was performed. Generic control-of-PC authorization does not resolve
the pending explicit recurring-charge decision.

A final separately confirmed deployment run covered four cached/baseline endpoints
with twenty warm samples each at concurrency five. No HTTP errors occurred.
Client p95: runtime 422 ms, KPI 201 ms, queue 605 ms, calendar 368 ms.
Server p95: runtime 101 ms, KPI 64 ms, queue 353 ms, calendar 195 ms.
Zero of eighty warm client requests were below 100 ms. The 100 ms end-to-end target
is therefore explicitly **not met**. Cached snapshots do not eliminate Redis,
serialization, process scheduling or transport variability. Raw data:
singapore-cached-concurrent-2026-10-07.json.


## Infrastructure preparation after account inspection

Reopened the signed-in Singapore Render service and confirmed the cache commit is
live, but compute remains free: 0.1 CPU / 512 MB RAM. Its upgrade screen lists
0.5 CPU / 512 MB at $7/month. No upgrade was purchased.

Prepared render-workers.yaml with one Singapore worker (concurrency one) and one
Singapore beat scheduler, using the existing API's database, JWT, broker, Gemini,
email and provider configuration bindings without committing secrets. This creates
paid resources only when explicitly deployed. It preserves the current database;
it does not implement private-network migration or prove broker persistence.
Fixed missing database/null-pool settings in the alternative root scheduler blueprint.
Both files pass Render's current official JSON schema validation. This validation
checks structure, not account resource existence or runtime connectivity.

Concrete next paid deployment: upgrade the existing API and create the worker and
single scheduler on 0.5c-512mb compute. At the displayed $7/service-month rate this
is approximately $21/month compute, before taxes, bandwidth and existing datastore
charges. Billing confirmation is still required before creating those services.
Broker persistence/noeviction and delivery recovery must be verified before calling
jobs durable. Private PostgreSQL/Redis migration is a separate priced rollout that
requires backup, restored-data checks and a rollback plan; it is not silently bundled
into the compute approval. Full six-requirement completion remains pending.
