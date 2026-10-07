# Architecture and latency decisions ? 7 October 2026

## Measured architecture

Cloudflare serves the React assets with immutable hashed-asset caching. The frontend
uses a Singapore FastAPI service with pooled asyncpg connections to Supabase's
Singapore transaction pooler and a warm external Upstash Redis connection.
JWT authentication and Redis suspension checks execute before dashboard caches.

This corrected the observed Virginia-to-Singapore database round trips without a
database migration. The dependency probe measured warm database network/driver time
at 8.33 ms versus PostgreSQL SELECT 1 execution at 0.013 ms. Redis ping was 1.17 ms.
These trivial probes do not prove all business queries are efficient.

## Load management implemented

- Short Redis snapshots for KPI, queue, and pod dashboards; five-second calendar
  snapshots. All snapshots include user, agency, role, client and parameters.
- API mutations invalidate generations before and after execution. Atomic snapshot
  publication rejects a generation superseded by a mutation. Background changes
  remain bounded by each TTL.
- Concurrent reads of a given snapshot refresh once per API process. Waiters recheck
  Redis; weakly held locks release memory when no requests use a key. This reduces
  cache-miss fan-out without risking a stranded distributed lock. It does not promise
  a single refresh across multiple worker processes.
- Existing SQL connection pool, finite checkout timeout, HTTP timeout, bounded
  frontend retries and shared query caches remain in place. Authentication is never
  cached away. Fifteen-second snapshot freshness is an explicit tradeoff.
- Reusable benchmark supports up to five concurrent reads, capped at approximately
  five requests per second with recorded failures, p50/p95, and explicit 100 ms
  checks. This is bounded production diagnostics, not a maximum-capacity stress test.

## Six requirements and their remaining deployment work

1. API/database regional mismatch corrected. Redis's region is not independently
   verified; its measured Singapore latency is low.
2. Supabase and Upstash are external connections. Their URLs cannot be turned into
   Render-private connections. A private-network deployment requires new Render
   database/Key Value resources and a staged data migration. No migration or new
   billing was performed. Moving the data is not justified solely by the current
   8 ms/1 ms probes; evaluate under representative load before migrating.
3. Dashboard work reduced and measured. Existing task, assignment, calendar, and
   notification indexes were reviewed in schema/migrations. No speculative new
   indexes were added: execution plans of representative slow business queries and
   their actual cardinalities are needed to justify them. Full query review remains.
4. Scoped snapshots, mutation invalidation, browser query caches/prefetch and CDN
   asset caching implemented. Cache-miss load coordination added and tested.
5. Gemini executes outside page requests. Persisted enrichment markers and periodic
   Celery recovery code exist, but a durable deployed worker/beat pair is not verified.
   Background asyncio tasks alone do not guarantee survival across sleeping/restarted
   free API instances. A worker and exactly one beat instance need deployment and
   recovery testing before this requirement is complete.
6. Free API remains subject to sleeping; always-on paid compute approval is pending.
   Twenty warm samples per endpoint at five concurrent clients were collected. Cold
   starts and production capacity are not established by this test.

## Target interpretation

The browser-to-Singapore transport baseline can exceed 100 ms even with no SQL.
A database/server processing target cannot be presented as an end-to-end target.
Never mark all requests below 100 ms based on one warm cached hit. Test p95 with
representative payloads, users, geography, traffic and cache expiration. AI generation
latency is a separate job completion metric; fast acknowledgement is not fast Gemini.

## Hosting shape before scaling

Use one always-on Singapore API first and benchmark CPU, RAM and connection checkout
before adding instances/workers. Pool budget is per process: pool size 5 plus overflow
5 means up to 10 connections per worker. Eight workers could consume 80 connections;
compare this with provider limits rather than blindly adopting render.yaml's scale.
Keep transactional PostgreSQL as source of truth, Redis snapshots as optional read
acceleration, and durable jobs separate from API processes. Do not use an evicting
cache Redis as a durable Celery broker without validating persistence/queue isolation.
Retain the old API for rollback/OAuth callbacks until the new provider flows are tested.

Always-on compute, durable workers, private datastore migrations and their charges
require concrete deployment/budget decisions. They are not reported as completed.
