"""repair_user_and_profile_schema

Revision ID: 0027_repair_user_and_profile_schema
Revises: 0026_revenue_crm
Create Date: 2026-11-21

Ensures all essential multi-tenant and authentication columns exist on users,
reconciles client_profiles and staff_profiles column types, and fixes any
integer vs uuid type mismatch between users and profiles.
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

    # 1.1 Ensure enums exist
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM (
                    'super_admin', 'admin', 'sales', 'bde', 'bde_head', 'team_lead',
                    'editor', 'designer', 'freelancer', 'client', 'investor_relations'
                );
            ELSE
                BEGIN
                    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bde';
                    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bde_head';
                    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'freelancer';
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
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
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
                ALTER TABLE users ADD COLUMN role user_role DEFAULT 'client' NOT NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status') THEN
                ALTER TABLE users ADD COLUMN account_status account_status DEFAULT 'pending_verification' NOT NULL;
            END IF;
        END $$;
    """)

    # Set agency_id fallback
    op.execute("""
        UPDATE users
        SET agency_id = '00000000-0000-0000-0000-000000000001'
        WHERE agency_id IS NULL;
    """)

    # 5. Fix users.id data type if it is not UUID, and guarantee primary key
    op.execute("""
        DO $$
        DECLARE
            u_type text;
            u_udt text;
            fk_rec record;
        BEGIN
            SELECT data_type, udt_name INTO u_type, u_udt FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
            
            IF u_type IS NOT NULL AND u_type != 'uuid' AND u_udt != 'uuid' THEN
                -- Drop any foreign key constraints referencing users(id) from any table
                FOR fk_rec IN (
                    SELECT tc.table_name, tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.constraint_column_usage ccu 
                      ON ccu.constraint_name = tc.constraint_name 
                      AND ccu.table_schema = tc.table_schema
                    WHERE ccu.table_name = 'users' 
                      AND ccu.column_name = 'id' 
                      AND tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = 'public'
                ) LOOP
                    EXECUTE 'ALTER TABLE ' || quote_ident(fk_rec.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_rec.constraint_name) || ' CASCADE';
                END LOOP;
                
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
                
                ALTER TABLE users ADD COLUMN IF NOT EXISTS new_uuid_id UUID DEFAULT gen_random_uuid();
                UPDATE users SET new_uuid_id = 
                    CASE 
                        WHEN id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                        THEN id::text::uuid 
                        ELSE gen_random_uuid() 
                    END;
                ALTER TABLE users DROP COLUMN id CASCADE;
                ALTER TABLE users RENAME COLUMN new_uuid_id TO id;
                ALTER TABLE users ALTER COLUMN id SET NOT NULL;
                ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
                ALTER TABLE users ADD PRIMARY KEY (id);
            END IF;

            -- Ensure primary key exists on users(id)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                  ON ccu.constraint_name = tc.constraint_name 
                  AND ccu.table_schema = tc.table_schema
                WHERE tc.table_name = 'users' 
                  AND ccu.column_name = 'id' 
                  AND tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = 'public'
            ) THEN
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
                ALTER TABLE users ADD PRIMARY KEY (id);
            END IF;
        END $$;
    """)

    # 6. Ensure client_profiles table exists and has UUID primary key
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_profiles') THEN
                CREATE TABLE client_profiles (
                    user_id UUID PRIMARY KEY,
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
            ELSE
                BEGIN
                    ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_pkey CASCADE;
                    ALTER TABLE client_profiles ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
                    ALTER TABLE client_profiles ADD PRIMARY KEY (user_id);
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;

            BEGIN
                ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;
                ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
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

    # 7. Ensure staff_profiles table exists and has safe foreign keys
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_profiles') THEN
                CREATE TABLE staff_profiles (
                    user_id UUID PRIMARY KEY,
                    agency_id UUID,
                    department VARCHAR(50) DEFAULT 'creative' NOT NULL,
                    craft_role VARCHAR(30) DEFAULT 'graphic_designer' NOT NULL,
                    skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
                    sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
                    daily_capacity INT DEFAULT 4 NOT NULL,
                    daily_points INT DEFAULT 8 NOT NULL,
                    monthly_points INT DEFAULT 100 NOT NULL,
                    is_accepting_work BOOLEAN DEFAULT true NOT NULL,
                    team_lead_id UUID,
                    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                );
            ELSE
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS agency_id UUID;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'creative' NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS craft_role VARCHAR(30) DEFAULT 'graphic_designer' NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[] NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 4 NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_points INT DEFAULT 8 NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS monthly_points INT DEFAULT 100 NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS is_accepting_work BOOLEAN DEFAULT true NOT NULL;
                ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS team_lead_id UUID;
            END IF;

            BEGIN
                ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_user_id_fkey;
                ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            BEGIN
                ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_agency_id_fkey;
                ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_agency_id_fkey 
                    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            BEGIN
                ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_team_lead_id_fkey;
                ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_team_lead_id_fkey 
                    FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END $$;
    """)

    # 8. Ensure indexes safely
    op.execute("""
        DO $$
        BEGIN
            BEGIN
                CREATE INDEX IF NOT EXISTS idx_users_agency ON users (agency_id, role, created_at);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            BEGIN
                CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users (role, created_at);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            BEGIN
                CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            BEGIN
                CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users (lower(email));
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END $$;
    """)


def downgrade() -> None:
    pass
