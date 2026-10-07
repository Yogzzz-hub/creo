# Live client workflow audit — 7 October 2026

Target: https://creo.yogalakshmibaskar20.workers.dev/

## Live evidence and access limit

Chromium visited the live login and signup pages. The existing local test
credentials returned HTTP 401 with a visible invalid-credentials message and
no uncaught page errors. The previously saved admin/client browser states
contain no cookies or local-storage origins, so they cannot authenticate this run.

A registration request using the existing dedicated test email alias returned
HTTP 200 in **8,294 ms**, including connection and response transfer. This is
one sample, not p95. The UI displayed the OTP screen before the request completed.
The mailbox and spam folder are not accessible through the available tools;
delivery and verification remain unconfirmed. An enabled email-failure fallback
means HTTP 200 alone cannot establish that an email was sent.

The user has been asked for the OTP/mailbox access and working role test logins.
No subscription purchase, production upload, client reassignment, negotiation,
or payment mutation was performed. Authentication is the current live-test gate.

## Code-confirmed defects and changes

| Defect | Correction |
| --- | --- |
| Default custom-retainer label reads nonexistent `User.company_name`, causing an exception | Read the company from `ClientProfile` |
| Admin plan assignment records onboarding completion without terms, questionnaire, Brand DNA, pod, or calendar | Preserve completion state; only the onboarding workflow completes onboarding |
| Lowering quota below consumed usage resets usage to zero | Return HTTP 409 and preserve usage; the transaction is not committed |
| Poster-only or story-only custom quota is ignored when selecting the custom-package path | Recognize all three custom quota fields |
| Newly created subscription and usage counters omit the client agency | Carry the agency into new records |
| Client plan endpoint accepts staff-account targets | Reject non-client targets |
| Calendar picks the latest subscription regardless of validity, or invents fallback quotas without a subscription | Require an unexpired active/trialing subscription before creating or deleting calendar slots |
| Signup claims OTP delivery and persists pending state before provider response | Enter/persist verification only after success |
| Signup continues after the user unchecks terms acceptance | Show an error without sending a registration request |
| Production email fallback can claim success after delivery failure | Return HTTP 503 in production even if fallback is enabled |
| Every generated email OTP is written to application logs | Remove unconditional OTP logging |

## Validation

- Backend: **53 tests passed**, including 16 new workflow regression cases.
- Core mypy: passed nine files.
- Frontend TypeScript/production build: passed; existing 519 kB hero-chunk warning remains.
- Controlled Chromium at 320 pixels: delayed success, delivery failure, unchecked
  terms, and successful pending-state restoration passed, without horizontal overflow.
  These checks intercept requests; they do not establish production email delivery.
- Full-month calendar checks retained negotiated quotas of 13 reels, 17 posters,
  and 40 stories, with the correct client/agency and dates inside the month.
  Short-window distribution checks retained up to 500 slots without losing quota.

Controlled evidence: `workflow-auth-controlled-2026-10-07.json`.

## Still required for end-to-end completion

1. Verify a new client through an actual inbox/spam OTP and sign in again.
2. Accept onboarding terms, test checkout and the admin negotiated-price path,
   submit sections A–G, and verify template/Gemini outputs independently.
3. Inspect actual dedicated lead/editor/designer assignment and login as each;
   verify the new client appears only in permitted staff scopes.
4. Upload actual test media as the assigned creative; verify internal QA, client
   visibility, reel/poster preview, revision, approval, and calendar linkage.
5. Verify negotiation/counter-offer records and the actual charged/displayed
   price; accepting a negotiation record alone does not update the subscription.
6. Verify first-month delivery totals. The existing implementation prorates the
   initial month after a seven-day buffer; the full-month quota tests do not
   certify that this matches a client's paid billing-cycle entitlement.
7. Verify calendar regeneration with already materialized tasks/deliverables,
   plan changes, expiry, worker recovery, and publishing integrations.
8. Measure live mutation/page latency after deployment and distinguish cold starts
   from warm requests. A single registration timing does not certify overall latency.

The complete client → team → upload → client review workflow has **not passed**
this run. Local fixes and controlled tests must not be presented as live completion.
