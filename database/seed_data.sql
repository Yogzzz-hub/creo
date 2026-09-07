-- =============================================================================
-- CREO PLATFORM — POSTGRESQL PRODUCTION SEED DATA
-- =============================================================================
-- Database: PostgreSQL 15+ / 16+ / 17+ (Supabase compatible)
-- Description: Idempotent core baseline seed data for subscription plans
--              and primary agency staff accounts (Fresh start: 0 clients, 0 income).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS
-- -----------------------------------------------------------------------------
INSERT INTO plans (
    id, name, display_name, price_minor, currency, monthly_price,
    poster_quota, reel_quota, story_quota, revision_rounds,
    has_dedicated_manager, scarcity_slots, highlights, is_recommended, is_active
) VALUES
(
    '00000000-0000-0000-0000-000000000010',
    'starter',
    'Starter Growth',
    2500000,
    'INR',
    25000.00,
    8,
    4,
    10,
    1,
    false,
    5,
    '[
        "8 Static brand posters (1:1 & 4:5)",
        "4 High-impact 9:16 mobile reels",
        "10 Story creatives with engagement stickers",
        "1 Round of creative revisions",
        "Instagram auto-scheduling & dispatch",
        "Live analytics dashboard access"
    ]'::jsonb,
    false,
    true
),
(
    '00000000-0000-0000-0000-000000000020',
    'growth',
    'Brand Accelerator',
    5000000,
    'INR',
    50000.00,
    15,
    8,
    20,
    2,
    true,
    3,
    '[
        "15 Static brand posters (multi-format)",
        "8 Cinematic 9:16 reels with audio sync",
        "20 Interactive story creatives",
        "2 Rounds of creative revisions",
        "Dedicated creative director & copywriter",
        "Instagram & Facebook cross-publishing",
        "Weekly performance reviews & hashtag matrix"
    ]'::jsonb,
    true,
    true
),
(
    '00000000-0000-0000-0000-000000000030',
    'pro',
    'Enterprise Domination',
    9500000,
    'INR',
    95000.00,
    30,
    16,
    40,
    3,
    true,
    2,
    '[
        "30 Static brand posters & custom carousel decks",
        "16 High-production 4K reels & UGC composites",
        "40 Story creatives & interactive poll sets",
        "3 Rounds of creative revisions",
        "Dedicated Senior Account Director & VFX lead",
        "Multichannel distribution & ad asset prep",
        "On-demand custom revisions & priority 24h turnaround"
    ]'::jsonb,
    false,
    true
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_minor = EXCLUDED.price_minor,
    monthly_price = EXCLUDED.monthly_price,
    poster_quota = EXCLUDED.poster_quota,
    reel_quota = EXCLUDED.reel_quota,
    story_quota = EXCLUDED.story_quota,
    highlights = EXCLUDED.highlights,
    is_recommended = EXCLUDED.is_recommended;

-- -----------------------------------------------------------------------------
-- 2. CORE AGENCY STAFF USERS
-- All accounts require mandatory password setup upon first sign in (must_reset_password = TRUE)
-- -----------------------------------------------------------------------------
INSERT INTO users (
    id, auth_id, email, full_name, hashed_password, role, account_status, email_verified_at, must_reset_password
) VALUES
-- 2.1 Super Admin (Full Agency Access)
(
    '00000000-0000-0000-0000-000000000001',
    'auth-super-admin-001',
    'admin@creo.agency',
    'Ashok Kumar (Executive)',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'super_admin',
    'active',
    NOW(),
    TRUE
),
-- 2.2 Team Lead (Pod Controller)
(
    '00000000-0000-0000-0000-000000000002',
    'auth-team-lead-002',
    'lead@creo.agency',
    'Vikram Malhotra (Lead)',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'team_lead',
    'active',
    NOW(),
    TRUE
),
-- 2.3 Staff Video Editor
(
    '00000000-0000-0000-0000-000000000003',
    'auth-staff-editor-003',
    'editor@creo.agency',
    'Karthik Raja (Senior Video)',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'editor',
    'active',
    NOW(),
    TRUE
),
-- 2.4 Staff Brand Designer
(
    '00000000-0000-0000-0000-000000000004',
    'auth-staff-designer-004',
    'designer@creo.agency',
    'Ananya Deshmukh (Motion & UI)',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'designer',
    'active',
    NOW(),
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status,
    must_reset_password = EXCLUDED.must_reset_password;

-- -----------------------------------------------------------------------------
-- 3. STAFF PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO staff_profiles (user_id, team_lead_id, department, daily_capacity, skills, is_accepting_work)
VALUES
(
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'creative',
    6,
    ARRAY['Direction', 'QA Review', 'Storyboarding', 'Client SLA'],
    true
),
(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'video',
    5,
    ARRAY['Premiere Pro', 'After Effects', '9:16 Reels', 'Sound Design'],
    true
),
(
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'design',
    5,
    ARRAY['Figma', 'Photoshop', 'Brand Carousels', 'Typography'],
    true
)
ON CONFLICT (user_id) DO UPDATE SET
    daily_capacity = EXCLUDED.daily_capacity,
    skills = EXCLUDED.skills,
    is_accepting_work = EXCLUDED.is_accepting_work;

-- -----------------------------------------------------------------------------
-- 4. REFRESH MATERIALIZED VIEW
-- -----------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW mv_exec_kpis;
