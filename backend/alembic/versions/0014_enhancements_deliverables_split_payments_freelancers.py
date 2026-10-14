"""Deliverable history, brand logo, split payments, and freelancer management schema.

Revision ID: 0014_enhancements
Revises: 0013_pod_call_bookings
Create Date: 2026-10-13
"""

from alembic import op

revision = "0014_enhancements"
down_revision = "0013_pod_call_bookings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update user_role enum to include 'freelancer'
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                BEGIN
                    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'freelancer';
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END;
            END IF;
        END $$;
    """)

    # 2. Add brand_logo_url to client_profiles
    op.execute("""
        ALTER TABLE client_profiles
        ADD COLUMN IF NOT EXISTS brand_logo_url text;
    """)

    # 3. Add deliverable deletion and archiving columns
    op.execute("""
        ALTER TABLE deliverables
        ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
        ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS deletion_reason text;
    """)

    # 4. Deliverable History Table
    op.execute("""
        CREATE TABLE IF NOT EXISTS deliverable_history (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
            deliverable_id uuid NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
            root_id uuid,
            version integer NOT NULL DEFAULT 1,
            action varchar(50) NOT NULL,
            actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
            actor_name varchar(255),
            actor_role varchar(50),
            reason text,
            file_url text,
            client_visible boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_deliverable_history_deliv_id ON deliverable_history (deliverable_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_deliverable_history_root_id ON deliverable_history (root_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_deliverable_history_created_at ON deliverable_history (created_at DESC);")

    # 5. Split Payment Packages Table
    op.execute("""
        CREATE TABLE IF NOT EXISTS split_payment_packages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
            client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title varchar(255) NOT NULL,
            total_amount numeric(12, 2) NOT NULL,
            currency varchar(3) NOT NULL DEFAULT 'INR',
            notes text,
            status varchar(50) NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_split_payment_packages_client_id ON split_payment_packages (client_id);")

    # 6. Payment Instalments Table
    op.execute("""
        CREATE TABLE IF NOT EXISTS payment_instalments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
            package_id uuid NOT NULL REFERENCES split_payment_packages(id) ON DELETE CASCADE,
            client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            instalment_number integer NOT NULL,
            amount numeric(12, 2) NOT NULL,
            due_date date NOT NULL,
            paid_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
            paid_at timestamptz,
            status varchar(50) NOT NULL DEFAULT 'pending',
            payment_method varchar(50),
            transaction_ref varchar(255),
            notes text,
            reminder_sent_at timestamptz,
            agency_notified_at timestamptz,
            recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_instalments_package_id ON payment_instalments (package_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_instalments_client_id ON payment_instalments (client_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_instalments_due_date ON payment_instalments (due_date);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_instalments_status ON payment_instalments (status);")

    # 7. Freelancer Profiles Table
    op.execute("""
        CREATE TABLE IF NOT EXISTS freelancer_profiles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
            specialty varchar(100) NOT NULL DEFAULT 'Video Editor',
            hourly_rate bigint,
            status varchar(50) NOT NULL DEFAULT 'active',
            skills jsonb NOT NULL DEFAULT '[]'::jsonb,
            portfolio_url text,
            notes text,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_freelancer_profiles_user_id ON freelancer_profiles (user_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS freelancer_profiles CASCADE;")
    op.execute("DROP TABLE IF EXISTS payment_instalments CASCADE;")
    op.execute("DROP TABLE IF EXISTS split_payment_packages CASCADE;")
    op.execute("DROP TABLE IF EXISTS deliverable_history CASCADE;")
    op.execute("""
        ALTER TABLE deliverables
        DROP COLUMN IF EXISTS deletion_reason,
        DROP COLUMN IF EXISTS deleted_by,
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS is_archived;
    """)
    op.execute("""
        ALTER TABLE client_profiles
        DROP COLUMN IF EXISTS brand_logo_url;
    """)
