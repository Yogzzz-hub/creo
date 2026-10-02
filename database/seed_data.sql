-- =============================================================================
-- CREO PLATFORM — POSTGRESQL PRODUCTION SEED DATA
-- =============================================================================
-- Database: PostgreSQL 15+ / 16+ / 17+ (Supabase compatible)
-- Description: Idempotent core baseline seed data for subscription plans
--              and primary agency staff accounts (Fresh start: 0 clients, 0 income).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. DEFAULT AGENCY & TEAMS
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug ON agencies (slug);

INSERT INTO agencies (
    id, name, slug, status, plan_tier, max_clients, max_staff, branding, timezone
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Creo Digital',
    'creo',
    'active',
    'enterprise',
    100,
    100,
    '{}'::jsonb,
    'Asia/Kolkata'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    plan_tier = EXCLUDED.plan_tier;

-- -----------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_name ON plans (name);

INSERT INTO plans (
    id, agency_id, name, display_name, price_minor, currency, monthly_price,
    poster_quota, reel_quota, story_quota, revision_rounds,
    has_dedicated_manager, scarcity_slots, highlights, is_recommended, is_active
) VALUES
(
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'starter',
    'Starter',
    2500000,
    'INR',
    25000.00,
    8,
    4,
    10,
    1,
    false,
    0,
    '[
        "8 Static brand posters (1:1 & 4:5)",
        "4 High-impact 9:16 mobile reels",
        "10 Story creatives with engagement stickers",
        "1 Round of creative revisions",
        "3 business-day batch SLA",
        "Live analytics dashboard access"
    ]'::jsonb,
    false,
    true
),
(
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    'growth',
    'Growth',
    5000000,
    'INR',
    50000.00,
    16,
    10,
    22,
    2,
    true,
    0,
    '[
        "16 Static brand posters (multi-format)",
        "10 Cinematic 9:16 reels with audio sync",
        "22 Interactive story creatives",
        "2 Rounds of creative revisions",
        "2 business-day batch SLA",
        "Dedicated account director",
        "Weekly performance reviews & hashtag matrix"
    ]'::jsonb,
    true,
    true
),
(
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    'scale',
    'Scale',
    9500000,
    'INR',
    95000.00,
    32,
    20,
    44,
    3,
    true,
    0,
    '[
        "32 Static brand posters & custom carousel decks",
        "20 High-production 4K reels & UGC composites",
        "44 Story creatives & interactive poll sets",
        "3 Rounds of creative revisions",
        "24-hour priority SLA",
        "Director + monthly strategy review",
        "Multichannel distribution & ad asset prep"
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
-- 2. CORE USERS & LOGINS (Password for all: Admin123!)
-- Hash: $2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

INSERT INTO users (
    id, agency_id, auth_id, email, full_name, hashed_password, role, account_status, email_verified_at, must_reset_password
) VALUES
-- Super Admin
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'auth-super-admin-001',
    'admin@creo.agency',
    'Ashok Kumar (Executive Super Admin)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'super_admin',
    'active',
    NOW(),
    FALSE
),
-- Agency Operations & Creative Admins
(
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'auth-ops-admin-002',
    'ops.admin@creo.agency',
    'Aarav Sharma (Operations Admin)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'admin',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'auth-creative-admin-003',
    'creative.admin@creo.agency',
    'Pooja Nambiar (Creative Admin)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'admin',
    'active',
    NOW(),
    FALSE
),

-- Pod A (Pod Alpha)
(
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000001',
    'auth-lead-alpha-001',
    'lead.alpha@creo.agency',
    'Vikram Malhotra (Lead - Pod Alpha)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'team_lead',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-000000000001',
    'auth-editor-alpha-002',
    'editor.alpha@creo.agency',
    'Karthik Raja (Editor - Pod Alpha)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'editor',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-000000000001',
    'auth-designer-alpha-003',
    'designer.alpha@creo.agency',
    'Ananya Deshmukh (Designer - Pod Alpha)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'designer',
    'active',
    NOW(),
    FALSE
),

-- Pod B (Pod Beta)
(
    '00000000-0000-0000-0000-0000000000b1',
    '00000000-0000-0000-0000-000000000001',
    'auth-lead-beta-001',
    'lead.beta@creo.agency',
    'Sarah Connor (Lead - Pod B)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'team_lead',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000b4',
    '00000000-0000-0000-0000-000000000001',
    'auth-lead-alias-004',
    'lead@creo.agency',
    'Sarah Connor (Lead - Pod B)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'team_lead',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000b2',
    '00000000-0000-0000-0000-000000000001',
    'auth-editor-beta-002',
    'editor.beta@creo.agency',
    'David Kim (Editor - Pod B)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'editor',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000b5',
    '00000000-0000-0000-0000-000000000001',
    'auth-member-alias-005',
    'member@creo.agency',
    'David Kim (Editor - Pod B)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'editor',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000b3',
    '00000000-0000-0000-0000-000000000001',
    'auth-designer-beta-003',
    'designer.beta@creo.agency',
    'Elena Rostova (Designer - Pod B)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'designer',
    'active',
    NOW(),
    FALSE
),

-- Pod C (Pod Gamma)
(
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-000000000001',
    'auth-lead-gamma-001',
    'lead.gamma@creo.agency',
    'Rohan Mehta (Lead - Pod C)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'team_lead',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000c2',
    '00000000-0000-0000-0000-000000000001',
    'auth-editor-gamma-002',
    'editor.gamma@creo.agency',
    'Tanvi Sen (Editor - Pod C)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'editor',
    'active',
    NOW(),
    FALSE
),
(
    '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-000000000001',
    'auth-designer-gamma-003',
    'designer.gamma@creo.agency',
    'Arjun Nair (Designer - Pod C)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'designer',
    'active',
    NOW(),
    FALSE
),

-- Standard Client (Ryze Mushroom Coffee)
(
    '00000000-0000-0000-0000-0000000000d1',
    '00000000-0000-0000-0000-000000000001',
    'auth-client-ryze-001',
    'client@creo.agency',
    'Sushmitaa (Ryze Mushroom Coffee)',
    '$2b$12$4lmZSL2E1NcdI71mrdQtoutEfXPilLObmHfj7oE7X2SIhwqk7UFSm',
    'client',
    'active',
    NOW(),
    FALSE
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    hashed_password = EXCLUDED.hashed_password,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status,
    must_reset_password = EXCLUDED.must_reset_password;

-- -----------------------------------------------------------------------------
-- 3. TEAMS (Strictly 3 Pods: Pod Alpha, Pod Beta, Pod Gamma)
-- -----------------------------------------------------------------------------
DELETE FROM teams a USING teams b
WHERE a.ctid < b.ctid AND a.agency_id = b.agency_id AND a.name = b.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_agency_name ON teams (agency_id, name);

INSERT INTO teams (id, agency_id, name, lead_id, is_active)
VALUES
(
    '00000000-0000-0000-0000-0000000000a0',
    '00000000-0000-0000-0000-000000000001',
    'Pod Alpha',
    (SELECT id FROM users WHERE email = 'lead.alpha@creo.agency'),
    true
),
(
    '00000000-0000-0000-0000-0000000000b0',
    '00000000-0000-0000-0000-000000000001',
    'Pod Beta',
    (SELECT id FROM users WHERE email = 'lead.beta@creo.agency'),
    true
),
(
    '00000000-0000-0000-0000-0000000000c0',
    '00000000-0000-0000-0000-000000000001',
    'Pod Gamma',
    (SELECT id FROM users WHERE email = 'lead.gamma@creo.agency'),
    true
)
ON CONFLICT (agency_id, name) DO UPDATE SET
    lead_id = EXCLUDED.lead_id,
    is_active = EXCLUDED.is_active;

-- Team Members mapping
DELETE FROM team_members a USING team_members b
WHERE a.ctid < b.ctid AND a.team_id = b.team_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique ON team_members (team_id, user_id);

INSERT INTO team_members (agency_id, team_id, user_id, is_home)
VALUES
-- Pod Alpha
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Alpha' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='lead.alpha@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Alpha' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='editor.alpha@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Alpha' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='designer.alpha@creo.agency'), true),
-- Pod Beta
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Beta' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='lead.beta@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Beta' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='editor.beta@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Beta' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='designer.beta@creo.agency'), true),
-- Pod Gamma
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Gamma' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='lead.gamma@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Gamma' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='editor.gamma@creo.agency'), true),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE name='Pod Gamma' AND agency_id='00000000-0000-0000-0000-000000000001'), (SELECT id FROM users WHERE email='designer.gamma@creo.agency'), true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. STAFF PROFILES (Department, Craft Role, Skills, Capacity)
-- -----------------------------------------------------------------------------
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS craft_role VARCHAR(30) DEFAULT 'graphic_designer' NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 4 NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_points INT DEFAULT 8 NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS monthly_points INT DEFAULT 100 NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS is_accepting_work BOOLEAN DEFAULT true NOT NULL;

DELETE FROM staff_profiles a USING staff_profiles b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles (user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_profiles_user_id_key'
    ) THEN
        ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

INSERT INTO staff_profiles (
    user_id, agency_id, department, craft_role, skills, daily_capacity, daily_points, monthly_points, is_accepting_work, team_lead_id
) VALUES
-- Super Admin & Admins
((SELECT id FROM users WHERE email='admin@creo.agency'),       '00000000-0000-0000-0000-000000000001', 'executive',  'super_admin',      ARRAY['governance','finance','strategy','operations']::text[],                          8, 16, 200, true, NULL),
((SELECT id FROM users WHERE email='ops.admin@creo.agency'),   '00000000-0000-0000-0000-000000000001', 'operations', 'operations_admin',  ARRAY['workflow_dispatch','sla_monitoring','quality_control','client_relations']::text[], 8, 16, 200, true, NULL),
((SELECT id FROM users WHERE email='creative.admin@creo.agency'),'00000000-0000-0000-0000-000000000001', 'creative',   'creative_admin',   ARRAY['creative_direction','brand_strategy','art_direction','video_production']::text[],  8, 16, 200, true, NULL),

-- Pod Alpha (Pod A)
((SELECT id FROM users WHERE email='lead.alpha@creo.agency'),     '00000000-0000-0000-0000-000000000001', 'creative', 'team_lead',        ARRAY['creative_direction','brand_systems','sprint_planning']::text[],       4, 8, 100, true, NULL),
((SELECT id FROM users WHERE email='editor.alpha@creo.agency'),   '00000000-0000-0000-0000-000000000001', 'video',    'video_editor',     ARRAY['premiere_pro','after_effects','reels_editing','sound_design']::text[], 4, 8, 100, true, (SELECT id FROM users WHERE email='lead.alpha@creo.agency')),
((SELECT id FROM users WHERE email='designer.alpha@creo.agency'), '00000000-0000-0000-0000-000000000001', 'design',   'graphic_designer', ARRAY['figma','brand_guidelines','typography','social_banners']::text[],      4, 8, 100, true, (SELECT id FROM users WHERE email='lead.alpha@creo.agency')),

-- Pod Beta (Pod B)
((SELECT id FROM users WHERE email='lead.beta@creo.agency'),     '00000000-0000-0000-0000-000000000001', 'creative', 'team_lead',        ARRAY['campaign_strategy','creative_direction','growth_marketing']::text[],     4, 8, 100, true, NULL),
((SELECT id FROM users WHERE email='lead@creo.agency'),          '00000000-0000-0000-0000-000000000001', 'creative', 'team_lead',        ARRAY['campaign_strategy','creative_direction','growth_marketing']::text[],     4, 8, 100, true, NULL),
((SELECT id FROM users WHERE email='editor.beta@creo.agency'),   '00000000-0000-0000-0000-000000000001', 'video',    'video_editor',     ARRAY['davinci_resolve','capcut_mastery','9_16_reels','cinematics']::text[],     4, 8, 100, true, (SELECT id FROM users WHERE email='lead.beta@creo.agency')),
((SELECT id FROM users WHERE email='member@creo.agency'),        '00000000-0000-0000-0000-000000000001', 'video',    'video_editor',     ARRAY['davinci_resolve','capcut_mastery','9_16_reels','cinematics']::text[],     4, 8, 100, true, (SELECT id FROM users WHERE email='lead.beta@creo.agency')),
((SELECT id FROM users WHERE email='designer.beta@creo.agency'), '00000000-0000-0000-0000-000000000001', 'design',   'graphic_designer', ARRAY['carousel_design','posters','product_mockups','figma']::text[],            4, 8, 100, true, (SELECT id FROM users WHERE email='lead.beta@creo.agency')),

-- Pod Gamma (Pod C)
((SELECT id FROM users WHERE email='lead.gamma@creo.agency'),     '00000000-0000-0000-0000-000000000001', 'creative', 'team_lead',        ARRAY['art_direction','luxury_aesthetics','creative_direction']::text[],     4, 8, 100, true, NULL),
((SELECT id FROM users WHERE email='editor.gamma@creo.agency'),   '00000000-0000-0000-0000-000000000001', 'video',    'video_editor',     ARRAY['motion_graphics','short_form_editing','color_grading']::text[],       4, 8, 100, true, (SELECT id FROM users WHERE email='lead.gamma@creo.agency')),
((SELECT id FROM users WHERE email='designer.gamma@creo.agency'), '00000000-0000-0000-0000-000000000001', 'design',   'graphic_designer', ARRAY['modern_minimalism','illustrations','figma','social_banners']::text[],  4, 8, 100, true, (SELECT id FROM users WHERE email='lead.gamma@creo.agency'))
ON CONFLICT (user_id) DO UPDATE SET
    agency_id = EXCLUDED.agency_id,
    department = EXCLUDED.department,
    craft_role = EXCLUDED.craft_role,
    skills = EXCLUDED.skills,
    daily_capacity = EXCLUDED.daily_capacity,
    daily_points = EXCLUDED.daily_points,
    monthly_points = EXCLUDED.monthly_points,
    is_accepting_work = EXCLUDED.is_accepting_work,
    team_lead_id = EXCLUDED.team_lead_id;

-- -----------------------------------------------------------------------------
-- 5. CLIENT PROFILE (Ryze Mushroom Coffee)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT,
    instagram_username VARCHAR(255),
    brand_summary TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_profiles (user_id);

INSERT INTO client_profiles (
    user_id, company_name, instagram_username, brand_summary, timezone
) VALUES (
    (SELECT id FROM users WHERE email = 'client@creo.agency'),
    'Ryze Mushroom Coffee',
    'ryzemushroomcoffee',
    'Organic functional mushroom coffee for sustained morning energy, razor-sharp focus, and zero jitters.',
    'Asia/Kolkata'
)
ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    instagram_username = EXCLUDED.instagram_username,
    brand_summary = EXCLUDED.brand_summary;

-- -----------------------------------------------------------------------------
-- 6. REFRESH MATERIALIZED VIEW (IF EXISTS)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_exec_kpis') THEN
        REFRESH MATERIALIZED VIEW mv_exec_kpis;
    END IF;
END $$;