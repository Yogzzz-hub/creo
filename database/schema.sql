-- =============================================================================
-- CREO PLATFORM — POSTGRESQL PRODUCTION SCHEMA
-- =============================================================================
-- Database: PostgreSQL 15+ / 16+ / 17+ (Supabase compatible)
-- Description: Complete schema definition including extensions, custom ENUMs,
--              tables, foreign keys, triggers, views, and performance indexes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- -----------------------------------------------------------------------------
-- 2. CUSTOM ENUM TYPES
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'super_admin', 'admin', 'sales', 'team_lead',
            'editor', 'designer', 'client', 'investor_relations'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM (
            'pending_verification', 'active', 'lapsed', 'suspended', 'cancelled'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM (
            'trialing', 'active', 'past_due', 'canceled', 'incomplete'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_type') THEN
        CREATE TYPE deliverable_type AS ENUM (
            'reel', 'carousel', 'story', 'static_post', 'shoot_day'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_status') THEN
        CREATE TYPE deliverable_status AS ENUM (
            'draft', 'in_production', 'pending_qa', 'qa_rejected',
            'pending_approval', 'revision_requested', 'approved',
            'scheduled', 'publishing', 'published', 'publish_failed', 'archived'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM (
            'backlog', 'in_production', 'internal_qa',
            'client_review', 'ready_to_publish', 'completed'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM (
            'open', 'in_progress', 'waiting_on_client', 'resolved', 'escalated'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM (
            'low', 'medium', 'high', 'urgent'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
        CREATE TYPE payment_provider AS ENUM (
            'razorpay', 'stripe', 'manual'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. CORE TABLES
-- -----------------------------------------------------------------------------

-- 4.1 USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255),
    role user_role DEFAULT 'client' NOT NULL,
    account_status account_status DEFAULT 'pending_verification' NOT NULL,
    token_version INT DEFAULT 0 NOT NULL,
    email_verified_at TIMESTAMPTZ,
    must_reset_password BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.2 CLIENT PROFILES
CREATE TABLE IF NOT EXISTS client_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT,
    instagram_username VARCHAR(255),
    instagram_user_id VARCHAR(255),
    ig_token_encrypted BYTEA,
    ig_token_expires_at TIMESTAMPTZ,
    brand_summary TEXT,
    brand_dna JSONB DEFAULT '{}'::jsonb NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
    calendar_template JSONB DEFAULT NULL,
    terms_accepted_at TIMESTAMPTZ,
    terms_version VARCHAR(50),
    onboarding_completed_at TIMESTAMPTZ,
    onboarding_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS trg_client_profiles_updated_at ON client_profiles;
CREATE TRIGGER trg_client_profiles_updated_at
    BEFORE UPDATE ON client_profiles
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.3 STAFF PROFILES
CREATE TABLE IF NOT EXISTS staff_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(50) DEFAULT 'creative' NOT NULL,
    daily_capacity INT DEFAULT 4 NOT NULL,
    daily_points INT DEFAULT 8 NOT NULL,
    last_assigned_at TIMESTAMPTZ,
    skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
    sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
    is_accepting_work BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
    BEFORE UPDATE ON staff_profiles
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.4 PLANS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    price_minor BIGINT DEFAULT 0 NOT NULL,
    currency CHAR(3) DEFAULT 'INR' NOT NULL,
    monthly_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    poster_quota INT DEFAULT 8 NOT NULL,
    reel_quota INT DEFAULT 4 NOT NULL,
    story_quota INT DEFAULT 10 NOT NULL,
    revision_rounds INT DEFAULT 1 NOT NULL,
    has_dedicated_manager BOOLEAN DEFAULT false NOT NULL,
    scarcity_slots INT DEFAULT NULL,
    highlights JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_recommended BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- 4.5 SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES plans(id) NOT NULL,
    status subscription_status DEFAULT 'incomplete' NOT NULL,
    gateway payment_provider NOT NULL,
    gateway_subscription_id VARCHAR(255),
    gateway_customer_id VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_active_per_client
    ON subscriptions(client_id)
    WHERE status IN ('trialing', 'active');

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- 4.6 PAYMENT EVENTS
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider payment_provider NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature_valid BOOLEAN DEFAULT true NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_payment_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed
    ON payment_events(received_at)
    WHERE processed_at IS NULL;

-- 4.7 USAGE COUNTERS
CREATE TABLE IF NOT EXISTS usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    kind deliverable_type NOT NULL,
    quota INT NOT NULL,
    used INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_usage UNIQUE (client_id, period_start, kind),
    CONSTRAINT ck_usage_bounds CHECK (used >= 0 AND used <= quota)
);

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
    BEFORE UPDATE ON usage_counters
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.8 TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES users(id),
    deliverable_type deliverable_type NOT NULL,
    status task_status DEFAULT 'backlog' NOT NULL,
    due_date DATE,
    sla_due_at TIMESTAMPTZ,
    last_sla_notified_at TIMESTAMPTZ DEFAULT NULL,
    effort_points INT DEFAULT 1 NOT NULL,
    is_revision BOOLEAN DEFAULT false NOT NULL,
    parent_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    preferred_sub_skill VARCHAR(50),
    concept_status VARCHAR(30) DEFAULT 'approved' NOT NULL,
    blueprint JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON tasks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_sla ON tasks(status, sla_due_at)
    WHERE status NOT IN ('ready_to_publish', 'completed');
CREATE INDEX IF NOT EXISTS idx_tasks_window ON tasks(assigned_to, due_date)
    WHERE status IN ('in_production', 'internal_qa');

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.9 DELIVERABLES
CREATE TABLE IF NOT EXISTS deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_id UUID NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id),
    submitted_by UUID REFERENCES users(id),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0 NOT NULL,
    status deliverable_status DEFAULT 'pending_approval' NOT NULL,
    revision_round INT DEFAULT 1 NOT NULL,
    revisions_count INT DEFAULT 0 NOT NULL,
    parent_deliverable_id UUID REFERENCES deliverables(id),
    rejection_comment TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    ig_creation_id VARCHAR(255),
    ig_media_id VARCHAR(255),
    ig_permalink TEXT,
    publish_attempts INT DEFAULT 0 NOT NULL,
    publish_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deliv_root_version UNIQUE (root_id, version),
    CONSTRAINT ck_deliv_scheduled_has_time
        CHECK (status != 'scheduled' OR scheduled_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deliv_creation
    ON deliverables(ig_creation_id)
    WHERE ig_creation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliv_due ON deliverables(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_deliv_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_approved_turnaround
    ON deliverables(status, approved_at, created_at)
    WHERE status IN ('approved', 'published') AND approved_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_deliverables_updated_at ON deliverables;
CREATE TRIGGER trg_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4.10 CONTENT CALENDAR
CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
    publish_date DATE NOT NULL,
    scheduled_time TIMESTAMPTZ,
    caption TEXT,
    status VARCHAR(20) DEFAULT 'approved' NOT NULL,
    is_locked BOOLEAN DEFAULT false NOT NULL,
    slot_kind VARCHAR(50),
    slot_strategy VARCHAR(20) DEFAULT 'anchor' NOT NULL CHECK (slot_strategy IN ('anchor', 'flex', 'swapped')),
    flex_deadline DATE,
    concept_status VARCHAR(30) DEFAULT 'approved' NOT NULL,
    blueprint JSONB DEFAULT NULL,
    selected_hook JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_client ON content_calendar(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON content_calendar(publish_date);

-- 4.11 CLIENT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_primary_am
    ON client_assignments(client_id)
    WHERE role = 'account_manager' AND is_primary = true;

CREATE INDEX IF NOT EXISTS idx_assignments_user ON client_assignments(user_id);

-- 4.12 TICKETS & TICKET MESSAGES
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES users(id),
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'open' NOT NULL,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- 4.13 LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);

-- 4.14 ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'broadcast' NOT NULL,
    target_departments JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4.15 AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role user_role,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);

-- 4.16 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, created_at DESC)
    WHERE is_read = false;

-- 4.17 REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_lookup
    ON refresh_tokens(token_hash)
    WHERE revoked = false;

-- 4.18 IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    response_code INT,
    response_body JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- 4.19 QUESTIONNAIRES
CREATE TABLE IF NOT EXISTS questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    responses JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_user ON questionnaires(user_id);

-- -----------------------------------------------------------------------------
-- 5. VIEWS & MATERIALIZED VIEWS
-- -----------------------------------------------------------------------------

-- 5.1 ONBOARDING STAGE DERIVATION VIEW
CREATE OR REPLACE VIEW v_client_onboarding AS
SELECT
    u.id AS client_id,
    CASE
        WHEN cp.onboarding_completed_at IS NOT NULL THEN 5
        WHEN q.id IS NOT NULL                      THEN 4
        WHEN s.id IS NOT NULL                      THEN 3
        WHEN cp.terms_accepted_at IS NOT NULL      THEN 2
        WHEN (
            u.email_verified_at IS NOT NULL
            OR u.account_status != 'pending_verification'
        ) THEN 1
        ELSE 0
    END AS stage
FROM users u
LEFT JOIN client_profiles cp ON cp.user_id = u.id
LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
LEFT JOIN questionnaires q ON q.user_id = u.id
WHERE u.role = 'client';

-- 5.2 EXECUTIVE KPI MATERIALIZED VIEW
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_exec_kpis AS
WITH sub_stats AS (
    SELECT
        COALESCE(
            SUM(p.price_minor) FILTER (WHERE s.status IN ('trialing', 'active')),
            0
        )::BIGINT AS mrr_minor,
        COUNT(DISTINCT s.client_id) FILTER (
            WHERE s.status IN ('trialing', 'active')
        )::INT AS active_clients,
        COUNT(DISTINCT s.client_id) FILTER (
            WHERE s.status = 'canceled' AND s.current_period_end >= NOW() - INTERVAL '30 days'
        )::INT AS churned_last_30d
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
),
deliv_stats AS (
    SELECT
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (d.approved_at - d.created_at)) / 3600.0)
            FILTER (WHERE d.status IN ('approved', 'published') AND d.approved_at IS NOT NULL),
            0.0
        )::FLOAT AS avg_turnaround_hours
    FROM deliverables d
)
SELECT
    NOW() AS refreshed_at,
    COALESCE(sub_stats.mrr_minor, 0)::BIGINT AS mrr_minor,
    COALESCE(sub_stats.active_clients, 0)::INT AS active_clients,
    COALESCE(sub_stats.churned_last_30d, 0)::INT AS churned_last_30d,
    COALESCE(deliv_stats.avg_turnaround_hours, 0.0)::FLOAT AS avg_turnaround_hours
FROM sub_stats
CROSS JOIN deliv_stats;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_exec_kpis_snapshot ON mv_exec_kpis(refreshed_at);
