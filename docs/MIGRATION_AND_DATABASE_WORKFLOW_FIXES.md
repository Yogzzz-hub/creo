# Migration and database workflow fixes — 7 October 2026

## Reproduced and fixed

A separate PostgreSQL 16 cluster was created under the local temporary directory, bound to 127.0.0.1:55432. It contains only a dedicated `creo_workflow_test` database; no production or existing local database credentials/data were used.

Before the fix, a clean `alembic upgrade head` failed at `7ba467e463fc` with `UndefinedObjectError: index "idx_agencies_slug" does not exist`. That DirectMessage migration attempted to drop unrelated indexes and a staff uniqueness constraint.

- Corrected its upgrade/downgrade to create/remove only DirectMessage and its indexes. This also allows fresh installs to reach head.
- Added forward revision `0010_schema_integrity` for installations where the old migration already ran. It restores missing uniqueness for email, agency slug, client/staff profile ownership, team membership and team name. It recognizes equivalent existing primary keys/unique indexes and does not add duplicate protections.
- Plan-name lookup is indexed without imposing global uniqueness across tenants.
- Existing duplicate records are not deleted or merged: conflicting data causes the unique-index creation to fail transactionally and requires deliberate resolution. The repair retains integrity protections during downgrade.
- Clean upgrade to head, downgrade to `0009_plan_negotiations`, and upgrade back to head all passed locally. Forward repair tests verify preservation of existing rows, rejection of duplicate ownership, repeatability, and acceptance of duplicate plan names.

## Fresh client database workflow

A new integration test executes the actual registration, login, pricing and onboarding services against the migrated database. All writes are rolled back. Only the email provider/OTP cache and background workers are isolated; SQL, password hashing, OTP comparison, JWT generation/validation and allocation are real.

Verified:

1. Registration intent does not create a user before OTP verification.
2. Verified registration creates a Client with verified email and hashed password.
3. Password sign-in returns that same user; its signed access token decodes to the correct client identity and role.
4. Admin assigns a client-specific INR 35,000 plan with 8 reels, 12 posters and 10 stories. The separate INR 50,000 package remains unchanged; subscription price is read back from SQL.
5. Assigning a plan does not prematurely complete onboarding. Empty legacy questionnaire submission is rejected.
6. Terms and required brand sections persist, including an explicit false/no-camera answer.
7. Completion selects the actual same-agency lead, editor and designer, stores three ownership records, materializes 30 tasks and creates exactly 30 posting dates with the exact format quantities.
8. Retrying completion preserves the same calendar IDs and task count.
9. The existing database-backed media test also passes: upload → QA rejection → corrected versions → QA approval → client revision → final approval, with ownership, notifications and download behavior.

Additional validation fix: five unrelated legacy answers or a stale core-completion timestamp no longer bypass mandatory questionnaire checks. Save/resume/completion treat an explicit false/no-camera answer consistently.

## Validation

Full maintained suite: 172 tests passed with the explicitly configured migrated test database; no skipped tests. Core mypy passed all 11 files. New files passed Ruff. Migration forward/rollback checks passed.

## Deployment verification

The public API root and health response now expose a validated 40-character `build_revision`, or null if unavailable. This enables verification of deployed code without needing a privileged account. Render supplies `RENDER_GIT_COMMIT` as its service/deploy SHA ([official environment-variable documentation](https://render.com/docs/environment-variables)). Arbitrary environment strings are never exposed as revisions.

Live API code deployment verified: the root response reports `bc62170ae724623247b9f4d448084aeb75416b46`, matching the fixes commit. Health returned HTTP 200, database `ok` and Redis `ok`. Evidence: `backend-deployment-2026-10-07.json`. These public checks verify the deployed code and service health; production indexes and client business records were not inspected through an authenticated session.

## Still requires live access

This validates a local database workflow, not production email delivery or gateway capture. Real inbox/spam OTP retrieval, Google sign-in, real Razorpay payments, R2 uploads, every role login, concurrent workload allocation and renewal/publishing remain dependent on working live test accounts/provider access. The local commercial test uses the authorized admin plan-assignment path; it does not simulate a captured payment as real.
