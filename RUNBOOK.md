# Creo Platform — Operations Runbook & Disaster Recovery (RUNBOOK.md)

This runbook documents operational procedures, failover protocols, data recovery workflows, and alert playbooks for the Creo content-production SaaS platform across Render, Supabase PostgreSQL, and Vercel.

---

## 1. Deployment & Rollback Protocol

### 1.1 Standard Production Deployment
1. **Frontend (Vercel)**:
   - Git push to `main` triggers automated Vercel CI/CD build (`tsc -b && vite build`).
   - Reverse proxy rewrites `/api/*` requests to the Render web service (`creo-api`).
   - Static asset chunks under `/assets/*` are stamped with content hashes and cached immutably for 1 year (`max-age=31536000, immutable`).

2. **Backend Services (Render)**:
   - `creo-api`: Web service automatically executes `alembic upgrade head` inside `startCommand` (never `buildCommand`), followed by `uvicorn` workers.
   - `creo-worker`: Background Celery workers (`publish`, `default` queues) restart gracefully on zero pending jobs.
   - `creo-beat`: Scheduler instance (enforced strictly to **1 instance** to avoid duplicate schedule events).

### 1.2 Deployment Rollback
If a defect is detected in a new release:
1. **Frontend Rollback**:
   - In the Vercel dashboard, navigate to **Deployments** → locate previous stable deployment → click **Instant Rollback**.
   - Rollback takes effect globally within seconds via edge DNS.

2. **Backend Rollback**:
   - In Render dashboard, select `creo-api` → **History** → rollback to the previous commit SHA.
   - If database migrations were introduced:
     ```bash
     # Connect to Supabase Direct DB (port 5432)
     alembic downgrade -1
     ```
   - Restart `creo-worker` and `creo-beat` to pick up the previous release SHA.

---

## 2. Webhook Replay & Idempotency Recovery

### 2.1 Webhook Invariant
All inbound webhooks (`/api/v1/webhooks/razorpay`, `/api/v1/webhooks/stripe`) verify raw request body HMAC bytes before parsing JSON. Events are stored with an `ON CONFLICT DO NOTHING` constraint on `(gateway, event_id)` in the `payment_events` table.

### 2.2 Replaying a Failed Webhook
If a network partition or transient gateway issue occurs:
1. Identify the unconsumed or failed payment event in PostgreSQL:
   ```sql
   SELECT id, gateway, event_id, event_type, processed_at, retry_count
   FROM payment_events
   WHERE processed_at IS NULL
   ORDER BY created_at DESC
   LIMIT 10;
   ```
2. Manually trigger Celery event processing:
   ```python
   from app.workers.tasks.payment import process_payment_event_task
   process_payment_event_task.delay(payment_event_id="<uuid>")
   ```
3. Replaying the identical payload from Razorpay or Stripe dashboard is 100% safe. The API returns `200 OK` with zero duplicate subscriptions or usage counter double-increments.

---

## 3. Stuck Instagram Publish Recovery

### 3.1 Architecture Review
The 3-phase publishing flow (`app/workers/tasks/publish.py`) guarantees idempotency:
- **Phase 1**: Creates media container and immediately commits `ig_creation_id` to PostgreSQL.
- **Phase 2**: Polls container transcode status until `FINISHED`.
- **Phase 3**: Publishes media, records `ig_media_id`, and transitions deliverable to `PUBLISHED`.

### 3.2 Recovery Scenarios

#### Case A: Worker Crashed During Transcoding (Kill -9 Recovery)
- The deliverable row retains `ig_creation_id`.
- The scheduler or manual retry resumes execution from Phase 2 without creating a new container.
- Exactly **one** post is published to Instagram.

#### Case B: Container Failed Transcode (`status=ERROR`)
- The worker automatically clears `deliverable.ig_creation_id = NULL` and marks status `PUBLISH_FAILED`.
- To re-dispatch after media repair:
  ```sql
  UPDATE deliverables
  SET status = 'scheduled',
      publish_error = NULL,
      scheduled_at = NOW()
  WHERE id = '<deliverable_uuid>';
  ```
  The scheduler worker will claim the deliverable via `FOR UPDATE SKIP LOCKED` and create a fresh container.

---

## 4. JWT Secret Rotation Procedure

### 4.1 Invariant
JWTs use stateless HMAC-SHA256 signatures with client-side module storage (`auth-store.ts`) and httpOnly refresh cookies (`/api/v1/auth`).

> [!WARNING]
> Because JWTs are cryptographically signed with `JWT_SECRET`, rotating `JWT_SECRET` **will instantly invalidate all active access tokens**. There is no seamless zero-logout transition when changing the symmetric key.

### 4.2 Standard Rotation Steps
1. **Schedule Maintenance Window**:
   - Inform active users that active sessions will expire and require seamless re-authentication.
2. **Update Secret in Render**:
   - Update `JWT_SECRET` environment variable across `creo-api`, `creo-worker`, and `creo-beat`.
3. **Invalidate User Sessions**:
   - Increment `token_version` on all users to flush refresh tokens:
     ```sql
     UPDATE users SET token_version = token_version + 1;
     ```
   - Flush Redis user cache:
     ```bash
     redis-cli -u $REDIS_URL FLUSHDB
     ```
4. **Client Experience**:
   - Active users whose access tokens fail validation (401) will attempt silent refresh. Because `token_version` was incremented, the refresh endpoint triggers `AuthProvider` redirect to `/onboarding` (or login) with honest notification copy: `"Your session has expired for security updates. Please sign in again."`

---

## 5. System Alerts & Immediate Remediation

### 5.1 SLA Breach Alert (`sla_breached`)
- **Condition**: Deliverable or task has passed `sla_due_at` and is not terminal.
- **Action**: Check `GET /api/v1/admin/sla` or `tasks` table. The lead editor is alerted via in-app/email. Use the Ops Kanban board (`/kanban`) to reassign task to an editor with available daily capacity.

### 5.2 Celery Publish Queue Backlog
- **Condition**: Unprocessed tasks in `publish` queue exceed 50 items.
- **First Check**: Check Instagram rate limits (`/content_publishing_limit`). If `quota_usage >= 25`, Meta restricts posts for 24 hours. The worker automatically backs off 1 hour.
- **Remediation**: Scale `creo-worker` concurrency or instances (do NOT scale `creo-beat`).

### 5.3 Database Connection Pool Exhaustion
- **Condition**: `remaining connection slots are reserved for non-replication superuser connections`.
- **First Check**: Verify that FastAPI connects to Supabase via Transaction Pooler port (`6543`) with `?pgbouncer=true` and `statement_cache_size=0`.
- **Remediation**: Alembic migrations and Celery beat batch claims must use Direct Database URL (`5432`), while HTTP endpoints utilize the pooler.

### 5.4 Redis Memory Pressure (`noeviction`)
- **Condition**: Redis memory exceeds 85% of plan allocation.
- **Check**: Run `redis-cli INFO memory`.
- **Remediation**: Never enable `allkeys-lru` (it evicts Celery queues). Flush expired rate-limiting keys and temporary OTP hashes (`otp:*`, `rl:*`).
