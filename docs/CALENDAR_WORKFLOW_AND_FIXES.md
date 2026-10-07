# Content calendar and creative-pod workflow — 7 October 2026

This records the corrected implementation for the reported screenshots. It
supersedes the old admin-fallback and first-month-proration descriptions in
earlier workflow documents. Tests with controlled responses are separate from
verification of an authenticated production account.

## Scheduling algorithm

1. Require an active or trialing subscription whose period has not expired.
2. Read Reel, Poster, and Story quantities from that client's actual plan,
   including negotiated quantities. Never invent a fallback package.
3. Reserve the existing seven-day onboarding preparation buffer for the first
   cycle. If it ends after month-end, start the plan in the buffer's month;
   never reset it to the first day of an earlier month.
4. Preserve the full plan quantities; do not silently reduce initial-month
   quantities because of the preparation buffer.
5. Allocate all formats against one shared daily load. Each asset goes to a
   least-loaded eligible date, spread around its evenly spaced target. Preferred
   weekdays break otherwise equal choices. This distributes the combined plan
   across eligible days instead of clustering each format independently.
6. Use the shared daily slot index to stagger publication times. Store UTC
   timestamps and display them in the browser's local timezone.
7. Create named Reel, Poster, Story, and Carousel slots. Story slots create Story
   production tasks; they must not silently become Static Post tasks.
8. Keep the existing blueprint/concept approval and rolling ten-day production
   assignment workflow. A planned publication is not proof of finished media.

Example: 12 Reels + 20 Posters + 30 Stories = 62 assets. For 14–31 October,
18 eligible days receive three or four planned assets each. Every format retains
its quantity. A plan with fewer assets than eligible days necessarily has empty
days; the system must not exceed the paid quota to fill those days.

## Assignment algorithm

The dedicated creative pod consists of a genuine active Team Lead plus active,
accepting Editor/Designer members from the client's agency. Admins manage the
platform and billing; they are no longer substituted for creative leads or
members. Select the lead by client count, then oldest assignment, then stable
user ID. Select capable members by workload, preferring that lead's reporting
pod. Reuse an existing allocation only when its roles, agency, and active state
remain eligible. Missing creative roles produce a visible `POD_UNAVAILABLE`
conflict instead of a fabricated successful assignment.

Existing saved admin allocations are not silently rewritten by this deployment.
The actual client needs an authenticated repair/reallocation check. Changing a
name or hiding the Admin label would not repair its stored ownership.

## Screenshot fixes

- Review: all mutation hooks now run before any loading/locked return. This fixes
  the changing hook order behind [React error 310](https://react.dev/errors/310).
  Fetch and mutation errors are visible instead of appearing as empty/successful data.
- Calendar: remove hardcoded `3 Scheduled` and `SLA Review`, duplicate generic
  counters, and truncated badges. Show explicit per-format quantities plus the
  actual monthly plan total. Preserve Story and Carousel identity even for video media.
- Navigation: Brand DNA and Settings no longer both appear selected.
- Loading: remove the detached travelling ball; keep the centered wave and text.
- Pod page: choose the initial chat recipient in an effect rather than updating
  state during render.
- Calendar API: add its missing role import and name static assets Poster.

## Verification and remaining live work

58 backend tests passed, including combined daily-load balance, full initial-month
quota, rejection of admin lead reuse, and Story task materialization. Controlled
Chromium passed Review's loading transition, all four calendar labels, sidebar
selection, and absence of overflow/page errors at 320, 1440, and 1920 pixels.
Evidence: `calendar-review-controlled-2026-10-07.json`.

Commit `aa51bae9` was pushed to main. The public calendar bundle and Singapore
API schema both contain the new implementation markers. The deployed frontend
also passed the same checks at all three widths with intercepted API fixtures,
zero page errors and no document overflow. Evidence:
`calendar-review-live-frontend-2026-10-07.json`. This verifies the shipped UI;
it does not verify the saved data or mutations of the screenshot's client.

The saved live test credentials still return HTTP 401. The `hgf` account shown
in the screenshots requires its test login to inspect/reallocate existing pod
ownership and repair already saved schedules. Generated production data has
not been bulk-deleted or reassigned. Existing task/deliverable regeneration,
actual uploads, QA, billing-cycle renewal, and publishing remain the live-workflow
checks listed in `LIVE_CLIENT_WORKFLOW_AUDIT.md`.


## Follow-up: 30-day cycles, mobile navigation, pricing and deployment recovery

Updated 7 October 2026. This replaces the earlier compressed first-month cadence.

- A posting cycle contains 30 consecutive dates after the initial seven-day production runway, even when it crosses a calendar-month boundary. Plans with at least 30 assets cover every date, including Saturdays and Sundays. Per the client's clarification, lower-volume plans retain gaps; no extra subscribed assets are invented.
- Both calendar engines preserve stored plan quotas. Removed fixture-specific poster placement and fixed the reel algorithm that could generate more reels than purchased. Regeneration subtracts retained locked/uploaded entries, including legacy Poster/Carousel format names. Approved dates are preserved, so already locked schedules can retain previous gaps.
- The calendar has a Rebuild draft schedule action for repairing existing unlocked drafts. Rebuilding does not delete approved, locked or uploaded content. It updates the current cycle, not every historical month.
- Deliverables uses a skeleton with a slower-response message after eight seconds. GET requests time out after 20 seconds and the deliverables/library requests expose errors instead of repeated automatic retries. Storage signing runs off the API event loop with bounded concurrency and a short cache that expires before signed URLs. Upload storage calls also run in worker threads.
- Client mobile bottom navigation is removed. A hamburger opens the same full sidebar used on desktop. Admin, team lead and member menu parity was checked at 320, 768 and 1440 pixels.
- Brand DNA renders stored information as readable labelled sections. Editing the summary no longer overwrites nested production/audience guidance.
- Applying an agreed price in Admin now updates that registered client's custom plan, subscription amount and quotas while preserving onboarding and usage. Client dashboard caches are invalidated; billing refreshes regularly and on focus. Admin may preserve existing quotas or enter agreed quantities. Razorpay orders use the saved server-side custom price. This does not charge an existing active retainer a second time.
- Change plan now opens a scoped negotiation request instead of redirecting back through signup. Downloaded invoice PDFs retain the invoice's historical plan label.
- Worker routing rejects missing /assets files with a text 404 rather than SPA HTML, avoids caching HTML, and caches existing hashed assets. An outdated tab reloads once on a dynamic-import failure, with a guard against a reload loop.

Validation: production TypeScript/Vite build; 93 backend tests passed, one skipped; 13 controlled Chromium checks passed; three Worker routing checks passed; Wrangler deployment dry-run passed. Evidence: `portal-fixes-browser-2026-10-07.json`. Tests use controlled API fixtures and mocked Razorpay order creation; they do not prove live payment capture or live account changes. Root-level pytest also collects the pre-existing unmarked async `backend/test_apis.py` script and fails collection of that script; the maintained `backend/tests` suite passes.

Deployment remains pending: local `wrangler whoami` reports unauthenticated. No Cloudflare production deployment was performed. GitHub changes also require the backend deployment before the new negotiation and scheduling endpoints take effect. Authenticated live-account validation remains pending because the saved test login returns 401 and OTP inbox access is unavailable.
