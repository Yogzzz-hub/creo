-- =============================================================================
-- CREO PLATFORM — POSTGRESQL PRODUCTION SEED DATA
-- =============================================================================
-- Database: PostgreSQL 15+ / 16+ / 17+ (Supabase compatible)
-- Description: Idempotent seed data for core plans, staff accounts, clients,
--              initial deliverables, kanban tasks, and support tickets.
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
-- 2. USERS (STAFF & CLIENTS)
-- Passwords below are hashed with bcrypt (Cost 12) for standard demo credentials:
-- 'CreoAdmin2026!' or 'password123'
-- -----------------------------------------------------------------------------
INSERT INTO users (
    id, auth_id, email, full_name, hashed_password, role, account_status, email_verified_at
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
    NOW()
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
    NOW()
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
    NOW()
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
    NOW()
),
-- 2.5 Active Retainer Client (Stage 5 — Astra Living)
(
    '00000000-0000-0000-0000-000000000005',
    'auth-client-astra-005',
    'client@brandflow.io',
    'Rohan Singhania',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'client',
    'active',
    NOW()
),
-- 2.6 Active Retainer Client (Stage 5 — Urban Bakes)
(
    '00000000-0000-0000-0000-000000000006',
    'auth-client-urban-006',
    'hello@urbanbakes.in',
    'Meera Krishnan',
    '$2b$12$e8Yp89/i61t6ZkPfxmQOqukgl9m61Q0K7jF08b2G9x89M0o/q4l2O',
    'client',
    'active',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status;

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
-- 4. CLIENT PROFILES & BRAND DNA
-- -----------------------------------------------------------------------------
INSERT INTO client_profiles (
    user_id, company_name, instagram_username, brand_summary,
    brand_dna, terms_accepted_at, terms_version, onboarding_completed_at
) VALUES
(
    '00000000-0000-0000-0000-000000000005',
    'Astra Living',
    'astraliving.home',
    'Minimalist Scandinavian interior aesthetics with natural sunlight and architectural negative space.',
    '{
        "primary_color": "#07192F",
        "accent_color": "#2B7BC4",
        "typography": "Outfit, Inter",
        "target_audience": "Urban homeowners and design enthusiasts aged 24-42",
        "tone": "Sophisticated, serene, and premium"
    }'::jsonb,
    NOW() - INTERVAL '30 days',
    'v1.0',
    NOW() - INTERVAL '28 days'
),
(
    '00000000-0000-0000-0000-000000000006',
    'Urban Bakes Artisan Group',
    'urbanbakes.in',
    'Handcrafted wild yeast sourdough, artisanal viennoiserie, and slow food culture.',
    '{
        "primary_color": "#451A03",
        "accent_color": "#D97706",
        "typography": "Playfair Display, Inter",
        "target_audience": "Culinary lovers and local neighborhood foodies",
        "tone": "Warm, tactile, and mouthwatering"
    }'::jsonb,
    NOW() - INTERVAL '15 days',
    'v1.0',
    NOW() - INTERVAL '14 days'
)
ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    instagram_username = EXCLUDED.instagram_username,
    brand_summary = EXCLUDED.brand_summary,
    brand_dna = EXCLUDED.brand_dna;

-- -----------------------------------------------------------------------------
-- 5. ACTIVE SUBSCRIPTIONS
-- -----------------------------------------------------------------------------
INSERT INTO subscriptions (
    id, client_id, plan_id, status, gateway, amount,
    current_period_start, current_period_end
) VALUES
(
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000020', -- Brand Accelerator (Growth)
    'active',
    'razorpay',
    50000.00,
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days'
),
(
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000010', -- Starter Growth
    'active',
    'razorpay',
    25000.00,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. USAGE COUNTERS (CURRENT MONTH)
-- -----------------------------------------------------------------------------
INSERT INTO usage_counters (
    id, client_id, period_start, period_end, kind, quota, used
) VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000005',
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE,
    'static_post',
    15,
    6
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000005',
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE,
    'reel',
    8,
    4
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000005',
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE,
    'story',
    20,
    11
)
ON CONFLICT (client_id, period_start, kind) DO UPDATE SET
    used = EXCLUDED.used,
    quota = EXCLUDED.quota;

-- -----------------------------------------------------------------------------
-- 7. KANBAN TASKS
-- -----------------------------------------------------------------------------
INSERT INTO tasks (
    id, client_id, assigned_to, deliverable_type, status, due_date, sla_due_at
) VALUES
(
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'reel',
    'in_production',
    CURRENT_DATE + INTERVAL '2 days',
    NOW() + INTERVAL '36 hours'
),
(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000004',
    'carousel',
    'internal_qa',
    CURRENT_DATE + INTERVAL '1 day',
    NOW() + INTERVAL '18 hours'
),
(
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'reel',
    'client_review',
    CURRENT_DATE + INTERVAL '3 days',
    NOW() + INTERVAL '48 hours'
),
(
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000004',
    'static_post',
    'ready_to_publish',
    CURRENT_DATE,
    NOW() + INTERVAL '6 hours'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. DELIVERABLES (PORTAL REVIEW & PRODUCTION CARDS)
-- -----------------------------------------------------------------------------
INSERT INTO deliverables (
    id, root_id, version, client_id, task_id, submitted_by,
    file_url, file_type, file_size_bytes, status, revision_round,
    approved_at, scheduled_at
) VALUES
(
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000201',
    1,
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000003',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1080&h=1920&fit=crop',
    'video/mp4',
    14500000,
    'pending_approval',
    1,
    NULL,
    NULL
),
(
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000202',
    1,
    '00000000-0000-0000-0000-000000000005',
    NULL,
    '00000000-0000-0000-0000-000000000004',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1080&h=1080&fit=crop',
    'image/jpeg',
    3200000,
    'approved',
    1,
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '1 day'
)
ON CONFLICT (root_id, version) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. CONTENT CALENDAR ENTRIES
-- -----------------------------------------------------------------------------
INSERT INTO content_calendar (
    id, client_id, deliverable_id, publish_date, scheduled_time, caption
) VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000202',
    CURRENT_DATE + INTERVAL '1 day',
    NOW() + INTERVAL '1 day',
    'Golden hour architectural styling. Crafted with organic materials for modern living. #MinimalistLiving #AstraHome'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. SUPPORT TICKETS
-- -----------------------------------------------------------------------------
INSERT INTO tickets (
    id, client_id, assigned_to, title, description, status, priority
) VALUES
(
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    'New Seasonal Autumn Drop Video Assets',
    'We are launching our cashmere autumn throw line on October 1st and would love to review initial script hooks and color grades.',
    'in_progress',
    'high'
)
ON CONFLICT DO NOTHING;

INSERT INTO ticket_messages (
    id, ticket_id, sender_id, message
) VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000005',
    'Please find our high-res product photo gallery in Drive. We are looking for high contrast warm neutral lighting.'
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000002',
    'Hi Rohan, Karthik and Ananya are already storyboarded. We will have the first draft reels in your Review Dock by Thursday!'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. REFRESH MATERIALIZED VIEW
-- -----------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW mv_exec_kpis;
