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
    # 0. Ensure alembic_version column is wide enough to store this and future revision IDs
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64);")

    # 1. Ensure extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 1.1 Ensure enums exist safely without illegal ALTER TYPE inside DO $$ blocks
    with op.get_context().autocommit_block():
        op.execute("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                    CREATE TYPE user_role AS ENUM (
                        'super_admin', 'admin', 'sales', 'bde', 'bde_head', 'team_lead',
                        'editor', 'designer', 'freelancer', 'client', 'investor_relations'
                    );
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                    CREATE TYPE account_status AS ENUM (
                        'pending_verification', 'active', 'lapsed', 'suspended', 'cancelled'
                    );
                END IF;
            END $$;
        """)
        for role_val in (
            'super_admin', 'admin', 'sales', 'bde', 'bde_head', 'team_lead',
            'editor', 'designer', 'freelancer', 'client', 'investor_relations'
        ):
            op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{role_val}';")
        for status_val in (
            'pending_verification', 'active', 'lapsed', 'suspended', 'cancelled'
        ):
            op.execute(f"ALTER TYPE account_status ADD VALUE IF NOT EXISTS '{status_val}';")

    # 2. Ensure agencies table exists and default agency is seeded safely
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
        SELECT '00000000-0000-0000-0000-000000000001', 'Creo Digital', 'creo', 'active', 'enterprise', 2000, 100, '{}'::jsonb, 'Asia/Kolkata'
        WHERE NOT EXISTS (
            SELECT 1 FROM agencies WHERE id = '00000000-0000-0000-0000-000000000001' OR slug = 'creo'
        );
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

    # 3.1 Drop dependent views temporarily to allow column type alters without error
    op.execute("DROP VIEW IF EXISTS v_client_onboarding CASCADE;")

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

    # Set agency_id fallback and foreign key
    op.execute("""
        UPDATE users
        SET agency_id = (SELECT id FROM agencies ORDER BY (status = 'active') DESC, created_at ASC LIMIT 1)
        WHERE agency_id IS NULL;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_name = 'users_agency_id_fkey' AND table_schema = 'public'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT users_agency_id_fkey
                    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
            END IF;
        END $$;
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

    # 6. Ensure client_profiles table exists and has UUID primary key matching users(id)
    op.execute("""
        DO $$
        DECLARE
            cp_type text;
            cp_udt text;
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_profiles') THEN
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
            ELSE
                SELECT data_type, udt_name INTO cp_type, cp_udt 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'user_id';
                
                IF cp_type IS NOT NULL AND cp_type != 'uuid' AND cp_udt != 'uuid' THEN
                    ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_pkey CASCADE;
                    ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey CASCADE;
                    ALTER TABLE client_profiles ALTER COLUMN user_id TYPE UUID 
                        USING (
                            CASE 
                                WHEN user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                                THEN user_id::text::uuid 
                                ELSE gen_random_uuid() 
                            END
                        );
                    ALTER TABLE client_profiles ADD PRIMARY KEY (user_id);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'client_profiles' AND constraint_type = 'PRIMARY KEY' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE client_profiles ADD PRIMARY KEY (user_id);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'client_profiles' AND constraint_name = 'client_profiles_user_id_fkey' AND table_schema = 'public'
                ) THEN
                    DELETE FROM client_profiles WHERE user_id NOT IN (SELECT id FROM users);
                    ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_user_id_fkey 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                END IF;
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

    # 7. Ensure staff_profiles table exists and has safe foreign keys
    op.execute("""
        DO $$
        DECLARE
            sp_type text;
            sp_udt text;
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_profiles') THEN
                CREATE TABLE staff_profiles (
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
            ELSE
                SELECT data_type, udt_name INTO sp_type, sp_udt 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'user_id';
                
                IF sp_type IS NOT NULL AND sp_type != 'uuid' AND sp_udt != 'uuid' THEN
                    ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_pkey CASCADE;
                    ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_user_id_fkey CASCADE;
                    ALTER TABLE staff_profiles ALTER COLUMN user_id TYPE UUID 
                        USING (
                            CASE 
                                WHEN user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                                THEN user_id::text::uuid 
                                ELSE gen_random_uuid() 
                            END
                        );
                    ALTER TABLE staff_profiles ADD PRIMARY KEY (user_id);
                END IF;

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

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'staff_profiles' AND constraint_type = 'PRIMARY KEY' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE staff_profiles ADD PRIMARY KEY (user_id);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'staff_profiles' AND constraint_name = 'staff_profiles_user_id_fkey' AND table_schema = 'public'
                ) THEN
                    DELETE FROM staff_profiles WHERE user_id NOT IN (SELECT id FROM users);
                    ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_user_id_fkey 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'staff_profiles' AND constraint_name = 'staff_profiles_agency_id_fkey' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_agency_id_fkey 
                        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_name = 'staff_profiles' AND constraint_name = 'staff_profiles_team_lead_id_fkey' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_team_lead_id_fkey 
                        FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END $$;
    """)

    # 8. Re-create v_client_onboarding view with complete stage derivation
    op.execute("""
        CREATE OR REPLACE VIEW v_client_onboarding AS
        SELECT
            u.id AS client_id,
            CASE
                WHEN cp.onboarding_completed_at IS NOT NULL 
                     AND EXISTS (SELECT 1 FROM content_calendar cc WHERE cc.client_id = u.id)
                     AND EXISTS (SELECT 1 FROM client_assignments ca WHERE ca.client_id = u.id)
                     AND cp.brand_dna IS NOT NULL AND cp.brand_dna <> '{}'::jsonb
                     AND q.core_completed_at IS NOT NULL
                     AND s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 8
                WHEN EXISTS (SELECT 1 FROM content_calendar cc WHERE cc.client_id = u.id)
                     AND EXISTS (SELECT 1 FROM client_assignments ca WHERE ca.client_id = u.id)
                     AND cp.brand_dna IS NOT NULL AND cp.brand_dna <> '{}'::jsonb
                     AND q.core_completed_at IS NOT NULL
                     AND s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 7
                WHEN EXISTS (SELECT 1 FROM client_assignments ca WHERE ca.client_id = u.id)
                     AND cp.brand_dna IS NOT NULL AND cp.brand_dna <> '{}'::jsonb
                     AND q.core_completed_at IS NOT NULL
                     AND s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 6
                WHEN cp.brand_dna IS NOT NULL AND cp.brand_dna <> '{}'::jsonb
                     AND q.core_completed_at IS NOT NULL
                     AND s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 5
                WHEN q.core_completed_at IS NOT NULL
                     AND s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 4
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active')
                     AND cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 3
                WHEN cp.terms_accepted_at IS NOT NULL
                     AND (u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification')
                THEN 2
                WHEN u.email_verified_at IS NOT NULL OR u.account_status <> 'pending_verification'
                THEN 1
                ELSE 0
            END AS stage
        FROM users u
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN questionnaires q ON q.user_id = u.id
        LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
        WHERE u.role = 'client';
    """)

    # 9. Ensure indexes safely
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_agency') THEN
                CREATE INDEX idx_users_agency ON users (agency_id, role, created_at);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role_created_at') THEN
                CREATE INDEX idx_users_role_created_at ON users (role, created_at);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_google_sub') THEN
                CREATE UNIQUE INDEX ix_users_google_sub ON users (google_sub);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_email_lower') THEN
                CREATE INDEX ix_users_email_lower ON users (lower(email));
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # 1. Drop indexes created in upgrade
    op.execute("DROP INDEX IF EXISTS idx_users_agency;")
    op.execute("DROP INDEX IF EXISTS idx_users_role_created_at;")
    op.execute("DROP INDEX IF EXISTS ix_users_google_sub;")
    op.execute("DROP INDEX IF EXISTS ix_users_email_lower;")

    # 2. Drop foreign keys added in upgrade
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_agency_id_fkey;")
    op.execute("ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;")
    op.execute("ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_user_id_fkey;")
    op.execute("ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_agency_id_fkey;")
    op.execute("ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_team_lead_id_fkey;")
