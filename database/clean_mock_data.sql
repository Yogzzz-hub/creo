-- =============================================================================
-- CREO PLATFORM — PURGE ALL MOCK & DEMO DATA
-- =============================================================================
-- Deletes all mock client assignments, deliverables, tasks, content calendars,
-- tickets, ticket messages, announcements, audit logs, and test staff users,
-- retaining ONLY the primary Super Admin account (admin@creo.agency) and plans.
-- =============================================================================

BEGIN;

-- 1. Detach foreign key cross-references to avoid constraint order violations
UPDATE deliverables SET task_id = NULL, parent_deliverable_id = NULL, submitted_by = NULL WHERE task_id IS NOT NULL OR parent_deliverable_id IS NOT NULL OR submitted_by IS NOT NULL;
UPDATE tickets SET deliverable_id = NULL, assigned_to = NULL WHERE deliverable_id IS NOT NULL OR assigned_to IS NOT NULL;
UPDATE content_calendar SET deliverable_id = NULL WHERE deliverable_id IS NOT NULL;
UPDATE tasks SET assigned_to = NULL, parent_assignee_id = NULL;

-- 2. Clear operational data in reverse dependency order
DELETE FROM ticket_messages;
DELETE FROM tickets;
DELETE FROM content_calendar;
DELETE FROM deliverables;
DELETE FROM tasks;
DELETE FROM client_assignments;
DELETE FROM client_cycles;
DELETE FROM shoot_days;
DELETE FROM questionnaires;
DELETE FROM subscriptions;
DELETE FROM usage_counters;
DELETE FROM leave_requests;
DELETE FROM announcements;

-- 3. Clear mock staff profiles (retaining 1 Super Admin, 2 Admins, and 3 Pods)
DELETE FROM staff_profiles 
WHERE user_id NOT IN (
    SELECT id FROM users WHERE email IN (
        'admin@creo.agency',
        'ops.admin@creo.agency',
        'creative.admin@creo.agency',
        'lead.alpha@creo.agency',
        'editor.alpha@creo.agency',
        'designer.alpha@creo.agency',
        'lead.beta@creo.agency',
        'editor.beta@creo.agency',
        'designer.beta@creo.agency',
        'lead.gamma@creo.agency',
        'editor.gamma@creo.agency',
        'designer.gamma@creo.agency'
    )
);

-- 4. Clear all users EXCEPT 1 Super Admin, 2 Admins, and the 3 Pods (12 total accounts)
DELETE FROM users 
WHERE email NOT IN (
    'admin@creo.agency',
    'ops.admin@creo.agency',
    'creative.admin@creo.agency',
    'lead.alpha@creo.agency',
    'editor.alpha@creo.agency',
    'designer.alpha@creo.agency',
    'lead.beta@creo.agency',
    'editor.beta@creo.agency',
    'designer.beta@creo.agency',
    'lead.gamma@creo.agency',
    'editor.gamma@creo.agency',
    'designer.gamma@creo.agency'
);

-- Optional: Synchronize Supabase auth.users if running in Supabase SQL editor with service_role
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN 
        DELETE FROM auth.users 
        WHERE email NOT IN (
            'admin@creo.agency',
            'ops.admin@creo.agency',
            'creative.admin@creo.agency',
            'lead.alpha@creo.agency',
            'editor.alpha@creo.agency',
            'designer.alpha@creo.agency',
            'lead.beta@creo.agency',
            'editor.beta@creo.agency',
            'designer.beta@creo.agency',
            'lead.gamma@creo.agency',
            'editor.gamma@creo.agency',
            'designer.gamma@creo.agency'
        );
    END IF; 
END $$;

-- 5. Refresh executive KPIs view to reflect updated stats (if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_exec_kpis') THEN 
        REFRESH MATERIALIZED VIEW mv_exec_kpis; 
    END IF; 
END $$;

COMMIT;
