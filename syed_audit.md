# Syed's Backend Infrastructure Audit

---

# Domain 9 Audit — Payments, Billing & Webhook Logic

## Phase 1: Feature & Happy Path (Webhook State Changes)

### ✅ PASS

1. **Razorpay `payment.captured` flow** (`webhooks.py:119-134`): Correctly extracts `user_id` from `payment.notes`, looks up subscription in `pending_payment` state, calls `_activate_user_account` which sets `users.account_status = active` and `subscriptions.status = "active"`, then commits.

2. **Stripe `invoice.payment_succeeded` flow** (`webhooks.py:184-202`): Looks up subscription by `gateway_subscription_id` (correct for Stripe's model), calls the same `_activate_user_account`, commits.

3. **Subscription creation** (`payments.py:103-166`): The `create-subscription` endpoint correctly creates a `Subscription` record with `status=pending_payment` and stores both `gateway_subscription_id` and `gateway_customer_id`. It also saves the gateway customer ID on the `User` record for future reuse.

4. **Idempotent subscription creation** (`payments.py:120-135`): Checks for existing `pending_payment` subscription and returns it rather than creating a duplicate. Prevents double-charging on retry.

5. **Frontend redirect on success** (`payment/page.tsx:212-213, 265`): Both Razorpay and Stripe handlers redirect to `/onboarding/questionnaire` after successful payment, which aligns with the onboarding gate flow.

### 🚨 FAIL / MISSING

1. **Hardcoded plan in frontend** (`payment/page.tsx:204, 245`): `apiCreateSubscription(token, "growth", "IN")` and `apiCreateSubscription(token, "growth", "US")` are hardcoded. The user's actual selected plan from the signup page is never passed to the API. **All users pay for the Growth plan regardless of selection.**

2. **No idempotency on webhook side**: If Razorpay/Stripe retries a webhook, the handler will re-run `_activate_user_account`. This is **functionally harmless** (sets same state) but performs an unnecessary DB write + commit. A proper idempotency check (e.g., skip if subscription already `active`) would prevent unnecessary load.

---

## Phase 2: Integration & Add-ons

### ✅ PASS

1. **Task creation logic** (`addons.py:82-96`): Correctly creates `Task` records with `is_addon=True`, `addon_id=addon.id`, `status=TaskStatus.pending`, and `priority=2`. The auto-assign worker will pick these up.

2. **Flushing before commit** (`addons.py:80`): `await db.flush()` is called after creating the `Addon` to obtain the `addon.id` before creating `Task` records that reference it. This is correct.

3. **Frontend addon flow** (`addons/page.tsx:133-156`): Correctly fetches pricing, allows quantity selection, and sends POST to `/api/v1/addons/purchase` per addon type.

### 🚨 FAIL / MISSING

1. **CRITICAL: `PaymentGateway` not imported** (`addons.py:76`): The endpoint uses `PaymentGateway.razorpay` but the import on line 12 is `from models.enums import AddonStatus, DeliverableType, TaskStatus`. **`PaymentGateway` is not imported.** This will raise a `NameError` at runtime, crashing every add-on purchase attempt.

2. **CRITICAL: No actual payment processing** (`addons.py:76-77`): The gateway is hardcoded to `PaymentGateway.razorpay` and `gateway_payment_id` is set to a mock string `f"mock_addon_pay_{uuid4().hex[:8]}"`. There is no call to Razorpay/Stripe to actually charge the customer. **Add-ons are free — no money is collected.**

3. **No webhook handler for add-on payments**: Unlike subscriptions, add-on purchases have no webhook-based activation. The `Addon.status` is set to `pending` and never transitions to `approved` or `completed`. There is no mechanism for the payment gateway to confirm the add-on payment was captured.

4. **Partial failure on multi-type purchases** (`addons/page.tsx:135-156`): The frontend sends sequential `POST /api/v1/addons/purchase` requests for each addon type. If the 2nd request fails, the 1st is already committed. **No rollback of prior successful purchases on partial failure.**

5. **No quantity limits**: There are no business rules preventing a client from ordering 10 reels in a single add-on purchase. The `Field(ge=1, le=10)` only caps per-request, not per-month.

---

## Phase 3: Edge Cases & Error Handling

### ✅ PASS

1. **`payment.failed` → `past_due` for both gateways** (`webhooks.py:136-148, 204-220`): Both Razorpay and Stripe correctly mark the subscription as `past_due`.

2. **Multi-channel failure notification** (`webhooks.py:66-74` → `notification_tasks.py:57-78`): After marking `past_due`, a Celery task `notify_payment_failure` is dispatched which sends both an email (Resend) and a WhatsApp message (MSG91). Retry logic with `max_retries=3` and 60-second countdown.

3. **Global exception handler** (`exceptions.py:54-68`): Unhandled exceptions in the webhook return a 500 with sanitized message, preventing stack trace leakage.

### 🚨 FAIL / MISSING

1. **Only catches `pending_payment` subscriptions on failure**: Both Razorpay (`webhooks.py:142-143`) and Stripe (`webhooks.py:210-211`) look for subscriptions with `status == "pending_payment"`. **If an active subscription fails on renewal (e.g., card expired mid-month), the handler will not find it and will silently do nothing.** The subscription remains `active` while the payment has failed — a billing-revenue leak.

2. **No `account_status` downgrade on payment failure**: `_mark_subscription_past_due` only updates the `Subscription.status`. It does **not** update `users.account_status` to `lapsed` or `suspended`. The user retains full portal access despite non-payment.

3. **No retry mechanism at webhook level**: If the DB commit fails transiently (e.g., connection pool exhaustion), the exception is caught and logged, but the webhook returns a non-200 status. The gateway will retry, but there's no explicit exponential backoff or dead-letter queue for permanently failed webhook processing.

4. **`_activate_user_account` has no guard against double activation**: If the subscription is already `active` and the webhook fires again, the function still runs `db.commit()`. A simple early-return would prevent unnecessary writes.

---

## Phase 4: AppSec & Signature Verification

### ✅ PASS

1. **Signature before DB changes — Razorpay** (`webhooks.py:96-103`): `verify_razorpay_signature` is called and validated **before** any DB operations. Invalid signatures raise 400 immediately.

2. **Signature before DB changes — Stripe** (`webhooks.py:171-180`): `verify_stripe_signature` is called via `run_in_threadpool` and validated **before** any DB operations. Missing or invalid signatures raise 400.

3. **No JWT auth on webhooks**: Neither `/api/webhooks/razorpay` nor `/api/webhooks/stripe` have `Depends(require_client)` or any auth dependency. This is **correct** — webhooks come from external servers.

4. **Webhook secret configuration** (`config.py:11-13`): `RAZORPAY_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET` are loaded from environment variables, not hardcoded.

5. **Rate limiting** (`webhooks.py:91, 160`): Both webhook endpoints are rate-limited to `100/minute` via SlowAPI.

6. **Tests exist** (`test_webhooks.py`): Covers missing signature, invalid signature, and malformed JSON for both gateways.

### 🚨 FAIL / MISSING

1. **Razorpay empty signature not explicitly checked** (`webhooks.py:94`): `request.headers.get("X-Razorpay-Signature", "")` passes an empty string to `verify_razorpay_signature`. While the Razorpay SDK will raise on empty signature (caught by the except block), the Stripe handler explicitly checks `if not sig_header` first (line 165-169). **Razorpay should have the same explicit guard** for consistency and clarity.

2. **Razorpay: Payload is parsed twice**: First parsed as raw bytes for signature verification (line 97), then parsed again as JSON (line 107). If the JSON parsing fails, a 400 is returned **after** signature verification succeeded. This is a minor info leak — the attacker knows the signature is valid. The signature check should happen on the parsed data, or the JSON parse should happen first and be included in signature verification.

3. **No IP whitelist**: Neither webhook endpoint validates the request source IP against known Razorpay/Stripe IP ranges. While signature verification is the primary defense, IP whitelisting is a defense-in-depth measure.

4. **CORS allows all methods and headers** (`main.py:53-54`): `allow_methods=["*"]` and `allow_headers=["*"]` on the entire app. While webhooks don't use CORS, this is overly permissive for a production API.

---

## Phase 5: Transactions & Data Integrity

### ✅ PASS

1. **Outer try/except with rollback** (`webhooks.py:151-154, 222-225`): Both webhook handlers wrap their DB operations in try/except, calling `await db.rollback()` on failure before re-raising. This prevents partial state commits.

2. **Add-on transaction boundary** (`addons.py:79-98`): The `Addon` creation, `Task` creation, and commit happen within the same session. If any step fails before commit, nothing is persisted (SQLAlchemy's unit-of-work pattern).

3. **Flush before commit for FK resolution** (`addons.py:80`): Correctly uses `flush()` to get the `Addon.id` before creating `Task` records that reference it, while staying within the same transaction.

### 🚨 FAIL / MISSING

1. **CRITICAL: `addons.py` commit is not wrapped in try/except**: If `db.commit()` at line 98 fails (e.g., constraint violation, connection error), the exception propagates to FastAPI's global handler. But the Addon and Tasks are in a dirty state within the session. There is **no explicit rollback** in the addon purchase flow. The session will be closed by `get_db`'s finally block, which may or may not rollback depending on SQLAlchemy's behavior with uncommitted dirty state.

2. **Celery task dispatched after commit** (`webhooks.py:70`): `notify_payment_failure.delay()` is called after `db.commit()`. If the Celery broker is down, the `.delay()` call will raise, **but the DB commit already succeeded**. The user is marked `past_due` but never notified. There is no fallback (e.g., storing a pending notification and retrying later).

3. **`change-plan` has no gateway coordination** (`payments.py:77-83`): The endpoint updates `user.plan_name` locally but does not:
   - Update the `Subscription` record's `plan_id`
   - Call the payment gateway to apply proration
   - Create a new subscription with the new plan
   - The subscription record is now **stale** — it still references the old plan.

4. **`_activate_user_account` does not use a single atomic transaction for both user and subscription updates**: While both are in the same session and commit, the function modifies the user first, then the subscription. If the subscription lookup fails (unlikely but possible), the user is activated but the subscription is not — leaving an inconsistent state.

5. **No distributed transaction coordination**: The addon purchase creates records and the frontend shows success, but there is no mechanism to reconcile if the Razorpay payment later fails via webhook. The `Addon.status` stays `pending` forever with no timeout or cleanup.

---

## Summary

| Category | Pass | Fail/Missing |
|---|---|---|
| Phase 1: Happy Path | 5 | 2 |
| Phase 2: Add-ons | 3 | 5 |
| Phase 3: Edge Cases | 3 | 4 |
| Phase 4: AppSec | 6 | 4 |
| Phase 5: Transactions | 3 | 5 |
| **Total** | **20** | **20** |

### Top 5 Critical Issues (Fix First)

1. **`PaymentGateway` not imported in `addons.py`** — Runtime crash on every add-on purchase. (`addons.py:76`)
2. **No actual payment collection for add-ons** — Mock gateway IDs, no Razorpay/Stripe call. (`addons.py:76-77`)
3. **Active subscription renewal failures are ignored** — Webhook only looks for `pending_payment` status. (`webhooks.py:142-143`)
4. **Hardcoded plan in payment page** — All users pay for Growth regardless of selection. (`payment/page.tsx:204`)
5. **`change-plan` doesn't sync with gateway or subscription record** — Local-only change, subscription stays stale. (`payments.py:77-83`)

---

# Domain 10 Audit — Notifications & Background Workers

## Phase 1: Feature & Happy Path (Celery Queue)

### ✅ PASS

1. **Celery app configuration** (`celery_app.py:6-21`): Properly configured with Redis broker/backend, JSON serialization, UTC timezone, `task_track_started=True`, `task_acks_late=True` (tasks acknowledged after execution, not before), and `worker_prefetch_multiplier=1` (one task at a time per worker). This is a solid reliability-first configuration.

2. **Beat schedule is comprehensive** (`celery_app.py:23-66`): Eight scheduled tasks covering:
   - Reports: weekly (Mon 8am), monthly (1st 8am), financial (1st 8am)
   - Operations: SLA breach checks (hourly), auto-assign (every 15min), renewal reminders (daily 9am), quota exhaustion (daily 10am), content calendar (25th monthly)
   - All tasks properly routed to `"default"` queue.

3. **Email dispatch** (`email.py:15-61`): `send_email` uses the Resend SDK with proper error handling, logging, and raises `RuntimeError` on failure. Sender address defaults to `notifications@creo.app`.

4. **WhatsApp dispatch** (`whatsapp.py:13-119`): `send_whatsapp_message` uses `httpx.AsyncClient` with a 30-second timeout, proper payload construction for MSG91 template messages, and handles both HTTP errors and network errors separately.

5. **Generic task wrappers** (`notification_tasks.py:22-41`): `send_email_task` and `send_whatsapp_task` are properly decorated with `@shared_task`, accept arbitrary parameters, and call the underlying async services via `_run_async`.

6. **Abandoned cart recovery trigger** (`auth.py:49-56`): On user registration, if the user has a phone number, `notify_incomplete_signup.apply_async(countdown=3600)` is called to send a WhatsApp reminder 1 hour later. The conditional `if user.phone` prevents scheduling for users without phone numbers.

7. **Automation tasks use proper async DB sessions** (`automation_tasks.py`): All five automation tasks (`check_sla_breaches`, `send_renewal_reminders`, `check_quota_exhaustion`, `auto_assign_tasks`, `generate_content_calendar`) correctly use `async with async_session() as db:` to open and close their own sessions, preventing connection leaks.

### 🚨 FAIL / MISSING

1. **Only 1 abandoned cart reminder instead of 3**: The PRD specifies 1hr, 2hr, and 4hr WhatsApp reminders. Only the 1hr reminder is implemented (`auth.py:53-56` with `countdown=3600`). **There are no 2hr (`countdown=7200`) or 4hr (`countdown=14400`) follow-up reminders.**

2. **No cancellation of abandoned cart reminder on completion**: If a user completes onboarding within the 1-hour window, the scheduled `notify_incomplete_signup` task will still fire and send a "come back" message to someone who already completed signup. There is no mechanism to revoke or cancel the pending Celery task (e.g., via `control.revoke()`).

3. **`notify_incomplete_signup` has no retry logic** (`notification_tasks.py:44-54`): This task is not decorated with `bind=True` and has no `max_retries`. If MSG91 is temporarily down, the task fails permanently with no retry attempt.

4. **`notify_payment_failure` has no retry logic** (`notification_tasks.py:57-78`): Same issue — no `bind=True`, no `max_retries`. If either Resend or MSG91 fails, the notification is permanently lost.

5. **`notify_sales_pricing_issue` has no retry logic** (`notification_tasks.py:81-92`): Same issue — fire-and-forget with no retry.

6. **Reports use hardcoded mock data** (`report_tasks.py:29-51, 73-100, 123-141`): All three report tasks (weekly, monthly, financial) return static mock data rather than querying the database. The financial report generates a real Excel file but with fabricated numbers. **No report actually reflects real business data.**

---

## Phase 2: Integration & Automations

### ✅ PASS

1. **SLA breach automation** (`automation_tasks.py:56-124`): Hourly task finds overdue tasks, creates `Escalation` records with calculated severity, updates task status to `overdue`, and emails admin team. Deduplication check prevents duplicate escalations for the same task.

2. **Auto-assignment engine** (`automation_tasks.py:336-441`): Every 15 minutes, finds unassigned tasks, queries team member daily caps, and assigns tasks to the member with the most remaining capacity. Properly decrements in-memory counters to prevent over-assignment within a single run.

3. **Renewal reminders** (`automation_tasks.py:130-187`): Daily at 9am, finds active subscriptions expiring in 3 days and sends email reminders. Uses proper date range filtering.

4. **Quota exhaustion alerts** (`automation_tasks.py:193-325`): Daily at 10am, checks all active subscriptions against plan quotas at 80% threshold. Sends both email and WhatsApp alerts. Multi-channel notification for quota warnings.

5. **Content calendar generation** (`automation_tasks.py:447-535`): Monthly on the 25th, auto-generates draft calendar entries for the next month based on plan quotas. Checks for existing entries to prevent duplicates.

6. **AI analysis with validation** (`onboarding_tasks.py:15-73`): The `generate_ai_analysis` task validates the AI response against required keys (`brand_tone`, `content_themes`, `audience_persona`, `goal_alignment`, `ai_summary_line`) before saving. Raises `ValueError` on missing keys.

### 🚨 FAIL / MISSING

1. **No scheduled follow-up beyond 1hr for abandoned carts**: As noted in Phase 1, the 2hr and 4hr reminders are missing. The `notify_incomplete_signup` task name suggests a single notification, not a sequence.

2. **`check_quota_exhaustion` counts `Addon` records, not `Task` records** (`automation_tasks.py:218-249`): The quota check queries `Addon` with `status == AddonStatus.completed`, but deliverables are tracked via `Task` and `Deliverable` models. If a task is completed but the addon record isn't updated to `completed`, the count will be wrong. The quota check may under-count or over-count usage.

3. **No heartbeat or dead-man switch for long-running tasks**: None of the automation tasks send heartbeats. If a task hangs (e.g., OpenAI API stall in `generate_ai_analysis`), Celery has no way to detect and kill it. The `soft_time_limit` and `time_limit` are not configured on any task.

4. **Financial report `generate_excel_report` is called but never used** (`report_tasks.py:112-192`): The `generate_financial_report` task builds a Workbook manually using openpyxl instead of calling `generate_excel_report` from `utils/exports.py`. The utility function exists but is unused — the task reimplements the Excel generation inline.

5. **Duplicate `generate_ai_analysis` task names**: Both `ai_tasks.py:70` and `onboarding_tasks.py:83` register a task named `"generate_ai_analysis"`. Since `celery_app.autodiscover_tasks(["workers"])` discovers both, the **last one loaded wins**. This means one of the two implementations is silently dead code. Which one runs depends on import order.

---

## Phase 3: Edge Cases & Error Handling

### ✅ PASS

1. **`send_email_task` retry** (`notification_tasks.py:22-30`): Has `max_retries=3` and retries with `countdown=60` on any exception. Uses `bind=True` for `self.retry()`.

2. **`send_whatsapp_task` retry** (`notification_tasks.py:33-41`): Same pattern — `max_retries=3`, `countdown=60`.

3. **`generate_ai_analysis` retry with backoff** (`onboarding_tasks.py:83-102`): Has `max_retries=3`, `default_retry_backoff=True`, and manual exponential backoff `countdown=60 * (2 ** self.request.retries)`. Only retries on `RETRYABLE_EXCEPTIONS` (ConnectionError, TimeoutError, OSError). Non-retryable failures are raised immediately.

4. **Per-user error isolation in automation tasks** (`automation_tasks.py`): Each automation task wraps individual user processing in try/except. If one user's email/WhatsApp fails, the loop continues to the next user. A single failure doesn't abort the entire batch.

5. **MSG91 response body logged on error** (`whatsapp.py:83-87`): The full API error response is logged, which aids debugging. The 30-second timeout prevents indefinite hangs.

### 🚨 FAIL / MISSING

1. **`notify_incomplete_signup` has zero retry logic** (`notification_tasks.py:44-54`): No `bind=True`, no `max_retries`, no try/except. A single MSG91 failure permanently loses the notification. This is the abandoned cart recovery — a revenue-critical notification.

2. **`notify_payment_failure` has zero retry logic** (`notification_tasks.py:57-78`): No retry mechanism. If Resend fails on the email, the user is never notified about the failed payment. If MSG91 fails on the WhatsApp, same issue. Both channels fail silently.

3. **`notify_sales_pricing_issue` has zero retry logic** (`notification_tasks.py:81-92`): No retry. A hot lead notification can be permanently lost.

4. **No exponential backoff on `send_email_task` and `send_whatsapp_task`**: Both use fixed `countdown=60`. After 3 retries at 60s intervals, the task is permanently failed. Exponential backoff (e.g., 60s, 120s, 240s) would be more resilient to transient outages.

5. **No Dead Letter Queue (DLQ) or failed task storage**: Permanently failed tasks are only logged. There is no database table, Redis queue, or admin dashboard to track and retry failed notifications. Failed payment alerts or abandoned cart messages are silently lost.

6. **`_run_async` in `notification_tasks.py` leaks event loops** (`notification_tasks.py:13-19`): `asyncio.get_event_loop()` is deprecated in Python 3.10+ for non-async contexts. The fallback creates a new event loop via `asyncio.new_event_loop()` but **never calls `loop.close()`**. Over thousands of task executions, this leaks file descriptors and memory.

7. **No `autoretry_for` on any task**: None of the tasks use Celery's built-in `autoretry_for` parameter, which would provide automatic retry with backoff without manual `self.retry()` calls. The manual approach works but is inconsistent across tasks.

8. **No `soft_time_limit` or `time_limit` on any task**: If `generate_ai_analysis` hangs on the OpenAI API, or `generate_content_calendar` enters an infinite loop, the worker will be blocked indefinitely. No timeout protection exists.

---

## Phase 4: AppSec & Data Privacy

### ✅ PASS

1. **No secrets logged**: API keys (`RESEND_API_KEY`, `MSG91_AUTH_KEY`, `STRIPE_SECRET_KEY`) are never logged. The `email.py` and `whatsapp.py` services only log operational metadata.

2. **User ID logging is acceptable** (`notification_tasks.py:84`): `logger.info(f"[Celery] Alerting sales team for user {user_id}")` — logging UUIDs is standard practice for audit trails.

3. **MSG91 auth key validated before use** (`whatsapp.py:38-39`): `if not auth_key: raise RuntimeError("MSG91_AUTH_KEY is not configured")` — prevents sending requests with empty auth.

### 🚨 FAIL / MISSING

1. **Email addresses logged in plaintext** — Multiple locations:
   - `notification_tasks.py:26`: `logger.info(f"[Celery] Dispatching email to {to_email}")`
   - `notification_tasks.py:29`: `logger.error(f"[Celery] Failed to send email to {to_email}. Retrying...")`
   - `notification_tasks.py:60`: `logger.info(f"[Celery] Sending payment failure alerts to {email} / {phone_number}")`
   - `email.py:38`: `logger.info("Sending email to=%s subject='%s' from='%s'", to_email, subject, sender)`
   - `email.py:50-53`: `logger.info("Email sent successfully to=%s message_id=%s", to_email, ...)`
   - `email.py:58`: `logger.exception("Unexpected error sending email to=%s", to_email)`
   - `automation_tasks.py:176`: `logger.error("Failed to send renewal reminder to %s: %s", user.email, exc)`
   - `automation_tasks.py:303`: `logger.error("Failed to send quota email to %s: %s", user.email, exc)`

2. **Phone numbers logged in plaintext** — Multiple locations:
   - `notification_tasks.py:37`: `logger.info(f"[Celery] Dispatching WhatsApp to {phone_number}")`
   - `notification_tasks.py:60`: `logger.info(f"[Celery] Sending payment failure alerts to {email} / {phone_number}")`
   - `whatsapp.py:68-72`: `logger.info("Sending WhatsApp message to=%s template=%s", full_phone, template_id)`
   - `whatsapp.py:94-98`: `logger.info("WhatsApp message sent to=%s response=%s", full_phone, result)`
   - `whatsapp.py:158`: `logger.info("Sending OTP SMS to=%s", full_phone)`
   - `automation_tasks.py:318`: `logger.warning("Failed to send quota WhatsApp to %s: %s", user.phone, exc)`

3. **Full phone number with country code logged** (`whatsapp.py:35`): `full_phone = f"{country_code}{phone_number}"` — the complete international number (e.g., `919876543210`) is logged. This is PII under most data protection regulations.

4. **MSG91 API response body logged on error** (`whatsapp.py:83-87`): `logger.error("MSG91 API error: status=%d body=%s", response.status_code, response.text)` — the response body may contain the recipient's phone number or other PII echoed back by MSG91.

5. **MSG91 API response logged on success** (`whatsapp.py:94-98`): `logger.info("WhatsApp message sent to=%s response=%s", full_phone, result)` — the full API response is logged, which may contain PII.

6. **OTP phone number logged** (`whatsapp.py:158`): `logger.info("Sending OTP SMS to=%s", full_phone)` — logs the phone number receiving an OTP. In production logs, this creates a mapping between phone numbers and authentication events.

7. **`user.full_name` embedded in HTML email bodies** (`automation_tasks.py:158, 286`): While not a log leak, the full name is interpolated directly into HTML without escaping. If a user's name contains HTML tags (e.g., `<script>alert(1)</script>`), this creates an **HTML injection / stored XSS** vector in email bodies.

---

## Phase 5: Performance & Resource Management

### ✅ PASS

1. **All automation tasks manage DB sessions correctly** (`automation_tasks.py`): Every async function uses `async with async_session() as db:` which ensures the session is properly closed after use, even on exceptions. No connection leak risk.

2. **`ai_tasks.py` and `onboarding_tasks.py` manage DB sessions correctly**: Both use `async with async_session() as db:` with proper try/except and rollback.

3. **`task_acks_late=True` with `worker_prefetch_multiplier=1`** (`celery_app.py:19-20`): Tasks are acknowledged only after completion, and workers fetch one task at a time. If a worker crashes, its in-progress task is re-queued. This is the correct configuration for reliability.

4. **httpx client properly scoped** (`whatsapp.py:74`): `async with httpx.AsyncClient(timeout=30.0) as client:` creates a new client per request and closes it after. No connection leak.

5. **Per-user error isolation prevents cascade failures** (`automation_tasks.py`): Each user's processing is wrapped in individual try/except blocks. One user's notification failure doesn't prevent others from being processed.

### 🚨 FAIL / MISSING

1. **`_run_async` in `notification_tasks.py` leaks event loops** (`notification_tasks.py:13-19`): Creates `asyncio.new_event_loop()` but never calls `loop.close()`. Each task execution leaks a loop. Over time (thousands of tasks), this exhausts file descriptors. The `automation_tasks.py` version is better (uses `asyncio.run()` which handles cleanup), but `notification_tasks.py` is the one used for the most frequent tasks (email/WhatsApp sends).

2. **`resend.Emails.send()` is synchronous** (`email.py:41`): The Resend SDK's `Emails.send()` is a synchronous HTTP call. When called inside `_run_async` → `loop.run_until_complete()`, it blocks the event loop thread. If multiple Celery workers share a thread pool, this can cause contention. The Resend SDK has an async client (`resend.AsyncEmails`) that should be used instead.

3. **No connection pool tuning for automation tasks**: The automation tasks (e.g., `check_quota_exhaustion`) loop through ALL active subscriptions, making multiple DB queries per user. With 100+ active clients, this could execute 400+ queries in a single session. The Supabase PgBouncer pooler has connection limits — no `pool_size` or `max_overflow` is configured on the SQLAlchemy engine (`database.py:15`).

4. **`generate_content_calendar` holds a DB session for the entire run** (`automation_tasks.py:464-524`): This task loads all active subscriptions, then for each subscription checks existing calendar entries and creates new ones. With many clients, this single session could be open for minutes, holding a PgBouncer connection the entire time.

5. **No result expiration configured** (`celery_app.py`): `result_expires` is not set. Task results accumulate in Redis indefinitely, consuming memory. For fire-and-forget notification tasks, results are never read but still stored.

6. **No worker concurrency limit**: The Celery worker configuration doesn't set `worker_concurrency`. On a small Railway instance, the default (number of CPU cores) may spawn too many workers, each potentially opening DB connections simultaneously.

7. **Mock data in reports wastes CPU cycles** (`report_tasks.py`): The weekly, monthly, and financial report tasks run on schedule but generate PDFs/Excel files from hardcoded mock data. These files are written to disk but never distributed or stored in Supabase Storage. The CPU and disk I/O are wasted.

---

## Summary

| Category | Pass | Fail/Missing |
|---|---|---|
| Phase 1: Happy Path | 7 | 6 |
| Phase 2: Integration | 6 | 5 |
| Phase 3: Edge Cases | 5 | 8 |
| Phase 4: AppSec | 3 | 7 |
| Phase 5: Performance | 5 | 7 |
| **Total** | **26** | **33** |

### Top 5 Critical Issues (Fix First)

1. **PII logged in plaintext everywhere** — Email addresses and phone numbers appear in 15+ log statements across `notification_tasks.py`, `email.py`, `whatsapp.py`, and `automation_tasks.py`. GDPR/DPDPA violation risk. Mask or remove PII from logs.
2. **`notify_incomplete_signup`, `notify_payment_failure`, `notify_sales_pricing_issue` have no retry logic** — Revenue-critical notifications (abandoned cart, payment failure, hot lead) are permanently lost on a single transient API failure.
3. **Event loop leak in `notification_tasks.py:_run_async`** — `asyncio.new_event_loop()` is never closed. Leaks file descriptors over time. Fix: use `asyncio.run()` or close the loop in a finally block.
4. **Duplicate `generate_ai_analysis` task registration** — Both `ai_tasks.py` and `onboarding_tasks.py` register the same task name. One silently overwrites the other. One is dead code.
5. **No 2hr/4hr abandoned cart reminders** — PRD specifies 3 reminder tiers; only the 1hr reminder is implemented. No cancellation mechanism if user completes onboarding.

