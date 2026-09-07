-- ============================================================================
-- CREO DIGITAL MARKETING PLATFORM - SEED & DEMO DATA
-- ============================================================================

-- 1. SUBSCRIPTION PLANS
INSERT INTO plans (id, name, display_name, price_minor, currency, monthly_price, poster_quota, reel_quota, story_quota, revision_rounds, has_dedicated_manager, highlights, is_recommended, is_active)
VALUES
('starter', 'starter', 'Starter Growth', 2500000, 'INR', 25000.00, 8, 4, 10, 1, false,
 '["8 Static brand posters (1:1 & 4:5)", "4 High-impact 9:16 mobile reels", "10 Story creatives with engagement stickers", "1 Round of creative revisions", "Instagram auto-scheduling & dispatch", "Live analytics dashboard access"]'::jsonb, false, true),

('growth', 'growth', 'Brand Accelerator', 5000000, 'INR', 50000.00, 15, 8, 20, 2, true,
 '["15 Static brand posters (multi-format)", "8 Cinematic 9:16 reels with audio sync", "20 Interactive story creatives", "2 Rounds of creative revisions", "Dedicated creative director & copywriter", "Instagram & Facebook cross-publishing", "Weekly performance reviews & hashtag matrix"]'::jsonb, true, true),

('pro', 'pro', 'Enterprise Domination', 9500000, 'INR', 95000.00, 30, 16, 40, 3, true,
 '["30 Static brand posters & custom carousel decks", "16 High-production 4K reels & UGC composites", "40 Story creatives & interactive poll sets", "3 Rounds of creative revisions", "Dedicated Senior Account Director & VFX lead", "Multichannel distribution & ad asset prep", "On-demand custom revisions & priority 24h turnaround"]'::jsonb, false, true)
ON CONFLICT (id) DO NOTHING;

-- 2. USERS (Super Admin, Team Lead, Editors, Clients)
-- Password for demo accounts: password123 (bcrypt hash: $2b$12$K8K3Kz1G4H... or plain fallback handled by auth)
INSERT INTO users (id, auth_id, email, password_hash, full_name, role, account_status, email_verified_at)
VALUES
('00000000-0000-0000-0000-000000000000', 'auth_super_admin', 'admin@creo.agency', '$2b$12$e8x5a3R9K/4aKj0O8v1aK.W7hU.Gq6E1YjX9Qv9J8e2Xz7Y0aB2a2', 'Ashok Kumar (CEO)', 'super_admin', 'active', NOW()),
('00000000-0000-0000-0000-000000000002', 'auth_team_lead', 'lead@creo.agency', '$2b$12$e8x5a3R9K/4aKj0O8v1aK.W7hU.Gq6E1YjX9Qv9J8e2Xz7Y0aB2a2', 'Kavya Sharma (Lead)', 'team_lead', 'active', NOW()),
('00000000-0000-0000-0000-000000000003', 'auth_editor', 'editor@creo.agency', '$2b$12$e8x5a3R9K/4aKj0O8v1aK.W7hU.Gq6E1YjX9Qv9J8e2Xz7Y0aB2a2', 'Pranav Rajesh (Video)', 'editor', 'active', NOW()),
('00000000-0000-0000-0000-000000000004', 'auth_designer', 'designer@creo.agency', '$2b$12$e8x5a3R9K/4aKj0O8v1aK.W7hU.Gq6E1YjX9Qv9J8e2Xz7Y0aB2a2', 'Rishi Varma (Design)', 'designer', 'active', NOW()),
('00000000-0000-0000-0000-000000000001', 'auth_client_1', 'client@creo.agency', '$2b$12$e8x5a3R9K/4aKj0O8v1aK.W7hU.Gq6E1YjX9Qv9J8e2Xz7Y0aB2a2', 'Vikram Malhotra', 'client', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. CLIENT PROFILE (Astra Living)
INSERT INTO client_profiles (user_id, company_name, instagram_username, brand_dna, brand_summary, onboarding_stage, onboarding_completed_at)
VALUES
('00000000-0000-0000-0000-000000000001', 'Astra Living', 'astraliving.in',
 '{"colors": ["#07192F", "#2B7BC4", "#FFFFFF"], "tone": "Minimalist, Premium, Warm Scandinavian", "target_audience": "Urban homeowners, interior enthusiasts, 25-45"}'::jsonb,
 'Premium modern interior studio creating functional handcrafted Scandinavian decor and living essentials.',
 5, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- 4. ACTIVE SUBSCRIPTION (Astra Living -> Brand Accelerator)
INSERT INTO subscriptions (id, client_id, plan_id, status, provider, current_period_start, current_period_end)
VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'growth', 'active', 'razorpay', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- 5. TEAM MEMBERS CAPACITIES
INSERT INTO team_members (user_id, team_lead_id, department, daily_capacity, active_load, skills, is_accepting_tasks)
VALUES
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'video', 5, 2, '["Reels", "Macro 4K", "Audio Sync"]'::jsonb, true),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'design', 6, 3, '["Posters", "Carousels", "Brand DNA"]'::jsonb, true)
ON CONFLICT (user_id) DO NOTHING;

-- 6. TASKS (Production Pipeline)
INSERT INTO tasks (id, client_id, assigned_to, title, format, status, priority, sla_due_at, notes)
VALUES
('22222222-2222-2222-2222-222222222201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
 'Astra Living · Golden Hour Minimalist Drop', 'reel', 'ready_to_publish', 'high', NOW() + INTERVAL '2 days', 'Cinematic morning lighting, ambient music.'),

('22222222-2222-2222-2222-222222222202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
 'Nordic Ceramic Mug Showcase Carousel', 'carousel', 'internal_qa', 'medium', NOW() + INTERVAL '1 day', '8-slide carousel with swipe prompts.')
ON CONFLICT (id) DO NOTHING;

-- 7. DELIVERABLES (Ready for Review & Published)
INSERT INTO deliverables (id, client_id, task_id, title, type, status, file_url, caption, scheduled_at)
VALUES
('33333333-3333-3333-3333-333333333301', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222201',
 'Golden Hour Minimalist Living Reel', 'reel', 'pending_approval', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
 'Transforming everyday spaces into serene retreats. ✨ Which corner is your favorite? #AstraLiving #HomeDecor', NOW() + INTERVAL '2 days'),

('33333333-3333-3333-3333-333333333302', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222202',
 'Architectural Teak Coffee Table Poster', 'static_post', 'approved', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
 'Crafted from sustainable teak wood. Hand-sanded to organic perfection.', NOW() + INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- 8. SYSTEM ANNOUNCEMENTS
INSERT INTO announcements (id, title, content, is_broadcast)
VALUES
('44444444-4444-4444-4444-444444444401', 'Meta API v21.0 Upgrade Complete',
 'Automated Instagram Graph API publishing is running with 99.98% dispatch reliability.', true)
ON CONFLICT (id) DO NOTHING;
