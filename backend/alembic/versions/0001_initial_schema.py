"""0001_initial_schema

Handwritten initial migration creating:
- Extensions: pgcrypto, citext, pg_trgm, btree_gist
- All custom PostgreSQL Enums
- touch_updated_at() trigger function and triggers on tables with updated_at
- All core tables with exact foreign keys and check constraints
- Partial indexes for active subscriptions, deliverable uniqueness, and unread notifications
- Full reversible downgrade

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-05 19:30:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. PostgreSQL Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Custom PostgreSQL Enum Types (DO $$ blocks are single statements)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM (
                    'super_admin', 'admin', 'sales', 'team_lead',
                    'editor', 'designer', 'client', 'investor_relations'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                CREATE TYPE account_status AS ENUM (
                    'pending_verification', 'active', 'lapsed', 'suspended', 'cancelled'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
                CREATE TYPE subscription_status AS ENUM (
                    'trialing', 'active', 'past_due', 'canceled', 'incomplete'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_type') THEN
                CREATE TYPE deliverable_type AS ENUM (
                    'reel', 'carousel', 'story', 'static_post', 'shoot_day'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_status') THEN
                CREATE TYPE deliverable_status AS ENUM (
                    'draft', 'in_production', 'pending_qa', 'qa_rejected',
                    'pending_approval', 'revision_requested', 'approved',
                    'scheduled', 'publishing', 'published', 'publish_failed', 'archived'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
                CREATE TYPE task_status AS ENUM (
                    'backlog', 'in_production', 'internal_qa',
                    'client_review', 'ready_to_publish', 'completed'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
                CREATE TYPE ticket_status AS ENUM (
                    'open', 'in_progress', 'waiting_on_client', 'resolved', 'escalated'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
                CREATE TYPE ticket_priority AS ENUM (
                    'low', 'medium', 'high', 'urgent'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
                CREATE TYPE payment_provider AS ENUM (
                    'razorpay', 'stripe', 'manual'
                );
            END IF;
        END $$;
    """)

    # 3. Touch Updated At Trigger Function
    op.execute("""
        CREATE OR REPLACE FUNCTION touch_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 4. Tables & Triggers (one statement per op.execute for asyncpg compatibility)
    # 4.1 users
    op.execute("""
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
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);")
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.2 client_profiles
    op.execute("""
        CREATE TABLE IF NOT EXISTS client_profiles (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            company_name TEXT,
            instagram_username VARCHAR(255),
            instagram_user_id VARCHAR(255),
            ig_token_encrypted BYTEA,
            ig_token_expires_at TIMESTAMPTZ,
            brand_summary TEXT,
            brand_dna JSONB DEFAULT '{}'::jsonb NOT NULL,
            terms_accepted_at TIMESTAMPTZ,
            terms_version VARCHAR(50),
            onboarding_completed_at TIMESTAMPTZ,
            onboarding_deadline TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_client_profiles_updated_at
            BEFORE UPDATE ON client_profiles
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.3 staff_profiles
    op.execute("""
        CREATE TABLE IF NOT EXISTS staff_profiles (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
            department VARCHAR(50) DEFAULT 'creative' NOT NULL,
            daily_capacity INT DEFAULT 4 NOT NULL,
            skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
            is_accepting_work BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_staff_profiles_updated_at
            BEFORE UPDATE ON staff_profiles
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.4 plans
    op.execute("""
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
            highlights JSONB DEFAULT '[]'::jsonb NOT NULL,
            is_recommended BOOLEAN DEFAULT false NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL
        );
    """)

    # 4.5 subscriptions
    op.execute("""
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
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_active_per_client
            ON subscriptions(client_id)
            WHERE status IN ('trialing', 'active');
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);")

    # 4.6 payment_events
    op.execute("""
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
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed
            ON payment_events(received_at)
            WHERE processed_at IS NULL;
    """)

    # 4.7 usage_counters
    op.execute("""
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
    """)
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_usage_counters_updated_at
            BEFORE UPDATE ON usage_counters
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.8 tasks
    op.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            assigned_to UUID REFERENCES users(id),
            deliverable_type deliverable_type NOT NULL,
            status task_status DEFAULT 'backlog' NOT NULL,
            due_date DATE,
            sla_due_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);")
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_tasks_updated_at
            BEFORE UPDATE ON tasks
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.9 deliverables
    op.execute("""
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
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_deliv_creation
            ON deliverables(ig_creation_id)
            WHERE ig_creation_id IS NOT NULL;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_deliv_due ON deliverables(status, scheduled_at);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_deliv_client ON deliverables(client_id);")
    op.execute("""
        CREATE OR REPLACE TRIGGER trg_deliverables_updated_at
            BEFORE UPDATE ON deliverables
            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    """)

    # 4.10 content_calendar
    op.execute("""
        CREATE TABLE IF NOT EXISTS content_calendar (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
            publish_date DATE NOT NULL,
            scheduled_time TIMESTAMPTZ,
            caption TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_calendar_client ON content_calendar(client_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_calendar_date ON content_calendar(publish_date);")

    # 4.11 client_assignments
    op.execute("""
        CREATE TABLE IF NOT EXISTS client_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            role VARCHAR(50) NOT NULL,
            is_primary BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_one_primary_am
            ON client_assignments(client_id)
            WHERE role = 'account_manager' AND is_primary = true;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_assignments_user ON client_assignments(user_id);")

    # 4.12 tickets & ticket_messages
    op.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            assigned_to UUID REFERENCES users(id),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            status ticket_status DEFAULT 'open' NOT NULL,
            priority ticket_priority DEFAULT 'medium' NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);")

    op.execute("""
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
            sender_id UUID REFERENCES users(id) NOT NULL,
            message TEXT NOT NULL,
            attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);"
    )

    # 4.13 leave_requests
    op.execute("""
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
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id);")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);"
    )

    # 4.14 announcements
    op.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            author_id UUID REFERENCES users(id) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'broadcast' NOT NULL,
            target_departments JSONB DEFAULT '[]'::jsonb NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)

    # 4.15 audit_log
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id BIGSERIAL PRIMARY KEY,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            actor_role user_role,
            entity VARCHAR(100) NOT NULL,
            entity_id UUID NOT NULL,
            action VARCHAR(100) NOT NULL,
            from_value JSONB,
            to_value JSONB,
            request_id VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_entity "
        "ON audit_log(entity, entity_id, created_at DESC);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at DESC);"
    )

    # 4.16 notifications
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false NOT NULL,
            sent_at TIMESTAMPTZ,
            failed_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_notif_unread
            ON notifications(user_id)
            WHERE is_read = false;
    """)

    # 4.17 refresh_tokens
    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            family_id UUID NOT NULL,
            used_at TIMESTAMPTZ,
            revoked_at TIMESTAMPTZ,
            user_agent TEXT,
            ip VARCHAR(45),
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens(family_id);")

    # 4.18 idempotency_keys
    op.execute("""
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            key VARCHAR(255) PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            endpoint VARCHAR(255) NOT NULL,
            request_hash VARCHAR(64) NOT NULL,
            status_code INT,
            response JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);"
    )

    # 4.19 questionnaires
    op.execute("""
        CREATE TABLE IF NOT EXISTS questionnaires (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            answers JSONB DEFAULT '{}'::jsonb NOT NULL,
            ai_summary_line TEXT,
            submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_questionnaires_user ON questionnaires(user_id);")


def downgrade() -> None:
    # Drop all tables in reverse dependency order
    op.execute("DROP TABLE IF EXISTS questionnaires CASCADE;")
    op.execute("DROP TABLE IF EXISTS idempotency_keys CASCADE;")
    op.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE;")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE;")
    op.execute("DROP TABLE IF EXISTS audit_log CASCADE;")
    op.execute("DROP TABLE IF EXISTS announcements CASCADE;")
    op.execute("DROP TABLE IF EXISTS leave_requests CASCADE;")
    op.execute("DROP TABLE IF EXISTS ticket_messages CASCADE;")
    op.execute("DROP TABLE IF EXISTS tickets CASCADE;")
    op.execute("DROP TABLE IF EXISTS client_assignments CASCADE;")
    op.execute("DROP TABLE IF EXISTS content_calendar CASCADE;")
    op.execute("DROP TABLE IF EXISTS deliverables CASCADE;")
    op.execute("DROP TABLE IF EXISTS tasks CASCADE;")
    op.execute("DROP TABLE IF EXISTS usage_counters CASCADE;")
    op.execute("DROP TABLE IF EXISTS payment_events CASCADE;")
    op.execute("DROP TABLE IF EXISTS subscriptions CASCADE;")
    op.execute("DROP TABLE IF EXISTS plans CASCADE;")
    op.execute("DROP TABLE IF EXISTS staff_profiles CASCADE;")
    op.execute("DROP TABLE IF EXISTS client_profiles CASCADE;")
    op.execute("DROP TABLE IF EXISTS users CASCADE;")

    # Drop trigger function
    op.execute("DROP FUNCTION IF EXISTS touch_updated_at CASCADE;")

    # Drop custom enums
    op.execute("DROP TYPE IF EXISTS payment_provider CASCADE;")
    op.execute("DROP TYPE IF EXISTS ticket_priority CASCADE;")
    op.execute("DROP TYPE IF EXISTS ticket_status CASCADE;")
    op.execute("DROP TYPE IF EXISTS task_status CASCADE;")
    op.execute("DROP TYPE IF EXISTS deliverable_status CASCADE;")
    op.execute("DROP TYPE IF EXISTS deliverable_type CASCADE;")
    op.execute("DROP TYPE IF EXISTS subscription_status CASCADE;")
    op.execute("DROP TYPE IF EXISTS account_status CASCADE;")
    op.execute("DROP TYPE IF EXISTS user_role CASCADE;")
