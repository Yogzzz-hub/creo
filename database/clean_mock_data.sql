-- =============================================================================
-- CREO PLATFORM — PURGE ALL MOCK & DEMO DATA
-- =============================================================================
-- Deletes all mock client assignments, deliverables, tasks, content calendars,
-- tickets, ticket messages, announcements, audit logs, and test staff users,
-- retaining ONLY the primary Super Admin account (admin@creo.agency) and plans.
-- =============================================================================

BEGIN;

-- 1. Detach foreign key cross-references to avoid constraint order violations
UPDATE deliverables SET task_id = NULL, parent_deliverable_id = NULL WHERE task_id IS NOT NULL OR parent_deliverable_id IS NOT NULL;
UPDATE tickets SET deliverable_id = NULL WHERE deliverable_id IS NOT NULL;
UPDATE content_calendar SET deliverable_id = NULL WHERE deliverable_id IS NOT NULL;

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

-- 3. Clear mock staff profiles (retaining real super admin if any)
DELETE FROM staff_profiles WHERE user_id != '00000000-0000-0000-0000-000000000001';

-- 4. Clear all mock users except the primary Executive Super Admin
DELETE FROM users WHERE email != 'admin@creo.agency';

-- 5. Refresh executive KPIs view to reflect 0 mock clients / 0 mock MRR
REFRESH MATERIALIZED VIEW mv_exec_kpis;

COMMIT;
