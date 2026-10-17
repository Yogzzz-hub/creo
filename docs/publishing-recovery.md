# Publishing dispatch

The API runs `publishing_recovery_loop` during its lifespan. It polls durable
publishing jobs every five seconds and uses the same locked worker execution as
Celery. Celery and API replicas may run together; publication claims, approval
checks and uncertain-result reconciliation remain in `execute_publish_job`.

The Cloudflare Worker also runs once per minute and POSTs to
`/api/v1/publishing/dispatch`. This wakes the existing Render API when it has
scaled to idle and runs the durable sweep without requiring a paid Celery service.
Cold starts, provider processing and hosting quotas can still delay publication;
the dashboard shows overdue schedules rather than claiming publication succeeded.

## Deployment

- Set the same random `PUBLISHING_DISPATCH_SECRET` in Render and as a Cloudflare
  Worker secret. Do not put it in frontend environment variables or source code.
- Set `INSTAGRAM_PUBLISHING_ENABLED=true` and `INSTAGRAM_CLIENT_MODE=real` in
  Render, with the existing Instagram credentials and encryption key.
- Deploy the API, build the frontend, and deploy the `creo` Worker using the
  repository's `wrangler.jsonc`. The cron schedule is managed in that file.
- If Celery is provisioned later, both Render blueprints now forward the direct
  Instagram Login credentials as well as Facebook credentials to the worker.

The dispatch endpoint rejects missing/incorrect secrets and does not accept job
IDs, destinations, media or approval overrides. A successful call returns a
processed count; it is not proof that Instagram published every job. Check job
status/history and the confirmed permalink. Cloudflare logs dispatcher HTTP
failures without logging the secret.

Jobs never attempted within the configured lateness window are marked
`needs_schedule`. Staff must choose a new future time or explicitly use Post now.
Canceled/rejected versions remain unpublished until the appropriate review and
schedule actions occur. No database migration is required for this release.

## Verification

Run the publishing/Instagram pytest suites, Worker Node tests, frontend build,
and `wrangler deploy --dry-run`. Generate binding types with
`wrangler types worker-configuration.d.ts --include-runtime=false` after changing
bindings. Full database concurrency tests require a disposable local PostgreSQL
database named `creo_test_*`; never run them against production.
