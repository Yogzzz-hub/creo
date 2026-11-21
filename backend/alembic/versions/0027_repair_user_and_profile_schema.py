"""repair_user_and_profile_schema

Revision ID: 0027_repair_user_and_profile_schema
Revises: 0026_revenue_crm
Create Date: 2026-11-21

Ensures all essential multi-tenant and authentication columns exist on users,
reconciles client_profiles and staff_profiles column types, and fixes any
integer vs uuid type mismatch between users and client_profiles.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0027_repair_user_and_profile_schema"
down_revision: Union[str, None] = "0026_revenue_crm"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 2. Ensure agencies table exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS agencies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            custom_domain VARCHAR(255) UNIQUE,
            status VARCHAR(20) DEFAULT 'active' NOT NULL,
            plan_tier VARCHAR(30) DEFAULT 'enterprise' NOT NULL,
            max_clients INT DEFAULT 2000 NOT NULL,
            max_staff INT DEFAULT 100 NOT NULL,
            branding JSONB DEFAULT '{}'::jsonb NOT NULL,
            timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("""
        INSERT INTO agencies (id, name, slug, status, plan_tier, max_clients, max_staff, branding, timezone)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Creo Digital', 'creo', 'active', 'enterprise', 2000, 100, '{}', 'Asia/Kolkata')
        ON CONFLICT (slug) DO NOTHING;
    """)

    # 3. Ensure teams table exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
            name VARCHAR(150) NOT NULL,
            lead_id UUID,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)

    # 4. Ensure all user columns exist
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS owning_team_id UUID;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE NOT NULL;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0 NOT NULL;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id VARCHAR(255);")

    # Set agency_id fallback
    op.execute("""
        UPDATE users
        SET agency_id = '00000000-0000-0000-0000-000000000001'
        WHERE agency_id IS NULL;
    """)

    # 5. Fix type mismatch between users.id and client_profiles.user_id
    op.execute("""
        DO $$
        DECLARE
            u_type text;
            cp_type text;
        BEGIN
            SELECT data_type INTO u_type FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
            
            SELECT data_type INTO cp_type FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'user_id';
            
            IF cp_type IS NULL THEN
                CREATE TABLE IF NOT EXISTS client_profiles (
                    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    company_name TEXT,
                    brand_logo_url TEXT,
                    instagram_username VARCHAR(255),
                    instagram_user_id VARCHAR(255),
                    ig_token_encrypted BYTEA,
                    ig_connection_id UUID,
                    ig_connection_status VARCHAR(30) DEFAULT 'disconnected',
                    ig_metadata JSONB DEFAULT '{}'::jsonb,
                    ig_token_expires_at TIMESTAMPTZ,
                    brand_summary TEXT,
                    brand_dna JSONB DEFAULT '{}'::jsonb NOT NULL,
                    brand_dna_version INT DEFAULT 1 NOT NULL,
                    brand_dna_source VARCHAR(20) DEFAULT 'template' NOT NULL,
                    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
                    calendar_template JSONB DEFAULT NULL,
                    terms_accepted_at TIMESTAMPTZ,
                    terms_version VARCHAR(50),
                    onboarding_completed_at TIMESTAMPTZ,
                    onboarding_deadline TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                );
            ELSIF cp_type IN ('integer', 'bigint', 'smallint') AND u_type = 'uuid' THEN
                BEGIN
                    ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_pkey CASCADE;
                    ALTER TABLE client_profiles ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
                    ALTER TABLE client_profiles ADD PRIMARY KEY (user_id);
                    ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_user_id_fkey 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                EXCEPTION WHEN OTHERS THEN
                    DROP TABLE client_profiles CASCADE;
                    CREATE TABLE client_profiles (
                        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                        company_name TEXT,
                        brand_logo_url TEXT,
                        instagram_username VARCHAR(255),
                        instagram_user_id VARCHAR(255),
                        ig_token_encrypted BYTEA,
                        ig_connection_id UUID,
                        ig_connection_status VARCHAR(30) DEFAULT 'disconnected',
                        ig_metadata JSONB DEFAULT '{}'::jsonb,
                        ig_token_expires_at TIMESTAMPTZ,
                        brand_summary TEXT,
                        brand_dna JSONB DEFAULT '{}'::jsonb NOT NULL,
                        brand_dna_version INT DEFAULT 1 NOT NULL,
                        brand_dna_source VARCHAR(20) DEFAULT 'template' NOT NULL,
                        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
                        calendar_template JSONB DEFAULT NULL,
                        terms_accepted_at TIMESTAMPTZ,
                        terms_version VARCHAR(50),
                        onboarding_completed_at TIMESTAMPTZ,
                        onboarding_deadline TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                    );
                END;
            END IF;
        END $$;
    """)

    # Ensure missing columns in client_profiles if it already existed
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(255);")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ig_token_encrypted BYTEA;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ig_connection_id UUID;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ig_connection_status VARCHAR(30) DEFAULT 'disconnected';")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ig_metadata JSONB DEFAULT '{}'::jsonb;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ig_token_expires_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS brand_dna_version INT DEFAULT 1;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS brand_dna_source VARCHAR(20) DEFAULT 'template';")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS calendar_template JSONB DEFAULT NULL;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50);")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS onboarding_deadline TIMESTAMPTZ;")

    # 6. Ensure staff_profiles table exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS staff_profiles (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
            department VARCHAR(50) DEFAULT 'creative' NOT NULL,
            craft_role VARCHAR(30) DEFAULT 'graphic_designer' NOT NULL,
            skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
            sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
            daily_capacity INT DEFAULT 4 NOT NULL,
            daily_points INT DEFAULT 8 NOT NULL,
            monthly_points INT DEFAULT 100 NOT NULL,
            is_accepting_work BOOLEAN DEFAULT true NOT NULL,
            team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    """)

    # 7. Ensure indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_agency ON users (agency_id, role, created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users (role, created_at);")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users (lower(email));")


def downgrade() -> None:
    pass
