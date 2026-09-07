-- ============================================================================
-- CREO DIGITAL MARKETING & OPERATIONS PLATFORM - POSTGRESQL SCHEMA
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. CUSTOM ENUMS
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

-- 3. TRIGGER FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CORE AUTH & USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role user_role DEFAULT 'client' NOT NULL,
    account_status account_status DEFAULT 'pending_verification' NOT NULL,
    token_version INT DEFAULT 0 NOT NULL,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- 5. CLIENT PROFILES & BRAND DNA
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT,
    instagram_username VARCHAR(255),
    brand_dna JSONB DEFAULT '{}'::jsonb NOT NULL,
    brand_summary TEXT,
    onboarding_stage INT DEFAULT 1 NOT NULL,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE TRIGGER trg_client_profiles_updated_at
    BEFORE UPDATE ON client_profiles
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- 6. SUBSCRIPTION PLANS & RETAINERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    price_minor BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    monthly_price NUMERIC(10, 2) NOT NULL,
    poster_quota INT DEFAULT 8 NOT NULL,
    reel_quota INT DEFAULT 4 NOT NULL,
    story_quota INT DEFAULT 10 NOT NULL,
    revision_rounds INT DEFAULT 2 NOT NULL,
    has_dedicated_manager BOOLEAN DEFAULT false NOT NULL,
    highlights JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_recommended BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    plan_id VARCHAR(64) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status subscription_status DEFAULT 'trialing' NOT NULL,
    provider payment_provider DEFAULT 'razorpay' NOT NULL,
    provider_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- 7. TEAM MEMBERS & STAFF CAPACITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(64) NOT NULL,
    daily_capacity INT DEFAULT 4 NOT NULL,
    active_load INT DEFAULT 0 NOT NULL,
    skills JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_accepting_tasks BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_members_lead ON team_members(team_lead_id);

-- ============================================================================
-- 8. TASKS & KANBAN PIPELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    format deliverable_type DEFAULT 'reel' NOT NULL,
    status task_status DEFAULT 'backlog' NOT NULL,
    priority VARCHAR(32) DEFAULT 'medium' NOT NULL,
    sla_due_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);

-- ============================================================================
-- 9. DELIVERABLES & APPROVALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type deliverable_type DEFAULT 'reel' NOT NULL,
    status deliverable_status DEFAULT 'draft' NOT NULL,
    file_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    hashtags JSONB DEFAULT '[]'::jsonb,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    approval_token VARCHAR(255),
    revision_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);

-- ============================================================================
-- 10. CONTENT CALENDAR ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    scheduled_time TIME,
    platform VARCHAR(64) DEFAULT 'instagram' NOT NULL,
    status VARCHAR(64) DEFAULT 'scheduled' NOT NULL,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON calendar_entries(client_id, entry_date);

-- ============================================================================
-- 11. SUPPORT TICKETS & CLIENT CONCIERGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    status ticket_status DEFAULT 'open' NOT NULL,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sla_breach_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 12. LEAVE REQUESTS & STAFF TIME-OFF
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 13. ANNOUNCEMENTS & SYSTEM BULLETINS
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role user_role,
    is_broadcast BOOLEAN DEFAULT true NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
