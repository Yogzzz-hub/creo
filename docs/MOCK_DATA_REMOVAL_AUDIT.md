# UI mock data removal — 7 October 2026

The admin, team lead, member, client, and public interfaces now display persisted API records or explicit loading, empty, and error states. Production database records were not deleted.

## Changes

- Replaced seeded clients, staff, tasks, support tickets, chat messages, pricing deals, revenue graphs, SLA metrics, and operational dashboards with authenticated API queries.
- Removed localStorage ticket/chat seeds, fake upload progress, fixed QA scores, render metrics, invented invoice/tax details, testimonials, client logos, portfolio records, and authentication telemetry.
- Replaced guessed subscription quotas, prices, revision limits, and content types with saved plan and task fields. Public pricing uses the current plan catalog.
- Kept API-backed task creation, assignment, file uploads, QA, client approvals/revisions, plan changes, negotiations, leave requests, ticket replies, chat, profile updates, and downloads. Removed simulated calls, booking, invitations, payment changes, and unsupported add-on checkout.
- Task uploads link to the selected client's production task so format, assignment, and workflow status come from that task. Client media views use the stored format and actual uploaded file.
- Backend sales summaries read stored plans and negotiations. Unknown leave records and unconfigured add-on fulfillment no longer return false success. Missing uploaded media cannot create a stock-photo deliverable. Duplicate deliverable routes were consolidated.

## Validation

- Production frontend build passes, including TypeScript. Vite reports the existing large hero animation chunk warning.
- Backend suite: 67 tests passed, including regressions for empty sales, persisted plan values, missing leave records, unsupported add-on fulfillment, required media, and cross-client task rejection.
- 90 controlled browser checks passed at 320px and 1440px across admin, team lead, member, client, and public pages. Checks covered empty responses, failed API requests, stale mock data in browser storage, populated member assignments, JavaScript errors, and horizontal overflow. Results: [browser evidence](mock-data-removal-browser-2026-10-07.json).
- These browser checks used intercepted API responses. They do not establish successful live OTP authentication, payment capture, or mutations in a real customer account. A mailbox-accessible account is still required for that verification.

Database seed/migration data and decorative imagery are separate from UI record fallbacks and were retained.
