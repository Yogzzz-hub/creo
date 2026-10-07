# Performance and onboarding review

## Implemented changes

| Layer | Finding | Change |
| --- | --- | --- |
| Questionnaire | Finalization could save seven sections sequentially | A-G snapshot saves in one transaction and one HTTP request; queued autosaves finish first; completion is blocked on save failure |
| Navigation | All onboarding stages downloaded together | Lazy stage imports with a loading fallback |
| Completion UI | At least 3.15 seconds of artificial delay | Shortened to roughly 650 ms for an immediate response, or 200 ms with reduced motion |
| AI request | Key/model failover could take several minutes | Reused HTTP transport, 35-second total Gemini budget and six-attempt cap; API key sent in a header |
| Database pool | External AI held an open transaction | Snapshot answers and pod, release transaction before AI, reacquire a lock and verify the snapshot before saving |
| Recovery | In-process jobs were lost on restart | Persist requested/generated questionnaire versions; Celery beat recovers interrupted completed-onboarding enrichment every five minutes |
| Production scheduling | Calendar activation performed many task flushes and dispatch calls | Bulk task persistence; dispatch after the response; durable unassigned backlog recovered every five minutes |
| Assignment | Retry could replace an existing creative pod | Preserve active existing pod, serialize changes by client; task dispatch reacquires row locks after each commit |
| Shared stage lookup | Up to five sequential queries | One query using EXISTS for assignments and calendar |
| Portal dashboard | Separate user/profile reads and separate count reads | Joined profile query and combined scalar counts |
| Admin dashboard | Separate task scans for pipeline and SLA breaches | Combined grouped scan |
| Browser cache | Duplicate subscription requests and retained data after logout | Shared per-user subscription keys, short freshness interval, query cache cleared on logout/account change |
| Billing bundle | PDF generation loaded with billing | Load the invoice generator only on download; catch download errors |
| Prefetch | Admins downloaded client routes; onboarding downloaded unrelated portal pages | Prefetch only relevant client routes and honor slow/data-saving connections |
| HTTP client | Requests could wait indefinitely; 204 responses failed JSON parsing | AbortController timeout with cancellation cleanup; support empty responses and structured API errors |
| Observability | Slow requests were hard to identify | Server-Timing response header and structured logs for requests over one second |

## Gemini input and prompt

`backend/app/prompts/brand_dna.md` is the system instruction. A-G are included as data,
with history and brand story explicitly used in strategy and the team brief. Uploaded
file URLs, contact fields, handles and post URLs are excluded from structured AI input.
Free-text answers can still contain information the client types; they are not a general
PII-redaction system. Output is schema-validated. The server preserves numeric tone inputs,
legal restrictions and camera constraints, and removes invented pod members. Responses
with several text parts are assembled while thought parts are excluded. Gemini failure
falls back to OpenAI when configured, then a deterministic local brief.

## Architecture safeguards

The review also removed automatic startup resets of existing administrator passwords,
disabled the unauthenticated legacy administrator reset endpoint, rejected Google mock
login codes outside tests, required a configured signing secret outside development/test,
and verified JWT signatures before deriving database tenant context.

## Validation completed

- Production frontend build and TypeScript checks passed. Invoice generation is now a
  separate approximately 395 kB module instead of part of the billing page bundle.
- Fourteen backend tests passed, covering all seven sections in the actual Gemini payload,
  the dedicated prompt, multi-part output, nested field filtering, input fingerprints, changed-input rejection and connection release during synthesis,
  batch validation/save behavior, stage query count, bounded failover, production secrets,
  Google mock-code rejection, authoritative camera/legal/pod constraints, and worker tenant transaction boundaries.
- Chromium mobile browser checks at 390 px passed: all seven sections in one final batch,
  completion after successful save, completion blocked on simulated save failure, no
  document overflow, and no uncaught JavaScript errors on that flow.
- Read-only database checks ran the new stage query against eight existing clients and
  validated the recovery query. Existing pod retry preserved all assignments.
- Earlier landing-page checks covered public/auth pages at mobile and desktop widths.

## Runtime requirements and limits

Run the API, a Redis broker, a Celery worker and Celery beat for restart recovery and
future scheduling. The worker tenant scope permits commits and rollbacks inside a job,
so a task can continue querying after each assignment or external AI wait. The API still launches immediate jobs without waiting for the broker;
the persisted markers/backlog provide recovery when the worker resumes. In this workspace
PostgreSQL and the frontend preview were available; Redis and the running backend were
not. Do not run several uncoordinated beat instances. Recovery processes at most twenty
clients per agency per sweep; task assignment processes fifty tasks per sweep.

Production network/provider latency, full multi-tenant load, real paid checkout, Gemini
quality with live customer inputs, media publishing and every role/page combination have
not been end-to-end benchmarked. A remaining build warning concerns the lazy Three.js
hero scene (approximately 519 kB). These checks do not establish a zero-bug guarantee or
that sleeping/free-tier hosting becomes instantly responsive. Use Server-Timing and the
slow-request logs to identify remaining deployed latency before changing pool sizes or
introducing broad caches that could hide subscription/permission changes.
