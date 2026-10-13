# Production performance

Measured on 13 October 2026. Singapore remains the production API.

## Findings

- Render's Singapore logs showed calendar and deliverable requests taking 8–15 seconds,
  with only a few hundred milliseconds of database work.
- R2's read-only bucket check returned 403. Singapore already used the Supabase fallback;
  `STORAGE_S3_ENABLED=false` preserves that choice without a blocking R2 probe.
  Enable R2 again only after its credentials and object permissions are repaired.
- Synchronous password verification and some admin media signing ran on the API event loop.
- Calendar images were signed sequentially. Concurrent gallery/calendar requests could
  sign the same media repeatedly, and Supabase signing opened a fresh TLS connection each time.
- Every browser visit/tab return requested the database/Redis health endpoint.
- Portal/admin layouts were part of the entry bundle even when visiting login or public pages.

## Changes

- Offload password hashing/verification, parallelize media signing with six concurrent
  operations per batch, and reuse thread-safe HTTP/S3 clients.
- Share concurrent signing of the same object and reuse Supabase preview signatures for downloads.
- Cache portal dashboard aggregation for ten seconds after authentication and onboarding checks.
  Cache identities include the actor and parameters; mutations invalidate shared generations.
- Optional dashboard caching has a 100 ms budget and a failure backoff. Redis availability
  does not add a half-second delay to every read/write. Authentication checks are unchanged.
- Begin dashboard data loading while route modules download, and preload public routes on link intent.
- Split workspace layouts out of the entry bundle. Self-host the primary font and size hero images
  to their displayed width. Render the headline and primary actions immediately.
- Keep optional WebGL off mobile, reduced-motion and low-power devices.
- Stop browser health polling and defer below-the-fold public API requests until sections approach view.
- The Cloudflare Worker proxies `/api/*` to `API_ORIGIN` over the site's existing connection.
  Only anonymous standard plans and the public ledger are edge-cached. Tokens/cookies are stripped
  for these two endpoints; private pricing, user data and writes are never cached.
  Public snapshots are fresh for 60 seconds, refreshed in the background, and retained for at most 300 seconds.
- Render uses `/` for lightweight liveness. `/api/v1/health` still checks database and Redis.

## Controlled frontend comparison

Same local production preview, fresh Chromium context, 390×844 viewport, 4× CPU throttle,
100 ms network latency and 200,000 bytes/second download throughput. Public APIs were mocked
to isolate rendering. Local preview transfers differ from Cloudflare's compressed production transfers.

| Measurement | Before | After |
| --- | ---: | ---: |
| Largest-content paint | 9,788 ms | 4,828 ms |
| First-content paint | 6,532 ms | 3,368 ms |
| Long-task blocking | 7,256 ms | 2,190 ms |
| JavaScript loaded over ten seconds | 1,249,193 bytes | 659,995 bytes |

These are controlled observations, not guaranteed production timings. Measure signed-in workflows
with the intended user's session, without putting credentials into reports.

## Validation and deployment

```powershell
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

In another terminal, from the repository root (requires Playwright with Chromium):

```powershell
python frontend/scripts/measure-performance.py --url http://127.0.0.1:4173 --mobile --throttle --mock-api
npm run test:worker
cd backend
python -m pytest tests -q
```

Deploy the Worker and frontend together with `npx wrangler deploy`; the frontend's same-origin
API routing requires the matching Worker. An explicit `VITE_API_URL` continues to override routing.
Render's API deployment must include the backend changes, with `STORAGE_S3_ENABLED=false`
on Singapore. This does not change the database, encryption keys, OAuth credentials or region.

The free Render instance can sleep when idle. Code optimization cannot remove that cold start;
an always-on compute plan requires a separate recurring-charge approval. Network latency cannot be zero.
