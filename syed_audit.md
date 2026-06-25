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

1. ✅ [FIXED] ~~**Hardcoded plan in frontend** (`payment/page.tsx:204, 245`): `apiCreateSubscription(token, "growth", "IN")` and `apiCreateSubscription(token, "growth", "US")` are hardcoded. The user's actual selected plan from the signup page is never passed to the API. **All users pay for the Growth plan regardless of selection.**~~

2. ✅ [FIXED] ~~**No idempotency on webhook side**: If Razorpay/Stripe retries a webhook, the handler will re-run `_activate_user_account`. This is **functionally harmless** (sets same state) but performs an unnecessary DB write + commit. A proper idempotency check (e.g., skip if subscription already `active`) would prevent unnecessary load.~~

---

## Phase 2: Integration & Add-ons

### ✅ PASS

1. **Task creation logic** (`addons.py:82-96`): Correctly creates `Task` records with `is_addon=True`, `addon_id=addon.id`, `status=TaskStatus.pending`, and `priority=2`. The auto-assign worker will pick these up.

2. **Flushing before commit** (`addons.py:80`): `await db.flush()` is called after creating the `Addon` to obtain the `addon.id` before creating `Task` records that reference it. This is correct.

3. **Frontend addon flow** (`addons/page.tsx:133-156`): Correctly fetches pricing, allows quantity selection, and sends POST to `/api/v1/addons/purchase` per addon type.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**CRITICAL: `PaymentGateway` not imported** (`addons.py:76`): The endpoint uses `PaymentGateway.razorpay` but the import on line 12 is `from models.enums import AddonStatus, DeliverableType, TaskStatus`. **`PaymentGateway` is not imported.** This will raise a `NameError` at runtime, crashing every add-on purchase attempt.~~

2. ✅ [FIXED] ~~**CRITICAL: No actual payment processing** (`addons.py:76-77`): The gateway is hardcoded to `PaymentGateway.razorpay` and `gateway_payment_id` is set to a mock string `f"mock_addon_pay_{uuid4().hex[:8]}"`. There is no call to Razorpay/Stripe to actually charge the customer. **Add-ons are free — no money is collected.**~~

3. ✅ [FIXED] ~~**No webhook handler for add-on payments**: Unlike subscriptions, add-on purchases have no webhook-based activation. The `Addon.status` is set to `pending` and never transitions to `approved` or `completed`. There is no mechanism for the payment gateway to confirm the add-on payment was captured.~~

4. ✅ [FIXED] ~~**Partial failure on multi-type purchases** (`addons/page.tsx:135-156`): The frontend sends sequential `POST /api/v1/addons/purchase` requests for each addon type. If the 2nd request fails, the 1st is already committed. **No rollback of prior successful purchases on partial failure.**~~

5. ✅ [FIXED] ~~**No quantity limits**: There are no business rules preventing a client from ordering 10 reels in a single add-on purchase. The `Field(ge=1, le=10)` only caps per-request, not per-month.~~

---

## Phase 3: Edge Cases & Error Handling

### ✅ PASS

1. **`payment.failed` → `past_due` for both gateways** (`webhooks.py:136-148, 204-220`): Both Razorpay and Stripe correctly mark the subscription as `past_due`.

2. **Multi-channel failure notification** (`webhooks.py:66-74` → `notification_tasks.py:57-78`): After marking `past_due`, a Celery task `notify_payment_failure` is dispatched which sends both an email (Resend) and a WhatsApp message (MSG91). Retry logic with `max_retries=3` and 60-second countdown.

3. **Global exception handler** (`exceptions.py:54-68`): Unhandled exceptions in the webhook return a 500 with sanitized message, preventing stack trace leakage.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**Only catches `pending_payment` subscriptions on failure**: Both Razorpay (`webhooks.py:142-143`) and Stripe (`webhooks.py:210-211`) look for subscriptions with `status == "pending_payment"`. **If an active subscription fails on renewal (e.g., card expired mid-month), the handler will not find it and will silently do nothing.** The subscription remains `active` while the payment has failed — a billing-revenue leak.~~

2. ✅ [FIXED] ~~**No `account_status` downgrade on payment failure**: `_mark_subscription_past_due` only updates the `Subscription.status`. It does **not** update `users.account_status` to `lapsed` or `suspended`. The user retains full portal access despite non-payment.~~

3. ✅ [FIXED] ~~**No retry mechanism at webhook level**: If the DB commit fails transiently (e.g., connection pool exhaustion), the exception is caught and logged, but the webhook returns a non-200 status. The gateway will retry, but there's no explicit exponential backoff or dead-letter queue for permanently failed webhook processing.~~

4. ✅ [FIXED] ~~**`_activate_user_account` has no guard against double activation**: If the subscription is already `active` and the webhook fires again, the function still runs `db.commit()`. A simple early-return would prevent unnecessary writes.~~

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

1. ✅ [FIXED] ~~**Razorpay empty signature not explicitly checked** (`webhooks.py:94`): `request.headers.get("X-Razorpay-Signature", "")` passes an empty string to `verify_razorpay_signature`. While the Razorpay SDK will raise on empty signature (caught by the except block), the Stripe handler explicitly checks `if not sig_header` first (line 165-169). **Razorpay should have the same explicit guard** for consistency and clarity.~~

2. ✅ [FIXED] ~~**Razorpay: Payload is parsed twice**: First parsed as raw bytes for signature verification (line 97), then parsed again as JSON (line 107). If the JSON parsing fails, a 400 is returned **after** signature verification succeeded. This is a minor info leak — the attacker knows the signature is valid. The signature check should happen on the parsed data, or the JSON parse should happen first and be included in signature verification.~~

3. ✅ [FIXED] ~~**No IP whitelist**: Neither webhook endpoint validates the request source IP against known Razorpay/Stripe IP ranges. While signature verification is the primary defense, IP whitelisting is a defense-in-depth measure.~~

4. ✅ [FIXED] ~~**CORS allows all methods and headers** (`main.py:53-54`): `allow_methods=["*"]` and `allow_headers=["*"]` on the entire app. While webhooks don't use CORS, this is overly permissive for a production API.~~

---

## Phase 5: Transactions & Data Integrity

### ✅ PASS

1. **Outer try/except with rollback** (`webhooks.py:151-154, 222-225`): Both webhook handlers wrap their DB operations in try/except, calling `await db.rollback()` on failure before re-raising. This prevents partial state commits.

2. **Add-on transaction boundary** (`addons.py:79-98`): The `Addon` creation, `Task` creation, and commit happen within the same session. If any step fails before commit, nothing is persisted (SQLAlchemy's unit-of-work pattern).

3. **Flush before commit for FK resolution** (`addons.py:80`): Correctly uses `flush()` to get the `Addon.id` before creating `Task` records that reference it, while staying within the same transaction.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**CRITICAL: `addons.py` commit is not wrapped in try/except**: If `db.commit()` at line 98 fails (e.g., constraint violation, connection error), the exception propagates to FastAPI's global handler. But the Addon and Tasks are in a dirty state within the session. There is **no explicit rollback** in the addon purchase flow. The session will be closed by `get_db`'s finally block, which may or may not rollback depending on SQLAlchemy's behavior with uncommitted dirty state.~~

2. ✅ [FIXED] ~~**Celery task dispatched after commit** (`webhooks.py:70`): `notify_payment_failure.delay()` is called after `db.commit()`. If the Celery broker is down, the `.delay()` call will raise, **but the DB commit already succeeded**. The user is marked `past_due` but never notified. There is no fallback (e.g., storing a pending notification and retrying later).~~

3. ✅ [FIXED] ~~**`change-plan` has no gateway coordination** (`payments.py:77-83`): The endpoint updates `user.plan_name` locally but does not:
   - Update the `Subscription` record's `plan_id`
   - Call the payment gateway to apply proration
   - Create a new subscription with the new plan
   - The subscription record is now **stale** — it still references the old plan.~~

4. ✅ [FIXED] ~~**`_activate_user_account` does not use a single atomic transaction for both user and subscription updates**: While both are in the same session and commit, the function modifies the user first, then the subscription. If the subscription lookup fails (unlikely but possible), the user is activated but the subscription is not — leaving an inconsistent state.~~

5. ✅ [FIXED] ~~**No distributed transaction coordination**: The addon purchase creates records and the frontend shows success, but there is no mechanism to reconcile if the Razorpay payment later fails via webhook. The `Addon.status` stays `pending` forever with no timeout or cleanup.~~

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

1. ✅ [FIXED] ~~**`PaymentGateway` not imported in `addons.py`** — Runtime crash on every add-on purchase. (`addons.py:76`)~~
2. ✅ [FIXED] ~~**No actual payment collection for add-ons** — Mock gateway IDs, no Razorpay/Stripe call. (`addons.py:76-77`)~~
3. ✅ [FIXED] ~~**Active subscription renewal failures are ignored** — Webhook only looks for `pending_payment` status. (`webhooks.py:142-143`)~~
4. ✅ [FIXED] ~~**Hardcoded plan in payment page** — All users pay for Growth regardless of selection. (`payment/page.tsx:204`)~~
5. ✅ [FIXED] ~~**`change-plan` doesn't sync with gateway or subscription record** — Local-only change, subscription stays stale. (`payments.py:77-83`)~~

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

1. ✅ [FIXED] ~~**Only 1 abandoned cart reminder instead of 3**: The PRD specifies 1hr, 2hr, and 4hr WhatsApp reminders. Only the 1hr reminder is implemented (`auth.py:53-56` with `countdown=3600`). **There are no 2hr (`countdown=7200`) or 4hr (`countdown=14400`) follow-up reminders.**~~

2. ✅ [FIXED] ~~**No cancellation of abandoned cart reminder on completion**: If a user completes onboarding within the 1-hour window, the scheduled `notify_incomplete_signup` task will still fire and send a "come back" message to someone who already completed signup. There is no mechanism to revoke or cancel the pending Celery task (e.g., via `control.revoke()`).~~

3. ✅ [FIXED] ~~**`notify_incomplete_signup` has no retry logic** (`notification_tasks.py:44-54`): This task is not decorated with `bind=True` and has no `max_retries`. If MSG91 is temporarily down, the task fails permanently with no retry attempt.~~

4. ✅ [FIXED] ~~**`notify_payment_failure` has no retry logic** (`notification_tasks.py:57-78`): Same issue — no `bind=True`, no `max_retries`. If either Resend or MSG91 fails, the notification is permanently lost.~~

5. ✅ [FIXED] ~~**`notify_sales_pricing_issue` has no retry logic** (`notification_tasks.py:81-92`): Same issue — fire-and-forget with no retry.~~

6. ✅ [FIXED] ~~**Reports use hardcoded mock data** (`report_tasks.py:29-51, 73-100, 123-141`): All three report tasks (weekly, monthly, financial) return static mock data rather than querying the database. The financial report generates a real Excel file but with fabricated numbers. **No report actually reflects real business data.**~~

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

1. ✅ [FIXED] ~~**No scheduled follow-up beyond 1hr for abandoned carts**: As noted in Phase 1, the 2hr and 4hr reminders are missing. The `notify_incomplete_signup` task name suggests a single notification, not a sequence.~~

2. ✅ [FIXED] ~~**`check_quota_exhaustion` counts `Addon` records, not `Task` records** (`automation_tasks.py:218-249`): The quota check queries `Addon` with `status == AddonStatus.completed`, but deliverables are tracked via `Task` and `Deliverable` models. If a task is completed but the addon record isn't updated to `completed`, the count will be wrong. The quota check may under-count or over-count usage.~~

3. ✅ [FIXED] ~~**No heartbeat or dead-man switch for long-running tasks**: None of the automation tasks send heartbeats. If a task hangs (e.g., OpenAI API stall in `generate_ai_analysis`), Celery has no way to detect and kill it. The `soft_time_limit` and `time_limit` are not configured on any task.~~

4. ✅ [FIXED] ~~**Financial report `generate_excel_report` is called but never used** (`report_tasks.py:112-192`): The `generate_financial_report` task builds a Workbook manually using openpyxl instead of calling `generate_excel_report` from `utils/exports.py`. The utility function exists but is unused — the task reimplements the Excel generation inline.~~

5. ✅ [FIXED] ~~**Duplicate `generate_ai_analysis` task names**: Both `ai_tasks.py:70` and `onboarding_tasks.py:83` register a task named `"generate_ai_analysis"`. Since `celery_app.autodiscover_tasks(["workers"])` discovers both, the **last one loaded wins**. This means one of the two implementations is silently dead code. Which one runs depends on import order.~~

---

## Phase 3: Edge Cases & Error Handling

### ✅ PASS

1. **`send_email_task` retry** (`notification_tasks.py:22-30`): Has `max_retries=3` and retries with `countdown=60` on any exception. Uses `bind=True` for `self.retry()`.

2. **`send_whatsapp_task` retry** (`notification_tasks.py:33-41`): Same pattern — `max_retries=3`, `countdown=60`.

3. **`generate_ai_analysis` retry with backoff** (`onboarding_tasks.py:83-102`): Has `max_retries=3`, `default_retry_backoff=True`, and manual exponential backoff `countdown=60 * (2 ** self.request.retries)`. Only retries on `RETRYABLE_EXCEPTIONS` (ConnectionError, TimeoutError, OSError). Non-retryable failures are raised immediately.

4. **Per-user error isolation in automation tasks** (`automation_tasks.py`): Each automation task wraps individual user processing in try/except. If one user's email/WhatsApp fails, the loop continues to the next user. A single failure doesn't abort the entire batch.

5. **MSG91 response body logged on error** (`whatsapp.py:83-87`): The full API error response is logged, which aids debugging. The 30-second timeout prevents indefinite hangs.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**`notify_incomplete_signup` has zero retry logic** (`notification_tasks.py:44-54`): No `bind=True`, no `max_retries`, no try/except. A single MSG91 failure permanently loses the notification. This is the abandoned cart recovery — a revenue-critical notification.~~

2. ✅ [FIXED] ~~**`notify_payment_failure` has zero retry logic** (`notification_tasks.py:57-78`): No retry mechanism. If Resend fails on the email, the user is never notified about the failed payment. If MSG91 fails on the WhatsApp, same issue. Both channels fail silently.~~

3. ✅ [FIXED] ~~**`notify_sales_pricing_issue` has zero retry logic** (`notification_tasks.py:81-92`): No retry. A hot lead notification can be permanently lost.~~

4. ✅ [FIXED] ~~**No exponential backoff on `send_email_task` and `send_whatsapp_task`**: Both use fixed `countdown=60`. After 3 retries at 60s intervals, the task is permanently failed. Exponential backoff (e.g., 60s, 120s, 240s) would be more resilient to transient outages.~~

5. ✅ [FIXED] ~~**No Dead Letter Queue (DLQ) or failed task storage**: Permanently failed tasks are only logged. There is no database table, Redis queue, or admin dashboard to track and retry failed notifications. Failed payment alerts or abandoned cart messages are silently lost.~~

6. ✅ [FIXED] ~~**`_run_async` in `notification_tasks.py` leaks event loops** (`notification_tasks.py:13-19`): `asyncio.get_event_loop()` is deprecated in Python 3.10+ for non-async contexts. The fallback creates a new event loop via `asyncio.new_event_loop()` but **never calls `loop.close()`**. Over thousands of task executions, this leaks file descriptors and memory.~~

7. ✅ [FIXED] ~~**No `autoretry_for` on any task**: None of the tasks use Celery's built-in `autoretry_for` parameter, which would provide automatic retry with backoff without manual `self.retry()` calls. The manual approach works but is inconsistent across tasks.~~

8. ✅ [FIXED] ~~**No `soft_time_limit` or `time_limit` on any task**: If `generate_ai_analysis` hangs on the OpenAI API, or `generate_content_calendar` enters an infinite loop, the worker will be blocked indefinitely. No timeout protection exists.~~

---

## Phase 4: AppSec & Data Privacy

### ✅ PASS

1. **No secrets logged**: API keys (`RESEND_API_KEY`, `MSG91_AUTH_KEY`, `STRIPE_SECRET_KEY`) are never logged. The `email.py` and `whatsapp.py` services only log operational metadata.

2. **User ID logging is acceptable** (`notification_tasks.py:84`): `logger.info(f"[Celery] Alerting sales team for user {user_id}")` — logging UUIDs is standard practice for audit trails.

3. **MSG91 auth key validated before use** (`whatsapp.py:38-39`): `if not auth_key: raise RuntimeError("MSG91_AUTH_KEY is not configured")` — prevents sending requests with empty auth.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**Email addresses logged in plaintext** — Multiple locations:
   - `notification_tasks.py:26`: `logger.info(f"[Celery] Dispatching email to {to_email}")`
   - `notification_tasks.py:29`: `logger.error(f"[Celery] Failed to send email to {to_email}. Retrying...")`
   - `notification_tasks.py:60`: `logger.info(f"[Celery] Sending payment failure alerts to {email} / {phone_number}")`
   - `email.py:38`: `logger.info("Sending email to=%s subject='%s' from='%s'", to_email, subject, sender)`
   - `email.py:50-53`: `logger.info("Email sent successfully to=%s message_id=%s", to_email, ...)`
   - `email.py:58`: `logger.exception("Unexpected error sending email to=%s", to_email)`
   - `automation_tasks.py:176`: `logger.error("Failed to send renewal reminder to %s: %s", user.email, exc)`
   - `automation_tasks.py:303`: `logger.error("Failed to send quota email to %s: %s", user.email, exc)`~~

2. ✅ [FIXED] ~~**Phone numbers logged in plaintext** — Multiple locations:
   - `notification_tasks.py:37`: `logger.info(f"[Celery] Dispatching WhatsApp to {phone_number}")`
   - `notification_tasks.py:60`: `logger.info(f"[Celery] Sending payment failure alerts to {email} / {phone_number}")`
   - `whatsapp.py:68-72`: `logger.info("Sending WhatsApp message to=%s template=%s", full_phone, template_id)`
   - `whatsapp.py:94-98`: `logger.info("WhatsApp message sent to=%s response=%s", full_phone, result)`
   - `whatsapp.py:158`: `logger.info("Sending OTP SMS to=%s", full_phone)`
   - `automation_tasks.py:318`: `logger.warning("Failed to send quota WhatsApp to %s: %s", user.phone, exc)`~~

3. ✅ [FIXED] ~~**Full phone number with country code logged** (`whatsapp.py:35`): `full_phone = f"{country_code}{phone_number}"` — the complete international number (e.g., `919876543210`) is logged. This is PII under most data protection regulations.~~

4. ✅ [FIXED] ~~**MSG91 API response body logged on error** (`whatsapp.py:83-87`): `logger.error("MSG91 API error: status=%d body=%s", response.status_code, response.text)` — the response body may contain the recipient's phone number or other PII echoed back by MSG91.~~

5. ✅ [FIXED] ~~**MSG91 API response logged on success** (`whatsapp.py:94-98`): `logger.info("WhatsApp message sent to=%s response=%s", full_phone, result)` — the full API response is logged, which may contain PII.~~

6. ✅ [FIXED] ~~**OTP phone number logged** (`whatsapp.py:158`): `logger.info("Sending OTP SMS to=%s", full_phone)` — logs the phone number receiving an OTP. In production logs, this creates a mapping between phone numbers and authentication events.~~

7. ✅ [FIXED] ~~**`user.full_name` embedded in HTML email bodies** (`automation_tasks.py:158, 286`): While not a log leak, the full name is interpolated directly into HTML without escaping. If a user's name contains HTML tags (e.g., `<script>alert(1)</script>`), this creates an **HTML injection / stored XSS** vector in email bodies.~~

---

## Phase 5: Performance & Resource Management

### ✅ PASS

1. **All automation tasks manage DB sessions correctly** (`automation_tasks.py`): Every async function uses `async with async_session() as db:` which ensures the session is properly closed after use, even on exceptions. No connection leak risk.

2. **`ai_tasks.py` and `onboarding_tasks.py` manage DB sessions correctly**: Both use `async with async_session() as db:` with proper try/except and rollback.

3. **`task_acks_late=True` with `worker_prefetch_multiplier=1`** (`celery_app.py:19-20`): Tasks are acknowledged only after completion, and workers fetch one task at a time. If a worker crashes, its in-progress task is re-queued. This is the correct configuration for reliability.

4. **httpx client properly scoped** (`whatsapp.py:74`): `async with httpx.AsyncClient(timeout=30.0) as client:` creates a new client per request and closes it after. No connection leak.

5. **Per-user error isolation prevents cascade failures** (`automation_tasks.py`): Each user's processing is wrapped in individual try/except blocks. One user's notification failure doesn't prevent others from being processed.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**`_run_async` in `notification_tasks.py` leaks event loops** (`notification_tasks.py:13-19`): Creates `asyncio.new_event_loop()` but never calls `loop.close()`. Each task execution leaks a loop. Over time (thousands of tasks), this exhausts file descriptors. The `automation_tasks.py` version is better (uses `asyncio.run()` which handles cleanup), but `notification_tasks.py` is the one used for the most frequent tasks (email/WhatsApp sends).~~

2. ✅ [FIXED] ~~**`resend.Emails.send()` is synchronous** (`email.py:41`): The Resend SDK's `Emails.send()` is a synchronous HTTP call. When called inside `_run_async` → `loop.run_until_complete()`, it blocks the event loop thread. If multiple Celery workers share a thread pool, this can cause contention. The Resend SDK has an async client (`resend.AsyncEmails`) that should be used instead.~~

3. ✅ [FIXED] ~~**No connection pool tuning for automation tasks**: The automation tasks (e.g., `check_quota_exhaustion`) loop through ALL active subscriptions, making multiple DB queries per user. With 100+ active clients, this could execute 400+ queries in a single session. The Supabase PgBouncer pooler has connection limits — no `pool_size` or `max_overflow` is configured on the SQLAlchemy engine (`database.py:15`).~~

4. ✅ [FIXED] ~~**`generate_content_calendar` holds a DB session for the entire run** (`automation_tasks.py:464-524`): This task loads all active subscriptions, then for each subscription checks existing calendar entries and creates new ones. With many clients, this single session could be open for minutes, holding a PgBouncer connection the entire time.~~

5. ✅ [FIXED] ~~**No result expiration configured** (`celery_app.py`): `result_expires` is not set. Task results accumulate in Redis indefinitely, consuming memory. For fire-and-forget notification tasks, results are never read but still stored.~~

6. ✅ [FIXED] ~~**No worker concurrency limit**: The Celery worker configuration doesn't set `worker_concurrency`. On a small Railway instance, the default (number of CPU cores) may spawn too many workers, each potentially opening DB connections simultaneously.~~

7. ✅ [FIXED] ~~**Mock data in reports wastes CPU cycles** (`report_tasks.py`): The weekly, monthly, and financial report tasks run on schedule but generate PDFs/Excel files from hardcoded mock data. These files are written to disk but never distributed or stored in Supabase Storage. The CPU and disk I/O are wasted.~~

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

1. ✅ [FIXED] ~~**PII logged in plaintext everywhere** — Email addresses and phone numbers appear in 15+ log statements across `notification_tasks.py`, `email.py`, `whatsapp.py`, and `automation_tasks.py`. GDPR/DPDPA violation risk. Mask or remove PII from logs.~~
2. ✅ [FIXED] ~~**`notify_incomplete_signup`, `notify_payment_failure`, `notify_sales_pricing_issue` have no retry logic** — Revenue-critical notifications (abandoned cart, payment failure, hot lead) are permanently lost on a single transient API failure.~~
3. ✅ [FIXED] ~~**Event loop leak in `notification_tasks.py:_run_async`** — `asyncio.new_event_loop()` is never closed. Leaks file descriptors over time. Fix: use `asyncio.run()` or close the loop in a finally block.~~
4. ✅ [FIXED] ~~**Duplicate `generate_ai_analysis` task registration** — Both `ai_tasks.py` and `onboarding_tasks.py` register the same task name. One silently overwrites the other. One is dead code.~~
5. ✅ [FIXED] ~~**No 2hr/4hr abandoned cart reminders** — PRD specifies 3 reminder tiers; only the 1hr reminder is implemented. No cancellation mechanism if user completes onboarding.~~

---

# Domain 11 Audit — Authentication & Roles

## Phase 1: Feature & Happy Path (JWT & Role Verification)

### ✅ PASS

1. **JWT decoding** (`security.py:50-58`): `get_current_user` correctly decodes the Supabase JWT using `SUPABASE_JWT_SECRET` with HS256 algorithm via `python-jose`. Extracts `auth_id` from the standard `sub` claim. Raises 401 on `JWTError` or missing `sub`.

2. **User lookup by `auth_id`** (`security.py:60-61`): Queries `public.users` where `auth_id` matches the JWT's `sub`. This correctly maps Supabase Auth users to application users.

3. **Soft-delete guard on auth** (`security.py:65-66`): `if user.deleted_at is not None: raise credentials_exception` — soft-deleted users are rejected at the authentication layer. This is a defense-in-depth check.

4. **Role-based dependency injection** (`security.py:74-101`): `require_role(*roles)` creates a dependency that checks `current_user.role` against allowed roles. Returns 403 if unauthorized. All seven role dependencies are correctly defined.

5. **Frontend middleware role routing** (`middleware.ts:24-39`): `canAccessRoute()` maps roles to allowed route prefixes. Admin/super_admin get full access. Clients are restricted to `/portal`. Team members to `/dashboard`. Sales to `/sales`. Redirects unauthorized users to their role's home page.

6. **Frontend auth guard** (`middleware.ts:73-78`): Unauthenticated users accessing protected routes are redirected to `/login` with a `redirectedFrom` parameter for post-login redirect.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No role-based session timeout enforcement**: The PRD specifies: Clients 30 days, Internal 8 hours, Admin 4 hours. The code relies entirely on Supabase's default JWT expiry (typically 1 hour). There is **no logic** to:
   - Check the JWT's `iat` (issued-at) claim against role-specific maximums
   - Reject tokens that are older than the role's allowed session duration
   - Issue longer-lived tokens for clients or shorter-lived for admins~~

2. ✅ [FIXED] ~~**Frontend role comes from Supabase metadata, not `public.users`** (`middleware.ts:81`): `const role = user.user_metadata?.role ?? "client"` reads the role from Supabase Auth's `user_metadata`. If an admin changes a user's role in the `public.users` table (e.g., via admin panel), the frontend middleware won't reflect the change until the Supabase session is refreshed. **Privilege escalation window**: a demoted user retains their old role's frontend access until token refresh.~~

3. ✅ [FIXED] ~~**No token revocation mechanism**: If a user is soft-deleted or suspended, their existing JWT remains valid until expiry. There is no server-side token blocklist or session invalidation. A suspended user with a valid JWT can continue making API calls until the token expires.~~

4. ✅ [FIXED] ~~**`user.user_metadata` trust gap**: The frontend trusts `user.user_metadata?.role` for routing decisions, but this is set during Supabase Auth signup and not synchronized with the `public.users.role` column. If the two diverge, the frontend and backend enforce different roles.~~

---

## Phase 2: Integration & File Storage

### ✅ PASS

1. **Instagram token encrypted at rest** (`account.py:61`): `current_user.instagram_access_token = encrypt_token(long_lived_token)` — the long-lived Instagram token is Fernet-encrypted before being written to the database.

2. **Instagram token decrypted on use** (`deliverables.py:294`): `decrypted_token = decrypt_token(client_user.instagram_access_token)` — decrypted only when needed for API calls, never logged.

3. **Instagram token refreshed after publish** (`deliverables.py:323-327`): After publishing to Instagram, the code attempts to refresh the access token and re-encrypts the new token. This maintains token validity.

4. **Signed download URLs** (`deliverables.py:98-103`): File downloads use Supabase Storage signed URLs with 1-hour expiry. The file URL itself is not exposed — only the time-limited signed URL.

5. **File uploads bypass FastAPI** (`deliverables.py`): No upload endpoint exists in the deliverables router. Per the AGENTS.md directive ("File uploads go directly to Supabase Storage — never through FastAPI"), the frontend uploads directly to Supabase Storage. FastAPI only handles metadata and signed URL generation.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No auth trigger to auto-create `public.users` from Supabase Auth**: The `002_create_users_table.py` migration creates the `users` table and a `updated_at` trigger, but there is **no trigger on `auth.users`** to auto-insert into `public.users`. User creation relies entirely on `POST /api/v1/auth/register`. If Supabase Auth succeeds but the FastAPI endpoint fails (network error, DB constraint), the user exists in `auth.users` but not in `public.users`. They can authenticate but cannot use the app — a zombie account.~~

2. ✅ [FIXED] ~~**`SUPABASE_SERVICE_ROLE_KEY` used in storage service** (`storage.py:13`): The service role client is initialized with `SUPABASE_SERVICE_ROLE_KEY` for generating signed URLs. This is correct for server-side operations, but the client is cached as a global singleton (`_supabase_client`). If the key is rotated, the cached client will use the stale key until the process restarts.~~

3. ✅ [FIXED] ~~**No upload URL generation endpoint**: The frontend must construct Supabase Storage upload URLs itself, using the Supabase anon key. There is no server-side validation of file type, size, or naming convention before upload. A malicious client could upload arbitrary files to the storage bucket.~~

4. ✅ [FIXED] ~~**`deliverables` RLS policy allows `submitted_by` team members to SELECT client deliverables** (`022_enable_rls.py:110-118`): The SELECT policy allows any team member who submitted a deliverable to see it. But it also allows the **client** who owns it. This is correct, but there's no policy preventing a team member from seeing deliverables for clients they're not assigned to — only deliverables they personally submitted.~~

---

## Phase 3: Edge Cases & Soft Deletes

### ✅ PASS

1. **Auth layer rejects soft-deleted users** (`security.py:65-66`): `get_current_user` checks `user.deleted_at is not None` and raises 401. This is the primary defense.

2. **Admin client lists filter soft-deletes** (`admin_clients.py:30, 74`): Both `list_clients` and `get_client_detail` include `User.deleted_at.is_(None)`.

3. **Admin dashboard filters soft-deletes** (`admin_dashboard.py:28, 40`): Active client count and MRR calculation both filter `User.deleted_at.is_(None)`.

4. **Sales client list filters soft-deletes** (`sales.py:21, 49`): Both `list_sales_clients` and `create_custom_pricing` filter `User.deleted_at.is_(None)`.

5. **Admin team management filters soft-deletes** (`admin_team.py:32`): `list_team_members` filters `User.deleted_at.is_(None)`.

6. **Admin KPI revenue filters soft-deletes** (`admin_kpi.py:101`): Revenue calculation filters `User.deleted_at.is_(None)`.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**Admin KPI deliverable counts ignore client soft-delete** (`admin_kpi.py:29-42`): The `approved_count` and `total_submitted` queries count deliverables by `created_at` date but do **not** join to `users` or filter by `User.deleted_at.is_(None)`. **Deleted clients' deliverables inflate KPI metrics.**~~

2. ✅ [FIXED] ~~**Admin KPI task counts ignore client soft-delete** (`admin_kpi.py:49-54`): `active_tasks_count` counts all tasks with `pending` or `in_progress` status without filtering out tasks belonging to soft-deleted clients.~~

3. ✅ [FIXED] ~~**Admin KPI team capacity ignores client soft-delete** (`admin_kpi.py:71-77`): Team member load calculation counts all assigned tasks, including those for deleted clients.~~

4. ✅ [FIXED] ~~**Portal dashboard has no explicit `deleted_at` filter** (`portal_dashboard.py:32-48`): Queries for deliverables and tickets use `current_user.id` which is already validated by `get_current_user`. This is **safe** but fragile — if a different auth mechanism bypasses `get_current_user`, soft-deleted data would be exposed.~~

5. ✅ [FIXED] ~~**No global SQLAlchemy query filter for soft-deletes**: There is no `default_scope` or event listener on the `User` model to automatically filter `deleted_at IS NULL`. Each query must manually include the filter. This is error-prone — any new endpoint that queries `users` without the filter will expose deleted users.~~

6. ✅ [FIXED] ~~**Soft-delete only on `users` table**: No other tables (`subscriptions`, `tasks`, `deliverables`, `tickets`, etc.) have a `deleted_at` column. There is no mechanism to soft-delete or archive these entities. A deleted client's subscriptions, tasks, and deliverables remain in the database with their original `client_id` — they're just invisible because the user is filtered.~~

---

## Phase 4: AppSec & Encryption

### ✅ PASS

1. **`SUPABASE_SERVICE_ROLE_KEY` isolated to backend** (`config.py:7`): Loaded from env vars via `pydantic-settings`. Only used in `services/storage.py`. Never passed to any API response or frontend bundle.

2. **Instagram token Fernet-encrypted** (`security.py:30-37`, `account.py:61`): `encrypt_token()` uses `cryptography.fernet.Fernet` with a key from `ENCRYPTION_KEY` env var. The token is encrypted before DB write and decrypted only at point-of-use.

3. **`ENCRYPTION_KEY` validated** (`security.py:24-25`): `if not key: raise RuntimeError("ENCRYPTION_KEY is not set")` — prevents startup with missing encryption key.

4. **No secrets in API responses**: The `UserOut` schema and API responses never include `instagram_access_token`, `razorpay_customer_id`, `stripe_customer_id`, or other sensitive fields.

5. **Webhook secrets in env vars** (`config.py:11-13`): `RAZORPAY_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET` are loaded from environment, not hardcoded.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**`razorpay_customer_id` and `stripe_customer_id` stored in plaintext** (`user.py:55-56`): These are payment gateway customer identifiers. While not as sensitive as access tokens, they are PII that could be used for social engineering or account correlation. They should be encrypted at rest.~~

2. ✅ [FIXED] ~~**`ENCRYPTION_KEY` cached globally without rotation support** (`security.py:17-27`): `_fernet` is a module-level singleton. If `ENCRYPTION_KEY` is rotated (e.g., via env var update), the cached `Fernet` instance continues using the old key. There is no mechanism to detect key rotation or re-initialize.~~

3. ✅ [FIXED] ~~**No key versioning for encrypted tokens**: If `ENCRYPTION_KEY` is rotated, all existing encrypted Instagram tokens become undecryptable. There is no key versioning or multi-key support for graceful rotation.~~

4. ✅ [FIXED] ~~**`SUPABASE_JWT_SECRET` used directly** (`security.py:52`): The JWT secret is used directly for verification. If this secret is compromised, all JWTs can be forged. There is no key rotation mechanism or multi-key support for JWT verification.~~

5. ✅ [FIXED] ~~**CORS allows all methods and headers** (`main.py:53-54`): `allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive. In production, this should be restricted to specific methods and headers needed by the frontend.~~

6. ✅ [FIXED] ~~**`user.full_name` not escaped in email HTML** (`automation_tasks.py:158, 286`): User-supplied `full_name` is interpolated directly into HTML email bodies via f-strings. If a user's name contains HTML/JS (e.g., `<script>alert(1)</script>`), this creates a **stored HTML injection** vector in emails sent to admins.~~

---

## Phase 5: Performance & Indexes

### ✅ PASS

1. **`users.auth_id` indexed** (`002_create_users_table.py:22`): `unique=True` on the column creates a unique index. Used in every `get_current_user` call.

2. **`users.email` indexed** (`021_create_indexes.py:20`): `ix_users_email` created for login lookups.

3. **`users.role` indexed** (`021_create_indexes.py:22`): `ix_users_role` created for role-based queries.

4. **`tasks.assigned_to` indexed** (`010_create_tasks_table.py:46`): `ix_tasks_assigned_to` created for assignment lookups.

5. **`tasks.due_date` indexed** (`010_create_tasks_table.py:48`): `ix_tasks_due_date` created for SLA breach checks.

6. **Composite indexes** (`021_create_indexes.py`): Performance-critical composite indexes on:
   - `tasks(assigned_to, status)` — auto-assign and capacity queries
   - `tasks(client_id, status)` — portal task lists
   - `deliverables(client_id, status)` — portal deliverable lists
   - `subscriptions(user_id, status)` — payment lookups
   - `notifications(user_id, is_read)` — notification badge
   - `tickets(user_id, status)` — support ticket lists

7. **All model-level `index=True` columns have corresponding migration indexes**: `tasks.status`, `tasks.client_id`, `tasks.assigned_to`, `tasks.due_date`, `tasks.calendar_entry_id` all have explicit `op.create_index` calls in `010_create_tasks_table.py`.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No index on `subscriptions.gateway_subscription_id`**: This column is used in Stripe webhook lookups (`webhooks.py:191`) with `Subscription.gateway_subscription_id == stripe_subscription_id`. While it has `unique=True` in the model, the migration `004_create_subscriptions_table.py` should be checked to confirm the unique constraint creates an index.~~

2. ✅ [FIXED] ~~**No index on `questionnaires.user_id`**: The questionnaire is queried by `user_id` in multiple places (`questionnaires.py:27, 68`, `ai_tasks.py:30`). The model declares `ForeignKey("users.id")` but there's no explicit index in the migration.~~

3. ✅ [FIXED] ~~**No index on `deliverables.submitted_by`**: The RLS policy for deliverables (`022_enable_rls.py:112-116`) joins on `submitted_by` to check team membership. Without an index, this subquery performs a full table scan on large deliverable sets.~~

4. ✅ [FIXED] ~~**No index on `escalations.task_id`**: The SLA breach check (`automation_tasks.py:74-78`) queries `Escalation.task_id` for deduplication. No index exists for this lookup.~~

5. ✅ [FIXED] ~~**`user.deleted_at` not indexed**: Queries filtering `User.deleted_at.is_(None)` (admin_clients, admin_dashboard, sales) cannot use an index. With many users, these queries will scan the full table. A partial index `WHERE deleted_at IS NOT NULL` would be efficient since most users are not deleted.~~

---

## Domain 11 & 12 Combined Summary

| Category | Pass | Fail/Missing |
|---|---|---|
| D11 Phase 1: JWT & Roles | 6 | 4 |
| D11 Phase 2: Integration | 5 | 4 |
| D11 Phase 3: Soft Deletes | 6 | 6 |
| D11 Phase 4: AppSec | 5 | 6 |
| D11 Phase 5: Indexes | 7 | 5 |
| **Domain 11 Total** | **29** | **25** |

---

# Domain 12 Audit — Database Integrity, RLS & Storage

## Phase 1: Feature & Happy Path (RLS Policies)

### ✅ PASS

1. **RLS enabled on 11 tables** (`022_enable_rls.py:32-44`): `users`, `questionnaires`, `deliverables`, `tickets`, `ticket_messages`, `notifications`, `tasks`, `announcements`, `content_calendar`, `escalations`, `leave_requests`.

2. **`get_user_role()` helper function** (`022_enable_rls.py:17-26`): SECURITY DEFINER function that queries `public.users.role` by `auth.uid()`. This avoids recursive RLS checks when policies need to know the user's role.

3. **`users` table: own-or-admin SELECT/UPDATE** (`022_enable_rls.py:47-71`): Users can read/update their own row. Admins can read/update any row. No INSERT or DELETE policies — user creation is server-side only.

4. **`deliverables` table: client-own-or-team-or-admin SELECT** (`022_enable_rls.py:105-144`): Clients see only their own deliverables. Team members see deliverables they submitted. Admins see all. UPDATE follows the same pattern.

5. **`notifications` table: own-only SELECT/UPDATE** (`022_enable_rls.py:189-210`): Users can only see and update their own notifications. Strong isolation.

6. **`tasks` table: assigned-or-admin SELECT** (`022_enable_rls.py:212-227`): Team members see only tasks assigned to them. Leads and admins see all. Correct scoping.

7. **`leave_requests` table: own-or-department-lead SELECT** (`022_enable_rls.py:263-290`): Team members see their own requests. Team leads see requests from their department. Admins see all. This is a sophisticated department-scoped policy.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**`subscriptions` table has NO RLS**: The `subscriptions` table is not in `ENABLE_RLS_TABLES` and has no policies. Any authenticated user with the Supabase anon key could potentially query all subscriptions via the Supabase REST API. **All subscription data (amounts, status, gateway IDs) is exposed.**~~

2. ✅ [FIXED] ~~**`addons` table has NO RLS**: The `addons` table has no RLS policies. Addon purchase history for all clients is accessible to any authenticated user.~~

3. ✅ [FIXED] ~~**`plans` table has NO RLS**: The `plans` table has no RLS. This is acceptable since plan data is public, but it should be explicitly noted.~~

4. ✅ [FIXED] ~~**`team_members` table has NO RLS**: Team member data (daily caps, department, active status) is accessible to any authenticated user.~~

5. ✅ [FIXED] ~~**`client_assignments` table has NO RLS**: Client-team assignment mappings are accessible to any authenticated user.~~

6. ✅ [FIXED] ~~**`content_plans` table has NO RLS**: Content plans are accessible to any authenticated user.~~

7. ✅ [FIXED] ~~**`deliverable_comments` table has NO RLS**: Deliverable comments (including rejection reasons) are accessible to any authenticated user.~~

8. ✅ [FIXED] ~~**`platform_settings` table has NO RLS**: Platform configuration settings are accessible to any authenticated user.~~

9. ✅ [FIXED] ~~**No INSERT policies on most tables**: Only `ticket_messages` has an INSERT policy. All other tables rely on server-side inserts via FastAPI (which uses the service role key, bypassing RLS). This is acceptable if the FastAPI backend is the only write path, but it means RLS provides no defense-in-depth against direct DB access.~~

10. ✅ [FIXED] ~~**No DELETE policies on any table**: No table has a DELETE policy. This means even admins cannot delete rows via the Supabase client. Deletions must go through FastAPI. This is intentional (soft deletes) but should be documented.~~

---

## Phase 2: Integration & File Storage

### ✅ PASS

1. **Signed download URLs with expiry** (`storage.py:18-29`): `generate_signed_download_url` creates time-limited signed URLs (default 1 hour). The underlying file path is never exposed to the client.

2. **Storage uses service role** (`storage.py:11-13`): The Supabase client for storage operations uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. This is correct for server-side file operations.

3. **Deliverable download requires approval** (`deliverables.py:92-96`): `if deliverable.status != DeliverableStatus.approved` — only approved deliverables can be downloaded. Pending or rejected deliverables cannot be accessed.

4. **Deliverable download scoped to owner** (`deliverables.py:79-82`): `Deliverable.client_id == current_user.id` — clients can only download their own deliverables.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No server-side file upload validation**: The AGENTS.md states "File uploads go directly to Supabase Storage — never through FastAPI." This means the frontend uploads files directly using the Supabase JS client. There is **no server-side validation** of:
   - File type (MIME type whitelist)
   - File size limits
   - File naming conventions
   - Bucket permissions (if the bucket is misconfigured, anyone could upload)~~

2. ✅ [FIXED] ~~**No storage bucket RLS policies defined in migrations**: The `022_enable_rls.py` migration only enables RLS on database tables, not on Supabase Storage buckets. Storage bucket policies (which control who can upload/download files) must be configured separately in the Supabase dashboard. These are not version-controlled.~~

3. ✅ [FIXED] ~~**`generate_signed_download_url` returns raw URL** (`storage.py:25`): `result.get("signedURL") or result.get("signed_url")` — the code handles both camelCase and snake_case response formats. This is defensive but suggests the Supabase Python SDK response format is inconsistent.~~

4. ✅ [FIXED] ~~**No file cleanup on client deletion**: When a client is soft-deleted (`deleted_at` set), their deliverable files remain in Supabase Storage indefinitely. There is no mechanism to archive or delete storage files for deleted clients.~~

---

## Phase 3: Edge Cases & Soft Deletes

### ✅ PASS

1. **`deleted_at` column exists on `users`** (`user.py:58-60`): Properly typed as `DateTime(timezone=True)`, nullable. Set to `None` for active users.

2. **Admin team management uses soft-delete** (`admin_team.py:197`): `user.deleted_at = datetime.now(timezone.utc)` — team members are soft-deleted, not hard-deleted.

3. **Auth layer rejects soft-deleted users** (`security.py:65-66`): Primary defense at the authentication layer.

4. **Multiple admin endpoints filter `deleted_at`**: `admin_clients.py`, `admin_dashboard.py`, `admin_kpi.py`, `sales.py`, `admin_team.py` all filter `User.deleted_at.is_(None)`.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No global soft-delete filter**: Each SQLAlchemy query must manually include `User.deleted_at.is_(None)`. There is no `default_scope`, event listener, or custom query class to enforce this automatically. **Any new endpoint that queries `users` without the filter will expose deleted users.**~~

2. ✅ [FIXED] ~~**No `deleted_at` on non-user tables**: Only the `users` table has soft-delete. `subscriptions`, `tasks`, `deliverables`, `tickets`, `addons`, etc. cannot be soft-deleted. If a subscription needs to be "removed," it can only be cancelled (status change), not deleted.~~

3. ✅ [FIXED] ~~**`portal_dashboard.py` relies on auth layer for soft-delete**: The portal dashboard queries by `current_user.id` without an explicit `deleted_at` filter. This is safe because `get_current_user` already rejects deleted users, but it's fragile.~~

4. ✅ [FIXED] ~~**Automation tasks don't filter soft-deleted clients**: `check_sla_breaches`, `auto_assign_tasks`, `check_quota_exhaustion`, `generate_content_calendar` all query `Subscription`, `Task`, and `User` tables without filtering `User.deleted_at.is_(None)`. **Deleted clients' tasks and subscriptions are processed by automation workers.**~~

5. ✅ [FIXED] ~~**Webhook handlers don't filter soft-deleted users**: `_activate_user_account` and `_mark_subscription_past_due` in `webhooks.py` don't check if the user is soft-deleted before modifying their subscription. A deleted user's subscription could be re-activated by a webhook.~~

---

## Phase 4: AppSec & Encryption

### ✅ PASS

1. **Instagram token encrypted with Fernet** (`account.py:61`, `deliverables.py:294`): Symmetric encryption using `cryptography.fernet.Fernet`. Key from `ENCRYPTION_KEY` env var. Token encrypted before storage, decrypted only at point-of-use.

2. **`SUPABASE_SERVICE_ROLE_KEY` never exposed**: Only used in `services/storage.py` for server-side operations. Never included in API responses or frontend bundles.

3. **`SUPABASE_URL` and `SUPABASE_ANON_KEY` are frontend-safe**: These are used in the Next.js middleware (`middleware.ts:49-50`) via `NEXT_PUBLIC_` env vars, which is correct — the anon key is designed to be public.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**Instagram token column is `Text`, not `LargeBinary`** (`user.py:53`): `instagram_access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)`. Fernet encryption outputs base64-encoded bytes, which are decoded to a string for storage. This works but means the encrypted token is stored as a plain text string. If someone reads the DB directly, they see a base64 string — not obviously encrypted. Using `LargeBinary` would make it clearer that the column contains encrypted data.~~

2. ✅ [FIXED] ~~**No encryption on `razorpay_customer_id`** (`user.py:55`): Stored as plain `Text`. These are payment gateway identifiers that could be used for cross-service correlation.~~

3. ✅ [FIXED] ~~**No encryption on `stripe_customer_id`** (`user.py:56`): Same issue as above.~~

4. ✅ [FIXED] ~~**No encryption on `phone`** (`user.py:39`): Phone numbers are PII stored in plain text. Under GDPR/DPDPA, phone numbers should be encrypted at rest or hashed if only used for verification.~~

5. ✅ [FIXED] ~~**No encryption on `email`** (`user.py:38`): Email addresses are stored in plain text. While emails are used for lookups (preventing hashing), they should be encrypted at rest for PII compliance.~~

6. ✅ [FIXED] ~~**`user.full_name` unsanitized in email HTML** (`automation_tasks.py:158, 286`): User-supplied `full_name` is interpolated into HTML via f-strings without escaping. HTML injection vector in emails sent to admins and clients.~~

---

## Phase 5: Performance & Indexes

### ✅ PASS

1. **All critical single-column indexes exist**:
   - `users.auth_id` — unique, from table creation
   - `users.email` — unique, from table creation + `ix_users_email`
   - `users.role` — `ix_users_role`
   - `tasks.client_id` — `ix_tasks_client_id`
   - `tasks.assigned_to` — `ix_tasks_assigned_to`
   - `tasks.status` — `ix_tasks_status`
   - `tasks.due_date` — `ix_tasks_due_date`
   - `tasks.calendar_entry_id` — `ix_tasks_calendar_entry_id`

2. **All critical composite indexes exist** (`021_create_indexes.py`):
   - `tasks(assigned_to, status)` — auto-assign worker
   - `tasks(client_id, status)` — portal task list
   - `deliverables(client_id, status)` — portal deliverable list
   - `subscriptions(user_id, status)` — payment lookups
   - `notifications(user_id, is_read)` — notification badge
   - `tickets(user_id, status)` — support tickets
   - `content_calendar(client_id, scheduled_date)` — calendar queries
   - `escalations(status, created_at)` — admin escalation list
   - `addons(user_id, status)` — addon queries
   - `leave_requests(team_member_id, status)` — leave management

3. **Updated-at trigger on all tables** (`023_create_updated_at_trigger.py`): The `update_updated_at_column()` trigger is applied to all tables, ensuring `updated_at` is always current.

### 🚨 FAIL / MISSING

1. ✅ [FIXED] ~~**No index on `subscriptions.gateway_subscription_id`**: Used in Stripe webhook lookups. The model has `unique=True` which should create an implicit index, but this should be verified in the subscriptions migration.~~

2. ✅ [FIXED] ~~**No index on `questionnaires.user_id`**: Queried by `user_id` in questionnaire submission, status check, and AI analysis tasks. Should have an explicit index.~~

3. ✅ [FIXED] ~~**No index on `deliverables.submitted_by`**: Used in RLS policy joins for team member access. Without an index, the RLS subquery performs a full table scan.~~

4. ✅ [FIXED] ~~**No index on `escalations.task_id`**: Used in SLA breach deduplication checks. Should be indexed.~~

5. ✅ [FIXED] ~~**No index on `user.deleted_at`**: All soft-delete filters (`User.deleted_at.is_(None)`) cannot use an index. A partial index `CREATE INDEX ix_users_not_deleted ON users (id) WHERE deleted_at IS NULL` would be highly efficient since most users are not deleted.~~

6. ✅ [FIXED] ~~**No index on `notifications.user_id` alone**: Only the composite `ix_notifications_user_id_is_read` exists. Queries that filter by `user_id` only (without `is_read`) cannot use this composite index efficiently unless the query also filters by `is_read`.~~

7. ✅ [FIXED] ~~**No index on `content_plans.client_id`**: Content plans are queried by client but have no explicit index in the migrations.~~

---

## Domain 12 Summary

| Category | Pass | Fail/Missing |
|---|---|---|
| Phase 1: RLS Policies | 7 | 10 |
| Phase 2: File Storage | 4 | 4 |
| Phase 3: Soft Deletes | 4 | 5 |
| Phase 4: AppSec | 3 | 6 |
| Phase 5: Indexes | 3 | 7 |
| **Domain 12 Total** | **21** | **32** |

---

## Domains 11 & 12 Combined Top 5 Critical Issues (Fix First)

1. ✅ [FIXED] ~~**8 tables missing RLS entirely** — `subscriptions`, `addons`, `team_members`, `client_assignments`, `content_plans`, `deliverable_comments`, `addon_pricing`, `platform_settings` have no RLS policies. Any authenticated user with the Supabase anon key can query all data in these tables via the Supabase REST API.~~
2. ✅ [FIXED] ~~**No role-based session timeout enforcement** — PRD specifies Client 30d / Internal 8h / Admin 4h, but the code relies on Supabase's default JWT expiry. No custom timeout logic exists.~~
3. ✅ [FIXED] ~~**No global soft-delete filter on `User` model** — Every query must manually include `User.deleted_at.is_(None)`. Automation tasks and several KPI queries miss this filter, processing deleted clients' data.~~
4. ✅ [FIXED] ~~**No auth trigger to sync `auth.users` → `public.users`** — If the FastAPI registration endpoint fails after Supabase Auth succeeds, zombie accounts are created that can authenticate but cannot use the app.~~
5. ✅ [FIXED] ~~**No server-side file upload validation** — Files are uploaded directly to Supabase Storage from the frontend with no server-side MIME type, size, or naming validation. Storage bucket policies are not version-controlled.~~

