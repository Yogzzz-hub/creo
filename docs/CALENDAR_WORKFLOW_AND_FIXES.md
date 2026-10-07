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
