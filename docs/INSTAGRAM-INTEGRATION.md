# Instagram integration assessment and operations

## Integration assessment (before implementation)

Creo uses React 19/React Query, FastAPI, async SQLAlchemy/PostgreSQL, Alembic,
Celery/Redis, and S3/R2 or Supabase media storage. Deliverable already represents
a version (root_id, version); client decisions go through deliverable_state.
ContentCalendar contains editorial dates and optional deliverable links.
ClientProfile has encrypted token storage and a timezone. Reuse Notification and AuditLog.

The old connection endpoint manufactures an account ID. The old worker uses
placeholder credentials, an obsolete API version and the wrong token refresh flow.
It also changes deliverable approval state. Retire these paths in place; retain
one Celery scheduler and publishing worker. Preserve existing editorial dates.

Add connection metadata to ClientProfile, expiring OAuth transactions, and one
publishing job per deliverable version. Reuse AuditLog for execution history.
No historical deliverables are enrolled automatically. Approval never dispatches.

Sequence: additive schema/configuration; provider and authorization lifecycle;
scoped scheduling/approval hooks; durable worker; existing UI integration; tests/setup.

## Provider references

Use Facebook Login, a linked Page and an Instagram Business account. Request only
instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement.
Graph v26.0 is configurable. Meta's SDK changelog confirms that version:
https://github.com/facebook/facebook-ios-sdk/blob/main/CHANGELOG.md
Meta's maintained discovery and publishing examples:
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
Canonical publishing reference:
https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing
Direct developer documentation returned HTTP 429 during implementation. Confirm
version-specific limits and App Review access in Meta before enabling live use.

## Implemented workflow

### Connection setup troubleshooting

Use `backend/.env.instagram.example` for the server settings. `ENCRYPTION_KEY`
must be a URL-safe Fernet key; Render's generic `generateValue` secret does not
satisfy that format. Generate it once with
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
and securely set the same value on the API and publishing workers. Preserve an
existing valid key so stored account credentials remain readable.

Register exactly
`https://creo.yogalakshmibaskar20.workers.dev/portal/account/instagram`
as the Meta Facebook Login redirect and `INSTAGRAM_REDIRECT_URI`. Connect remains
clickable even when cached status says setup is incomplete: the backend validates
the current configuration on every attempt and returns a clear error. The API logs
`instagram_not_configured` for deployment troubleshooting without exposing secrets.

An Instagram profile URL identifies an account but cannot authorize it. The client
must sign in through Meta and select the intended Page-linked professional account.
App credential acceptance does not prove Page access, approved permissions, client
authorization, or successful publishing. Confirm the connected username in Settings,
then verify a client-approved scheduled asset and its actual Instagram permalink.
The client queue stays read-only in Settings; staff manage publishing schedules.

The client opens `/portal/account/instagram`. Facebook Login returns to that exact
SPA route; the authenticated browser forwards the code to the backend. A ten-minute,
single-use state record is bound to the signed-in client and a browser-held verifier.
The verifier supplements CSRF protection; it is not Meta PKCE. The redirect cannot
be supplied by callers. Multiple eligible Pages produce a client-only account picker.
User/Page tokens and pending account choices are encrypted with Fernet. Public
responses expose account identifiers and health, never credentials.

Facebook Login discovers Page-linked professional accounts. Meta's Facebook
Login IGUser schema does not expose Instagram Login's `account_type` field, so
discovery requests only supported identity fields and verifies the Page relationship,
granted scopes and publishing quota. Business account setup remains required for
Stories; Meta enforces format eligibility when it creates the container, and Creo
shows a specific failure if the account cannot publish a Story. Connection verification
alone cannot certify account subtype or guarantee each format. See [Meta's IGUser
SDK schema](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/iguser.py).

The team opens an uploaded deliverable's **Instagram schedule & status** control.
They supply the publishing format, final caption, local date/time and IANA timezone.
Creo downloads the existing storage asset, calculates SHA-256 and uses ffprobe to
validate its actual format. Files are not converted. PNG, carousel, inaccessible
local files and incompatible videos receive actionable errors without changing
existing upload rules. JPEG posters, supported MP4/MOV Reels, and vertical image/video
Stories are supported. Story text must already be part of the asset.

A publishing plan can be prepared before client review. Normal client approval
includes the displayed publishing fingerprint, covering deliverable ID/version,
storage reference, media bytes, caption and publishing format. If content was
approved before its publishing plan was prepared, the client approves the final
publishing details once in the deliverable view. Old approval callers still work,
but do not implicitly approve a caption they never displayed. Changing media or
caption requires fresh client consent; changing only time preserves exact approval.
Rejected/superseded versions have their publishing plans canceled.

Deliverable production status remains **approved** while the independent publishing
status moves through `pending_approval`, `needs_schedule`, `scheduled`, `processing`,
`published`, `failed`, `paused`, `canceled`, or `uncertain`. Approval never sends a
Celery task or invokes Meta. Historical content is never enrolled automatically.
Clients see their read-only publishing queue under Account settings > Instagram
connection; the editorial calendar remains focused on production dates and
concept-review controls.

Staff scheduling uses the existing client-pod/task assignment checks. Admins are
restricted to their agency, and super admins retain platform access. Only the
client account holder controls Instagram consent. Current database role, account
state and session version are checked in addition to the existing JWT dependency.
New tables have forced tenant RLS and publishing rows have database ownership checks.
Use a non-superuser, non-BYPASSRLS application database role in production.

## Durable execution and recovery

The existing Celery Beat task polls due indexed PostgreSQL publishing rows every
minute and sends them to the existing `publish` queue. The database is the source
of truth, so a broker outage loses no publishing plan. Multiple deliveries are
expected: the worker locks client profile then job, persists a five-minute lease,
and rechecks ownership, active client/subscription, approval, schedule and pinned
connection before submission. Other clients can process concurrently.

Container ID and processing stage are committed separately from publication.
Video processing is polled every minute, up to 30 minutes. A persisted `submitting`
stage is committed before `media_publish`. A timeout or worker crash after that
point triggers read-only provider reconciliation, never blind resubmission.
Only a provider media ID or container status `PUBLISHED` permits **published**.
When only the container confirms publication, the media ID/link may remain absent.
An inconclusive response remains **uncertain** for administrator review; there is
intentionally no force-retry bypass. Reconnecting the original account permits
read-only reconciliation even if its connection generation changed.

Safe transient failures before submission have exponential backoff and a five-failure
budget; rate limits respect Retry-After and the provider's reported quota. Definitive
publish rejection can fail/pause safely. Unknown submit outcomes cannot be retried.
First attempts missed by more than `INSTAGRAM_MAX_LATENESS_MINUTES` require a new
future schedule. Scheduling rejects past times, nonexistent DST times, and ambiguous
DST times until first/second occurrence is specified.

Disconnect deletes stored credentials before attempting provider revocation and
pauses future work. Reconnect creates a new connection generation and requires the
team to review/resume future plans or reschedule overdue ones. Facebook grants are
verified daily and before execution; revoked/expired grants require client reconnect.
The former Instagram Login `ig_refresh_token` path is removed because these are
Facebook Login credentials. AuditLog and Notification hold connection/schedule/approval,
failure, recovery and provider-confirmed publication events.

## API and important files

All API paths below have the `/api/v1` prefix and use existing Creo authentication.

| API | Purpose |
| --- | --- |
| `GET /portal/integrations/instagram` | Client's safe connection status |
| `POST /portal/integrations/instagram/connect` | Start Facebook authorization |
| `POST /portal/integrations/instagram/callback` | Consume state and exchange code |
| `POST /portal/integrations/instagram/select` | Select an authorized Business account |
| `POST /portal/integrations/instagram/verify` | Verify current grant |
| `DELETE /portal/integrations/instagram` | Disconnect and pause |
| `POST /deliverables/{id}/schedule` | Existing route extended with publishing JSON |
| `GET /publishing/jobs` | Role-scoped, paginated queue; status/client filters |
| `GET /publishing/clients/{id}/connection` | Admin read-only client health |
| `GET /publishing/deliverables/{id}` | Publishing details and review fingerprint |
| `POST /publishing/deliverables/{id}/approve` | Client approves final publishing details |
| `POST /publishing/deliverables/{id}/action` | Cancel/resume; admin pause/retry/reconcile |
| `GET /publishing/deliverables/{id}/history` | Scoped audit history |

Schedule JSON uses `local_time`, `timezone`, optional `fold` (0/1), `caption`,
`media_type` (`IMAGE`, `REELS`, `STORIES`), and optional `calendar_entry_id`.
The old query-only `scheduled_at` call is replaced; no frontend used that contract.
`GET /auth/instagram/url` remains an authenticated compatibility alias to secure
authorization. The old simulated connect endpoints were replaced in place.

Backend additions: `models/publishing.py`, `services/instagram_connection.py`,
`services/instagram_media.py`, `services/publishing_service.py`, `routers/instagram.py`,
`routers/publishing.py`, and migration `0012_instagram_publishing.py`.
The existing provider adapter, publish worker, scheduler, maintenance, deliverable
approval service and routes were extended/replaced at their existing entry points.
Frontend additions are `components/portal/InstagramConnection.tsx` and
`components/ops/PublishingPanel.tsx`, embedded in existing account, deliverable,
member task, pod lead, admin client and calendar pages.

## Setup and rollout

1. Back up the deployment database. Apply `python -m alembic upgrade head` from
   `backend` using the existing **DIRECT_DATABASE_URL**, not a transaction pooler.
   Migration 0012 adds three client profile fields, expiring OAuth transactions,
   publishing jobs, constraints, indexes, tenant policies and an ownership trigger.
   It does not enqueue or alter historical deliverables. Deploy the schema before
   the new application because ClientProfile now includes the added columns.
2. Create/configure a Meta app for Instagram API **with Facebook Login**. Configure
   `https://creo.yogalakshmibaskar20.workers.dev/portal/account/instagram` as an exact
   valid OAuth redirect and add `creo.yogalakshmibaskar20.workers.dev` to app domains.
   The frontend must serve SPA routes directly on refresh. Keep this separate from
   Creo's Google/password login callback configuration.
3. Request the four documented permissions with required access levels. Complete
   Meta App Review and any required business verification for accounts outside app
   roles. Supply reviewer credentials, a flow recording and test Business/Page setup.
   Configure real privacy-policy and data-deletion instructions URLs in Meta; use
   the product's support process for deletion requests. There is no public signed
   deauthorization/data-deletion webhook in this change; daily verification and
   pre-execution verification detect revocation.
4. On the deployed API service (`creo-api-singapore`), set `INSTAGRAM_APP_ID`,
   `INSTAGRAM_APP_SECRET`, and `INSTAGRAM_REDIRECT_URI` to the Meta app values and
   the exact HTTPS frontend callback above. The live API must also have a valid,
   persistent Fernet `ENCRYPTION_KEY`; the `creo-worker-singapore` and Beat services
   must receive the same key and Instagram settings. The Render blueprints declare
   these worker bindings. Copy remaining values from `backend/.env.instagram.example`
   into the secret-managed API environment. Generate a Fernet key with
   `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
   Preserve it across restarts and use the same key in API and workers. Keep
   `INSTAGRAM_CLIENT_MODE=fake` and `INSTAGRAM_PUBLISHING_ENABLED=false` until Meta
   access, permissions and storage are verified. Do not
   overwrite an existing encryption key without migrating encrypted credentials.
   App secrets/tokens must never be put in `VITE_*` variables or request logs.
5. Configure existing S3/R2 or Supabase private media storage. Signed HTTPS read URLs
   must remain publicly fetchable by Meta for the processing period (generated
   links last one hour). Keep uploaded version objects immutable. Install ffprobe
   on API and worker hosts, or set its absolute executable path. Local development
   uploads and fake presigned storage URLs are deliberately rejected for publishing.
6. Run the existing services with matching environment and database configuration:

   ```sh
   celery -A app.workers.celery_app:celery_app worker -Q default,publish --loglevel=INFO
   celery -A app.workers.celery_app:celery_app beat --loglevel=INFO
   ```

   Run one Beat scheduler. Production workers should run on Linux, with Redis
   persistence and ordinary deployment monitoring. Schedule precision is the
   minute-level polling interval plus provider processing time, not an exact-second SLA.
7. Keep `INSTAGRAM_PUBLISHING_ENABLED=false` while reviewing configuration and
   running staging tests. Development tests use injected HTTP/provider mocks;
   `INSTAGRAM_CLIENT_MODE=fake` disables runtime publishing and never fabricates success.
   An authorized deployment administrator explicitly sets mode `real` and flag `true`
   only after credentials, approved permissions and workers are ready. Restart API,
   workers and Beat consistently. No UI user can bypass this deployment flag.
8. Use an explicitly authorized test account/content for live acceptance: connect,
   verify account selection, upload compatible media, prepare final caption, approve,
   schedule into the future, and verify actual post/account/link and notifications.
   Validate disconnect and expiry, and confirm an uncertain request cannot duplicate.

To roll back, disable publishing and stop the worker first. Export publishing history
before explicitly downgrading 0012; its downgrade removes the new tables/metadata.
Never downgrade while requests or workers still use the new models.

## Validation and limits

Offline tests: `python -m unittest discover -s tests -v` from `backend`. Database
tests skip unless `TEST_DATABASE_URL` names a migrated disposable localhost
`creo_test_*` database. Set both database environment URLs to that disposable database,
run migrations, then set TEST_DATABASE_URL and rerun. Tests use real PostgreSQL
transactions with mocked Meta/media I/O; no test publishes real content.

The local run exercised the complete migration chain on isolated PostgreSQL 16,
approval/time/media safeguards, OAuth state/denial/selection, encryption, API role
checks, tenant RLS, database ownership checks, duplicate concurrent workers,
broker failure recovery, processing polls, bounded retries, disconnected/replaced
accounts, missed schedules, stale approval and uncertain-submit reconciliation.
The production frontend build and targeted lint checks were also run. Repository-wide
lint already contains unrelated findings; this change does not attempt a cleanup.

Browser smoke coverage uses Chromium with all API responses mocked and external
network blocked: OAuth callback/account selection, disconnect, 390px mobile layout,
and the read-only client publishing queue in Instagram settings. To repeat, run Vite on
`127.0.0.1:4174`, install Python Playwright/Chromium in your test environment, and
run `python tests/browser_instagram.py` from `backend`. Screenshots go to ignored
`backend/scratch/`. This checks frontend behavior independently of live Meta.

Live Facebook authorization, App Review approval, actual Meta media ingestion and
real publication remain unverified without external credentials and an authorized
test account. Carousels, personal accounts, stickers, music overlays, automatic
media conversion and unsupported story captions are outside this single-asset
Business-account workflow. Creator accounts are not separately classified by this
Facebook Login discovery route; verify their Story support with Meta. Provider quotas
are read dynamically. Missing media links
after an ambiguous publish cannot always be recovered automatically.
