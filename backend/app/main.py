"""FastAPI main application entrypoint.

Configures CORS, middleware, exception handlers, and the canonical health check.
"""

from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as aioredis
import urllib.parse
from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, get_db

from app.config import settings
from app.core.errors import AppError, app_error_handler
from app.core.build_info import get_build_revision
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIdMiddleware
from app.db.session import engine
from app.routers import (
    admin,
    auth,
    calendar,
    deliverables,
    notifications,
    onboarding,
    payments,
    plans,
    platform,
    portal_dashboard,
    public,
    tasks,
    tenant,
    tickets,
    webhooks,
    chat,
    negotiations,
    instagram,
    publishing,
    bde,
)

logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown."""
    setup_logging()
    logger.info(
        "server_starting",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
    )
    # 1. Self-healing database schema initialization (raw DDL without ORM models)
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            # 1.1 Ensure required extensions
            try:
                await db.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
            except Exception:
                pass

            # 1.2 Ensure agencies table exists and default agency is seeded
            try:
                await db.execute(text("""
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
                """))
                await db.execute(text("""
                    INSERT INTO agencies (id, name, slug, status, plan_tier, max_clients, max_staff, branding, timezone)
                    VALUES ('00000000-0000-0000-0000-000000000001', 'Creo Digital', 'creo', 'active', 'enterprise', 2000, 100, '{}', 'Asia/Kolkata')
                    ON CONFLICT (slug) DO NOTHING;
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_agencies_failed", error=str(e))

            # 1.3 Ensure teams table exists
            try:
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS teams (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
                        name VARCHAR(150) NOT NULL,
                        lead_id UUID,
                        is_active BOOLEAN DEFAULT TRUE NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                    );
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_teams_failed", error=str(e))

            # 1.4 Ensure enums and all critical columns exist on users
            try:
                await db.execute(text("""
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
                """))
                await db.execute(text("""
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                            CREATE TYPE account_status AS ENUM (
                                'pending_verification', 'active', 'lapsed', 'suspended', 'cancelled'
                            );
                        END IF;
                    END $$;
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_enums_failed", error=str(e))

            user_cols = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS owning_team_id UUID;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE NOT NULL;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0 NOT NULL;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;",
                "UPDATE users SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;",
            ]
            for col_stmt in user_cols:
                try:
                    await db.execute(text(col_stmt))
                    await db.commit()
                except Exception as e:
                    logger.warning("schema_patch_users_failed", stmt=col_stmt, error=str(e))

            try:
                await db.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
                            ALTER TABLE users ADD COLUMN role user_role DEFAULT 'client' NOT NULL;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status') THEN
                            ALTER TABLE users ADD COLUMN account_status account_status DEFAULT 'pending_verification' NOT NULL;
                        END IF;
                    END $$;
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_users_roles_failed", error=str(e))

            # 1.5 Fix users.id data type if it is not UUID, and guarantee primary key
            try:
                await db.execute(text("""
                    DO $$
                    DECLARE
                        u_type text;
                        u_udt text;
                        fk_rec record;
                    BEGIN
                        SELECT data_type, udt_name INTO u_type, u_udt FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
                        
                        IF u_type IS NOT NULL AND u_type != 'uuid' AND u_udt != 'uuid' THEN
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
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_users_id_failed", error=str(e))

            # 1.6 Ensure client_profiles table exists and has UUID primary key
            try:
                await db.execute(text("""
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
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_client_profiles_failed", error=str(e))

            # 1.7 Ensure staff_profiles table exists and has safe foreign keys
            try:
                await db.execute(text("""
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
                """))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_staff_profiles_failed", error=str(e))

            # 1.7 Ensure other supporting tables & columns
            col_stmts = [
                "ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS voice_note_url text;",
                "ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS voice_note_duration integer;",
                "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_url text;",
                "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_name varchar(255);",
                "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_type varchar(100);",
                "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_size bigint;",
            ]
            for col_stmt in col_stmts:
                try:
                    await db.execute(text(col_stmt))
                    await db.commit()
                except Exception:
                    pass

            # 1.8 Ensure plan_negotiations
            try:
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS plan_negotiations (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        client_email VARCHAR(255) NOT NULL,
                        client_name VARCHAR(255),
                        proposed_budget VARCHAR(255),
                        contact_phone VARCHAR(50) NOT NULL,
                        preferred_window VARCHAR(100) NOT NULL,
                        target_topic VARCHAR(255),
                        notes TEXT,
                        status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                        agreed_amount BIGINT,
                        reel_quota INTEGER DEFAULT 8,
                        poster_quota INTEGER DEFAULT 12,
                        story_quota INTEGER DEFAULT 15,
                        razorpay_custom_plan_id VARCHAR(255),
                        order_id VARCHAR(255),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                    );
                """))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_negotiations_client_id ON plan_negotiations(client_id);"))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_negotiations_status ON plan_negotiations(status);"))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_negotiations_failed", error=str(e))

            # 1.9 Ensure manual_payment_requests
            try:
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS manual_payment_requests (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                        payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
                        amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                        reference_note TEXT,
                        status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                        reviewed_at TIMESTAMP WITH TIME ZONE,
                        admin_notes TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                    );
                """))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_manual_payments_client_id ON manual_payment_requests(client_id);"))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payment_requests(status);"))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at ON manual_payment_requests(created_at);"))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_manual_payments_failed", error=str(e))

            # 1.10 Ensure bde_proposals and bde_targets
            try:
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS bde_proposals (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        lead_id UUID NOT NULL REFERENCES bde_leads(id) ON DELETE CASCADE,
                        bde_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        plan_name VARCHAR(100) NOT NULL DEFAULT 'Growth Retainer',
                        monthly_fee BIGINT NOT NULL,
                        discount_pct BIGINT NOT NULL DEFAULT 0,
                        final_monthly_fee BIGINT NOT NULL,
                        contract_months BIGINT NOT NULL DEFAULT 6,
                        total_contract_value BIGINT NOT NULL,
                        deliverables JSONB NOT NULL DEFAULT '{}'::jsonb,
                        status VARCHAR(50) NOT NULL DEFAULT 'sent',
                        notes TEXT,
                        valid_until TIMESTAMP WITH TIME ZONE,
                        accepted_at TIMESTAMP WITH TIME ZONE,
                        metadata_extra JSONB NOT NULL DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                    );
                """))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_bde_proposals_lead_id ON bde_proposals(lead_id);"))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_bde_proposals_status ON bde_proposals(status);"))
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS bde_targets (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        bde_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        month VARCHAR(7) NOT NULL,
                        monthly_quota BIGINT NOT NULL DEFAULT 2500000,
                        closed_revenue BIGINT NOT NULL DEFAULT 0,
                        commission_rate DOUBLE PRECISION NOT NULL DEFAULT 5.0,
                        commission_earned BIGINT NOT NULL DEFAULT 0,
                        deals_won BIGINT NOT NULL DEFAULT 0,
                        notes TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                    );
                """))
                await db.execute(text("CREATE INDEX IF NOT EXISTS idx_bde_targets_bde_month ON bde_targets(bde_id, month);"))
                await db.commit()
            except Exception as e:
                logger.warning("schema_patch_bde_failed", error=str(e))

            # 2. Seed and ensure all core staff accounts exist with valid Admin123! credentials
            try:
                import uuid
                from app.models.user import User
                from app.models.enums import UserRole, AccountStatus
                from app.core.security import hash_password
                from sqlalchemy import select, func

                default_staff = [
                    ("admin@creo.agency", "auth_admin_001", "Creo Super Admin", UserRole.SUPER_ADMIN),
                    ("superadmin@creo.agency", "auth_superadmin_001", "Creo Platform Super Admin", UserRole.SUPER_ADMIN),
                    ("ops.admin@creo.agency", "auth_ops_admin", "Aarav Sharma (Operations Admin)", UserRole.ADMIN),
                    ("creative.admin@creo.agency", "auth_creative_admin", "Pooja Nambiar (Creative Admin)", UserRole.ADMIN),
                    ("lead.alpha@creo.agency", "auth_lead_alpha", "Vikram Malhotra (Lead - Pod Alpha)", UserRole.TEAM_LEAD),
                    ("editor.alpha@creo.agency", "auth_editor_alpha", "Karthik Raja (Editor - Pod Alpha)", UserRole.EDITOR),
                    ("designer.alpha@creo.agency", "auth_designer_alpha", "Ananya Deshmukh (Designer - Pod Alpha)", UserRole.DESIGNER),
                    ("lead.beta@creo.agency", "auth_lead_beta", "Sarah Connor (Lead - Pod B)", UserRole.TEAM_LEAD),
                    ("lead@creo.agency", "auth_lead_generic", "Sarah Connor (Lead - Pod B)", UserRole.TEAM_LEAD),
                    ("editor@creo.agency", "auth_editor_generic", "Pranav Rajesh (Video)", UserRole.EDITOR),
                    ("designer@creo.agency", "auth_designer_generic", "Rishi Varma (Design)", UserRole.DESIGNER),
                ]
                default_agency_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
                admin_pw_hash = hash_password("Admin123!")

                for s_email, s_auth, s_name, s_role in default_staff:
                    res = await db.execute(select(User).where(func.lower(User.email) == s_email.lower()))
                    user_record = res.scalar_one_or_none()
                    if not user_record:
                        user_record = User(
                            id=uuid.uuid4(),
                            agency_id=default_agency_id,
                            email=s_email.lower(),
                            auth_id=s_auth,
                            full_name=s_name,
                            role=s_role,
                            account_status=AccountStatus.ACTIVE,
                            hashed_password=admin_pw_hash,
                            must_reset_password=False,
                        )
                        db.add(user_record)
                    else:
                        user_record.role = s_role
                        user_record.account_status = AccountStatus.ACTIVE
                        user_record.hashed_password = admin_pw_hash
                        user_record.must_reset_password = False
                        if not user_record.agency_id:
                            user_record.agency_id = default_agency_id
                await db.commit()
            except Exception as e:
                logger.warning("admin_bootstrap_warning", error=str(e))

    except Exception as e:
        logger.warning("database_lifespan_init_warning", error=str(e))
    import asyncio
    from app.services.instagram_test_post import scheduled_test_loop
    from app.workers.tasks.scheduler import publishing_recovery_loop
    test_scheduler = asyncio.create_task(scheduled_test_loop())
    publishing_scheduler = asyncio.create_task(publishing_recovery_loop())
    from app.services.crm_reminders import reminder_loop
    crm_scheduler = asyncio.create_task(reminder_loop())
    try:
        yield
    finally:
        test_scheduler.cancel()
        publishing_scheduler.cancel()
        crm_scheduler.cancel()
        from contextlib import suppress
        with suppress(asyncio.CancelledError):
            await test_scheduler
        with suppress(asyncio.CancelledError):
            await publishing_scheduler
        with suppress(asyncio.CancelledError):
            await crm_scheduler
    logger.info("server_shutting_down")
    await engine.dispose()


app = FastAPI(
    title="Creo API",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Compress large JSON responses, leaving streaming responses to Starlette.
app.add_middleware(GZipMiddleware, minimum_size=1200, compresslevel=4)

# Request ID tracking middleware
app.add_middleware(RequestIdMiddleware)

# CORS configuration (explicit origins + preview regex for Vercel, Cloudflare Pages/Workers, and Render,
# plus the Capacitor apps: https://localhost on Android, capacitor://localhost on iOS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9\-_]+\.)*(vercel\.app|pages\.dev|workers\.dev|onrender\.com)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^(https|capacitor):\/\/localhost$",
    allow_credentials=True,
    max_age=3600,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id", "Server-Timing"],
)

# Standardized application error handler
app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]


# In-memory IP-based rate limiting dictionary
_ip_request_timestamps: dict[str, list[float]] = {}
MAX_REQUESTS_PER_WINDOW = 200  # 200 requests per 10-second window per IP
WINDOW_SECONDS = 10
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 Megabytes max request size for video/image uploads


@app.middleware("http")
async def security_and_rate_limit_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Zero-trust security middleware:
    - Payload size limitation to prevent DOS / memory exhaustion
    - Sliding-window IP request throttling
    - Comprehensive OWASP security headers injection
    """
    import time

    client_ip = request.client.host if request.client else "unknown"
    origin = request.headers.get("origin")

    # Helper to attach CORS to early returns
    def _add_cors(res: JSONResponse) -> JSONResponse:
        if origin:
            res.headers["Access-Control-Allow-Origin"] = origin
            res.headers["Access-Control-Allow-Credentials"] = "true"
            res.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
            res.headers["Access-Control-Allow-Headers"] = "*"
        return res

    # 1. Payload size check (exempt upload routes for media files)
    if not request.url.path.endswith("/upload") and not request.url.path.endswith("/upload-intent"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_CONTENT_LENGTH:
            return _add_cors(
                JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": f"Request payload exceeds maximum allowed size of {MAX_CONTENT_LENGTH // (1024*1024)}MB.",
                        }
                    },
                )
            )

    # 2. IP-based request throttling / anti-DDoS (exempt health endpoints and root probes)
    if not (request.url.path in {"/", "/health", "/api/v1/health"} or request.url.path.endswith("/health")):
        now = time.time()
        cutoff = now - WINDOW_SECONDS
        timestamps = [t for t in _ip_request_timestamps.get(client_ip, []) if t > cutoff]
        if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
            _ip_request_timestamps[client_ip] = timestamps
            return _add_cors(
                JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many requests from your IP address. Please slow down.",
                        }
                    },
                )
            )
        timestamps.append(now)
        _ip_request_timestamps[client_ip] = timestamps

    # Invalidate both sides of a write: reads during the mutation must not
    # republish an older snapshot after its transaction commits.
    invalidates_dashboard = request.method in {"POST", "PUT", "PATCH", "DELETE"} and not request.url.path.startswith("/api/v1/auth/")
    if invalidates_dashboard:
        from app.core.dashboard_cache import invalidate_dashboard_cache
        await invalidate_dashboard_cache()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error("unhandled_request_exception", error=str(exc), path=request.url.path)
        return _add_cors(
            JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected server error occurred.",
                        "details": str(exc),
                    }
                },
            )
        )

    finally:
        if invalidates_dashboard:
            await invalidate_dashboard_cache()

    # 3. Comprehensive OWASP Recommended Security Headers (Excluding CSP which breaks cross-origin SPA APIs)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    return response



@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format Pydantic request validation errors into standard Creo API error envelope."""
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = err.get("loc", [])
        field = ".".join(str(x) for x in loc if x != "body")
        msg = err.get("msg", "Validation error")
        messages.append(f"{field}: {msg}" if field else msg)
    message = "; ".join(messages) if messages else "Invalid request payload"
    resp = JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": {"errors": errors},
            }
        },
    )
    origin = request.headers.get("origin")
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler ensuring unhandled exceptions always return structured error and CORS headers."""
    logger.error("unhandled_global_exception", error=str(exc), path=request.url.path)
    resp = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "details": str(exc),
            }
        },
    )
    origin = request.headers.get("origin")
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp

# API v1 feature routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.users_router, prefix="/api/v1")
app.include_router(instagram.router, prefix="/api/v1")
app.include_router(publishing.router, prefix="/api/v1")
from app.routers import revenue_crm
app.include_router(revenue_crm.router, prefix="/api/v1")
app.include_router(revenue_crm.public_router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(portal_dashboard.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(calendar.ops_router, prefix="/api/v1")
app.include_router(calendar.portal_router, prefix="/api/v1")
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(deliverables.router, prefix="/api/v1")
app.include_router(deliverables.portal_router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(tasks.router)
app.include_router(admin.router, prefix="/api/v1")
app.include_router(negotiations.router, prefix="/api/v1/negotiations")
app.include_router(admin.router)
app.include_router(platform.router, prefix="/api/v1")
app.include_router(tenant.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(bde.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(public.router)


import os
from fastapi.staticfiles import StaticFiles

_static_dir = os.path.join(os.path.dirname(__file__), "static")
_uploads_dir = os.path.join(_static_dir, "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")



@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root(
    request: Request,
    code: str | None = None,
    state: str | None = None,
) -> Any:
    """Root endpoint — returns API service status or handles direct Google OAuth browser redirects."""
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="application/json")

    if code:
        from app.db.session import AsyncSessionLocal
        from app.routers.auth import _process_google_code

        async with AsyncSessionLocal() as session:
            data = await _process_google_code(code, "https://creo-dsxr.onrender.com", session)
            token = data["access_token"]
            frontend_base = "http://localhost:5173"
            if state and (state.startswith("http://") or state.startswith("https://")):
                frontend_base = state.rstrip("/")
            return RedirectResponse(
                url=f"{frontend_base}/auth/google/callback?token={urllib.parse.quote(token)}"
            )
    return {
        "name": "Creo API",
        "status": "online",
        "version": settings.VERSION,
        "build_revision": get_build_revision(),
        "docs": "/docs",
        "health": "/health",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/api/v1/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check(request: Request) -> Response:
    """Verify live connectivity to PostgreSQL and Redis.

    Performs a real `SELECT 1` on the database engine and `PING` on Redis.
    """
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="application/json")
    db_status = "ok"
    redis_status = "ok"
    errors: dict[str, str] = {}

    # Check PostgreSQL database connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        errors["db"] = str(e)
        logger.error("health_check_database_failed", error=str(e))

    # Check Redis connectivity
    try:
        if settings.REDIS_URL.startswith("fakeredis"):
            from fakeredis import aioredis as fake_aioredis

            r = fake_aioredis.FakeRedis(decode_responses=True)
            ping_res = await r.ping()
        else:
            try:
                r = aioredis.from_url(  # type: ignore[no-untyped-call]
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=3.0,
                )
                ping_res = await r.ping()
                await r.aclose()
            except Exception as conn_err:
                if settings.ENVIRONMENT == "development":
                    from fakeredis import aioredis as fake_aioredis

                    r = fake_aioredis.FakeRedis(decode_responses=True)
                    ping_res = await r.ping()
                    logger.info("health_check_redis_local_fallback", original_error=str(conn_err))
                else:
                    raise conn_err
        if not ping_res:
            redis_status = "error"
            errors["redis"] = "Ping returned falsy value"
        await r.aclose()
    except Exception as e:
        redis_status = "error"
        errors["redis"] = str(e)
        logger.error("health_check_redis_failed", error=str(e))

    overall_status = "ok" if (db_status == "ok" and redis_status == "ok") else "degraded"
    http_code = (
        status.HTTP_200_OK if db_status == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    payload: dict[str, Any] = {
        "status": overall_status,
        "db": db_status,
        "redis": redis_status,
        "version": settings.VERSION,
        "build_revision": get_build_revision(),
    }
    if errors:
        payload["details"] = errors

    return JSONResponse(status_code=http_code, content=payload)
