# Deliverable upload and client review workflow — 7 October 2026

Scope: App Flow (Document 03) section 5 — Journey 1 steps 13–15 (first content
reaches the client), Journey 2 (client rejects, revision, approval) and
Journey 5 (team member completes a task). This closes the upload blockers listed
in [LIVE_CLIENT_WORKFLOW_AUDIT.md](LIVE_CLIENT_WORKFLOW_AUDIT.md) in code and in
a local end-to-end run. It has **not** been exercised on the live deployment.

## What was broken

| Area | Defect | Effect |
| --- | --- | --- |
| Creative task board | File picker stored `uploaded://<name>`; start, submit-to-QA, sign-off, new task, time log and progress only changed React state | Nothing was uploaded or saved; reloading lost everything |
| Upload endpoints | `/deliverables/upload-intent` required an `X-Client-Id` scope that staff JWTs never carry; `/admin/deliverables/upload` wrote to the API container's disk | No working production upload; files on Render's disk vanish on redeploy |
| Media URLs | Local files were returned as relative `/static/...` paths | The SPA (different origin) requested them from itself and got 404 — clients could not view them |
| Admin routes | `/admin/deliverables` GET/POST/upload/status registered twice; the status override assigned the status directly when the state machine refused | Dead code; deliverables could jump to any status |
| Lead QA | `/admin/pod-tasks/{id}/qa-review` assigned statuses directly and never notified the client; the lead page showed a placeholder instead of the file and only the first queued item | Clients were not told work was ready; leads approved blind |
| Client portal | List returned internal drafts (`pending_qa`, `qa_rejected` with internal QA notes); approve was enabled for any status; videos rendered in `<img>` thumbnails; posters were cropped into 9:16; version switcher was decorative; no `/portal/deliverables/:id` | Clients saw unreviewed drafts and internal notes; notification links had nowhere to land |
| Downloads | No download after approval; Library "Download all" used a relative URL and the wrong token key | Approved work could not be downloaded from the deployed site |
| State machine | A deliverable without a task was attached to whichever task of that client was updated last | Unrelated tasks changed status |
| Pod dashboard | Joined every version of a task and kept an arbitrary one | Board could show an old version |
| Signing | The S3 client did not pin SigV4. With `STORAGE_REGION=us-east-1` (an R2 alias of `auto`) botocore signs SigV2, which R2 rejects | Previews/downloads fail on R2 under that configuration (`auto` was already SigV4) |

## The flow now

| App Flow step | Implementation |
| --- | --- |
| 5.5 step 4 — marks In Progress | `POST /deliverables/tasks/{id}/start` (assigned creative, their pod lead, or admin) |
| 5.5 step 5 — uploads, submits | Browser asks `POST /deliverables/tasks/{id}/upload-intent` for a pre-signed PUT, uploads straight to R2 with progress, then `POST .../submit` HEAD-checks the object. If the bucket refuses the browser (e.g. no CORS rule), the board retries through `POST .../upload`, which streams the file into the same bucket. Keys must be in `clients/{client_id}/…`. Limits from App Flow 6.4: images 10 MB, videos 500 MB (also checked in the browser before uploading). |
| Internal QA ([operations workflow](CREO_CLIENT_ONBOARDING_AND_OPERATIONS_WORKFLOW.md), phase 7) | Each upload becomes the next version of the task's deliverable (`root_id`, `version`) in `pending_qa`; the pod lead is notified. Unseen drafts (`pending_qa`, `qa_rejected`) are superseded. |
| 1 step 14 / 5.5 step 6 — client notified | Lead approves on `/lead/deliverables` (checklist required). Status → `pending_approval`, in-portal notification linking to `/portal/deliverables/{id}`, plus an email (best effort; needs `RESEND_API_KEY` or SMTP). Lead rejection requires notes and notifies the creative. |
| 1 step 15 — approve, download unlocked | Client approves; task → `ready_to_publish`; a signed `download_url` (attachment disposition) appears; Library and ZIP include it. |
| 2 steps 4–6 — reject with comment | Comment required; plan revision limit enforced (`REVISION_LIMIT_REACHED` shown as a message, not an error); 24-business-hour clock set on the task; creative and lead notified; card shows "Revision in progress". |
| 2 steps 7–9 — revised version | Creative uploads v(n+1). The client keeps seeing the version they sent back until the fix passes QA, then sees the new version; history lists only versions the client reviewed. |
| 5.5 step 7/7b — creative sees outcome | Board columns: Queued → In production (with QA notes or client feedback and due clock) → Submitted for QA → Client review & approved. |

Client-visible statuses: `pending_approval`, `revision_requested`, `approved`,
`scheduled`, `publishing`, `published`, `publish_failed`. Internal QA notes are
never sent to the client.

## Verification

- Backend: 70 tests pass, including `tests/test_deliverable_workflow.py` — an
  API-level run of reject → revise → approve against PostgreSQL (opt-in via
  `CREO_TEST_DATABASE_URL`, rolled back; now set in CI) and a SigV4 regression
  test that fails on the previous storage client. `mypy app/core` passes.
- Frontend: `tsc --noEmit` and `npm run build` pass (existing chunk-size warning).
- Browser end-to-end: **34/34 checks** — [deliverable-workflow-e2e-2026-10-07.json](deliverable-workflow-e2e-2026-10-07.json).
  Environment: local PostgreSQL 16 (migrations to `0009` + model tables), the
  backend and Vite dev server, a local S3-compatible server standing in for R2,
  Playwright Chromium at 1440 px and 390 px. Covered: direct pre-signed upload,
  API fallback with the bucket blocking the browser, lead reject/approve with
  the real video, client empty state while in QA, notification link, inline
  playback (object-fit `contain`), change request, revision-in-progress state,
  version history, approval, attachment download byte-for-byte, Library ZIP,
  poster at full 1080 px, the 10 MB image limit, and no horizontal overflow.
- Playwright's Chromium cannot decode H.264, so test reels were VP9/Opus in MP4.
  Production H.264 MP4s play in Chrome, Safari and Edge; this run does not
  certify any particular codec.

## Required on the live deployment

1. **R2 CORS** for direct uploads (otherwise every upload goes through the API,
   which works but sends large videos through the Render instance):
   ```json
   [{"AllowedOrigins": ["https://creo.yogalakshmibaskar20.workers.dev"],
     "AllowedMethods": ["PUT", "GET", "HEAD"],
     "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600}]
   ```
2. **Email**: set `RESEND_API_KEY` (or SMTP). Without it the in-portal
   notification still appears; the local run logged `email_provider_not_configured`.
3. **Live check** with real logins: creative upload of an H.264 reel and a
   poster, lead QA, client review on phone and desktop, download.
4. Existing deliverables whose `file_url` is `/static/...` were stored on the API
   container's disk and are likely gone after redeploys; they now resolve to an
   absolute URL but cannot be recovered if the file no longer exists.

## Known issues outside this change

- Migration `7ba467e463fc` (autogenerated) drops unique indexes including
  `idx_users_email` and fails on a fresh database (`idx_agencies_slug` does not
  exist), so `alembic upgrade head` fails in CI before tests run. It was left
  unchanged because it may already have run in production; it needs a decision.
- Not part of this change: add-on upsell after approval (Journey 3), support
  tickets (Journey 4), escalations (Journey 6), sign-up recovery (Journey 7).
