-- =============================================================================
-- CREO PLATFORM — PURGE ALL MOCK & DEMO DATA
-- =============================================================================
-- Deletes all mock client assignments, deliverables, tasks, content calendars,
-- tickets, ticket messages, announcements, audit logs, and test staff users,
-- retaining ONLY the primary Super Admin account (admin@creo.agency) and plans.
-- =============================================================================

BEGIN;

-- 1. Clear operational deliverables, tasks, tickets, and calendar events
DELETE FROM ticket_messages;
DELETE FROM tickets;
DELETE FROM content_calendar;
DELETE FROM tasks;
DELETE FROM deliverables;
DELETE FROM client_assignments;
DELETE FROM client_cycles;
DELETE FROM shoot_days;
DELETE FROM questionnaires;
DELETE FROM subscriptions;
DELETE FROM usage_counters;
DELETE FROM leave_requests;
DELETE FROM announcements;

-- 2. Clear mock staff profiles (retaining real super admin if any)
DELETE FROM staff_profiles WHERE user_id != '00000000-0000-0000-0000-000000000001';

-- 3. Clear all mock users except the primary Executive Super Admin
DELETE FROM users WHERE email != 'admin@creo.agency';

-- 4. Reset sequence/counters and refresh executive KPIs view
REFRESH MATERIALIZED VIEW mv_exec_kpis;

COMMIT;
