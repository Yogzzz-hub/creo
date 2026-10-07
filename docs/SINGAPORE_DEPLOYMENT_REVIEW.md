# Singapore deployment review ? 7 October 2026

## Confirmed deployment mismatch

The signed-in Render dashboard and API confirmed the existing `creo` API is a **free web service in Virginia**, not the Singapore paid deployment described in render.yaml. Its Supabase transaction pooler is in ap-southeast-1 (Singapore). Redis is external Upstash; its warm latency from the new Singapore API is about 1?2 ms. No database migration or Redis replacement was necessary.

Created `creo-api-singapore` at https://creo-api-singapore.onrender.com with the existing application secrets and shared database, on the free plan while paid hosting approval is pending. The old Virginia service remains available for rollback and existing OAuth redirect compatibility. New API uses the same JWT secret, so existing signed sessions remain valid. No credentials are committed.

## Direct comparison before dashboard caching

| Request | Virginia server | Singapore server | Singapore end to end |
|---|---:|---:|---:|
| Auth profile | 1,783 ms | 29 ms | 366 ms |
| KPI snapshot | 1,775 ms | 37 ms | 213 ms |
| Dispatch queue | 5,641 ms | 124 ms | 357 ms |

Virginia profile/KPI database work: approximately 1,560 ms. Singapore: 20?30 ms. Warm Redis check: Virginia 216 ms, Singapore 1?2 ms. These are individual diagnostic samples, not production p95 guarantees. The measured client is this PC; network/proxy time remains outside server processing. See region-comparison-2026-10-07.json.

## Changes

- Cloudflare frontend default and Vercel API rewrite point to the tested Singapore API.
- Fifteen-second Redis snapshots for KPI, dispatch queue, and scoped pod dashboards. Keys include user, agency, role, client, endpoint, and query parameters. FastAPI actor dependencies still enforce authentication, mandatory password reset, roles, and suspension on every hit.
- Shared generation invalidation before and after API writes prevents in-flight stale reads from repopulating snapshots. Atomic Redis publication checks the generation. Background changes expire within fifteen seconds; they are not claimed to be immediately invalidated. Cache outages fall back to querying the database, and snapshots above 1 MB are not cached.
- Admin-only read-only `/api/v1/admin/performance/probe` separates Redis ping, database checkout, transaction/driver round trips, and PostgreSQL planning/execution for SELECT 1. It exposes no credentials or business data and has a five-second deadline.
- `backend/scripts/benchmark_api.py` records first/warm samples and p50/p95 without storing credentials, tokens, or response bodies. First requests are not guaranteed to be cold starts.

## Hosting limits

Free Render instances can sleep. Always-on hosting requires the paid API plan, for which explicit recurring-charge approval was requested. No extra database or Redis charge is needed to obtain the measured warm improvements. render.yaml remains an alternative multi-service blueprint; it is not the current live configuration and its named database must exist if that blueprint is adopted.

Google OAuth still supports the existing registered frontend callback; old API callback URLs remain live. Actual OAuth sign-in requires separately verifying the provider flow. Dedicated completed-onboarding client, sales, and investor accounts remain necessary for their full business-flow audit.
