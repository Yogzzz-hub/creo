# 05 - Data Model and Infrastructure

## Database Schema

Total Models/Tables: 32

### Table: `refresh_tokens`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| user_id | UUID | False | False | users.id |
| token_hash | TEXT | False | False |  |
| family_id | UUID | False | False |  |
| used_at | DATETIME | True | False |  |
| revoked_at | DATETIME | True | False |  |
| user_agent | TEXT | True | False |  |
| ip | VARCHAR(45) | True | False |  |
| expires_at | DATETIME | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `idempotency_keys`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| key | VARCHAR(255) | False | True |  |
| user_id | UUID | False | False | users.id |
| endpoint | VARCHAR(255) | False | False |  |
| request_hash | VARCHAR(64) | False | False |  |
| status_code | INTEGER | True | False |  |
| response | JSONB | True | False |  |
| created_at | DATETIME | False | False |  |
| expires_at | DATETIME | False | False |  |


### Table: `plans`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| name | VARCHAR(50) | False | False |  |
| display_name | VARCHAR(100) | False | False |  |
| price_minor | BIGINT | False | False |  |
| currency | VARCHAR(3) | False | False |  |
| monthly_price | NUMERIC(10, 2) | False | False |  |
| poster_quota | INTEGER | False | False |  |
| reel_quota | INTEGER | False | False |  |
| story_quota | INTEGER | False | False |  |
| revision_rounds | INTEGER | False | False |  |
| has_dedicated_manager | BOOLEAN | False | False |  |
| highlights | JSONB | False | False |  |
| is_recommended | BOOLEAN | False | False |  |
| is_active | BOOLEAN | False | False |  |
| scarcity_slots | INTEGER | True | False |  |
| id | UUID | False | True |  |


### Table: `subscriptions`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| plan_id | UUID | False | False | plans.id |
| status | VARCHAR(10) | False | False |  |
| gateway | VARCHAR(8) | False | False |  |
| gateway_subscription_id | VARCHAR(255) | True | False |  |
| gateway_customer_id | VARCHAR(255) | True | False |  |
| amount | NUMERIC(10, 2) | False | False |  |
| current_period_start | DATETIME | False | False |  |
| current_period_end | DATETIME | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `payment_events`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| provider | VARCHAR(8) | False | False |  |
| provider_event_id | VARCHAR(255) | False | False |  |
| event_type | VARCHAR(100) | False | False |  |
| payload | JSONB | False | False |  |
| signature_valid | BOOLEAN | False | False |  |
| processed_at | DATETIME | True | False |  |
| processing_error | TEXT | True | False |  |
| received_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `usage_counters`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| period_start | DATE | False | False |  |
| period_end | DATE | False | False |  |
| kind | VARCHAR(11) | False | False |  |
| quota | INTEGER | False | False |  |
| used | INTEGER | False | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `platform_subscriptions`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | False | False | agencies.id |
| status | VARCHAR(10) | False | False |  |
| gateway | VARCHAR(8) | False | False |  |
| gateway_subscription_id | VARCHAR(255) | True | False |  |
| gateway_customer_id | VARCHAR(255) | True | False |  |
| amount | NUMERIC(10, 2) | False | False |  |
| current_period_start | DATETIME | False | False |  |
| current_period_end | DATETIME | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `platform_payment_events`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| provider | VARCHAR(8) | False | False |  |
| provider_event_id | VARCHAR(255) | False | False |  |
| event_type | VARCHAR(100) | False | False |  |
| payload | JSONB | False | False |  |
| signature_valid | BOOLEAN | False | False |  |
| processed_at | DATETIME | True | False |  |
| processing_error | TEXT | True | False |  |
| received_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `plan_negotiations`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | True | False | users.id |
| client_name | VARCHAR(255) | False | False |  |
| client_email | VARCHAR(255) | False | False |  |
| target_topic | VARCHAR(255) | False | False |  |
| proposed_offer | TEXT | True | False |  |
| phone_number | VARCHAR(50) | False | False |  |
| preferred_time | VARCHAR(255) | False | False |  |
| notes | TEXT | True | False |  |
| status | VARCHAR(50) | False | False |  |
| counter_price | BIGINT | True | False |  |
| counter_note | TEXT | True | False |  |
| decline_reason | TEXT | True | False |  |
| reviewed_by | UUID | True | False | users.id |
| reviewed_at | DATETIME | True | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `client_cycles`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| cycle_number | INTEGER | False | False |  |
| plan_id | UUID | False | False | plans.id |
| runway_start | DATE | True | False |  |
| start_date | DATE | False | False |  |
| end_date | DATE | False | False |  |
| status | VARCHAR(50) | False | False |  |
| quota_snapshot | JSONB | False | False |  |
| policy_snapshot | JSONB | False | False |  |
| approved_at | DATETIME | True | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `shoot_days`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| cycle_id | UUID | False | False | client_cycles.id |
| client_id | UUID | False | False | users.id |
| sequence | INTEGER | False | False |  |
| scheduled_at | DATETIME | False | False |  |
| duration_min | INTEGER | False | False |  |
| location | TEXT | True | False |  |
| status | VARCHAR(50) | False | False |  |
| proposed_by | UUID | True | False | users.id |
| requested_at | DATETIME | True | False |  |
| requested_for | DATETIME | True | False |  |
| request_reason | TEXT | True | False |  |
| decided_by | UUID | True | False | users.id |
| decided_at | DATETIME | True | False |  |
| decision_note | TEXT | True | False |  |
| footage_received_at | DATETIME | True | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `calendar_policies`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | True | users.id |
| niche | TEXT | False | False |  |
| timezone | TEXT | False | False |  |
| policy | JSONB | False | False |  |
| source | VARCHAR(50) | False | False |  |
| updated_by | UUID | True | False | users.id |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `calendar_blackouts`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | True | False | users.id |
| blackout_on | DATE | False | False |  |
| reason | TEXT | False | False |  |
| created_by | UUID | True | False | users.id |
| id | UUID | False | True |  |


### Table: `leave_requests`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| user_id | UUID | False | False | users.id |
| start_date | DATE | False | False |  |
| end_date | DATE | False | False |  |
| reason | TEXT | True | False |  |
| status | VARCHAR(50) | False | False |  |
| approved_by | UUID | True | False | users.id |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `announcements`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| author_id | UUID | False | False | users.id |
| title | VARCHAR(255) | False | False |  |
| content | TEXT | False | False |  |
| type | VARCHAR(50) | False | False |  |
| target_departments | JSONB | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `audit_log`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| id | BIGINT | False | True |  |
| agency_id | UUID | True | False | agencies.id |
| actor_id | UUID | True | False | users.id |
| actor_role | VARCHAR(18) | True | False |  |
| entity | VARCHAR(100) | False | False |  |
| entity_id | UUID | False | False |  |
| action | VARCHAR(100) | False | False |  |
| from_value | JSONB | True | False |  |
| to_value | JSONB | True | False |  |
| request_id | VARCHAR(255) | True | False |  |
| created_at | DATETIME | False | False |  |


### Table: `notifications`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| user_id | UUID | False | False | users.id |
| title | VARCHAR(255) | False | False |  |
| message | TEXT | False | False |  |
| link | TEXT | True | False |  |
| is_read | BOOLEAN | False | False |  |
| sent_at | DATETIME | True | False |  |
| failed_reason | TEXT | True | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `questionnaires`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| user_id | UUID | False | False | users.id |
| answers | JSONB | False | False |  |
| section_a | JSONB | False | False |  |
| section_b | JSONB | False | False |  |
| section_c | JSONB | False | False |  |
| section_d | JSONB | False | False |  |
| section_e | JSONB | False | False |  |
| section_f | JSONB | False | False |  |
| section_g | JSONB | False | False |  |
| core_completed_at | DATETIME | True | False |  |
| extended_completed_at | DATETIME | True | False |  |
| version | INTEGER | False | False |  |
| ai_summary_line | TEXT | True | False |  |
| submitted_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `tickets`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| assigned_to | UUID | True | False | users.id |
| deliverable_id | UUID | True | False | deliverables.id |
| title | VARCHAR(255) | False | False |  |
| description | TEXT | False | False |  |
| status | VARCHAR(17) | False | False |  |
| priority | VARCHAR(6) | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `ticket_messages`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| ticket_id | UUID | False | False | tickets.id |
| sender_id | UUID | False | False | users.id |
| message | TEXT | False | False |  |
| attachments | JSONB | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `agencies`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| name | TEXT | False | False |  |
| slug | VARCHAR(100) | False | False |  |
| custom_domain | VARCHAR(255) | True | False |  |
| status | VARCHAR(20) | False | False |  |
| plan_tier | VARCHAR(30) | False | False |  |
| max_clients | INTEGER | False | False |  |
| max_staff | INTEGER | False | False |  |
| branding | JSONB | False | False |  |
| timezone | VARCHAR(50) | False | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `teams`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | False | False | agencies.id |
| name | VARCHAR(150) | False | False |  |
| lead_id | UUID | True | False | users.id |
| is_active | BOOLEAN | False | False |  |
| id | UUID | False | True |  |


### Table: `team_members`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| team_id | UUID | False | True | teams.id |
| user_id | UUID | False | True | users.id |
| is_home | BOOLEAN | False | False |  |


### Table: `users`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| owning_team_id | UUID | True | False | teams.id |
| auth_id | VARCHAR(255) | False | False |  |
| email | VARCHAR(255) | False | False |  |
| full_name | VARCHAR(255) | True | False |  |
| hashed_password | VARCHAR(255) | True | False |  |
| role | VARCHAR(18) | False | False |  |
| account_status | VARCHAR(20) | False | False |  |
| token_version | INTEGER | False | False |  |
| email_verified_at | DATETIME | True | False |  |
| must_reset_password | BOOLEAN | False | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `client_profiles`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| user_id | UUID | False | True | users.id |
| company_name | TEXT | True | False |  |
| instagram_username | VARCHAR(255) | True | False |  |
| instagram_user_id | VARCHAR(255) | True | False |  |
| ig_token_encrypted | BLOB | True | False |  |
| ig_token_expires_at | DATETIME | True | False |  |
| brand_summary | TEXT | True | False |  |
| brand_dna | JSONB | False | False |  |
| brand_dna_version | INTEGER | False | False |  |
| brand_dna_source | VARCHAR(20) | False | False |  |
| timezone | VARCHAR(50) | False | False |  |
| calendar_template | JSONB | True | False |  |
| terms_accepted_at | DATETIME | True | False |  |
| terms_version | VARCHAR(50) | True | False |  |
| onboarding_completed_at | DATETIME | True | False |  |
| onboarding_deadline | DATETIME | True | False |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `staff_profiles`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| user_id | UUID | False | True | users.id |
| agency_id | UUID | True | False | agencies.id |
| team_lead_id | UUID | True | False | users.id |
| department | VARCHAR(50) | False | False |  |
| craft_role | VARCHAR(30) | False | False |  |
| monthly_points | INTEGER | False | False |  |
| daily_capacity | INTEGER | False | False |  |
| daily_points | INTEGER | False | False |  |
| last_assigned_at | DATETIME | True | False |  |
| skills | ARRAY | False | False |  |
| sub_skills | ARRAY | False | False |  |
| is_accepting_work | BOOLEAN | False | False |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `client_role_requirements`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | True | users.id |
| craft_role | VARCHAR(30) | False | True |  |


### Table: `tasks`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| assigned_to | UUID | True | False | users.id |
| deliverable_type | VARCHAR(11) | False | False |  |
| status | VARCHAR(16) | False | False |  |
| due_date | DATE | True | False |  |
| sla_due_at | DATETIME | True | False |  |
| last_sla_notified_at | DATETIME | True | False |  |
| effort_points | INTEGER | False | False |  |
| is_revision | BOOLEAN | False | False |  |
| parent_assignee_id | UUID | True | False | users.id |
| preferred_sub_skill | VARCHAR(50) | True | False |  |
| concept_status | VARCHAR(30) | False | False |  |
| blueprint | JSONB | True | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `deliverables`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| root_id | UUID | False | False |  |
| version | INTEGER | False | False |  |
| client_id | UUID | False | False | users.id |
| task_id | UUID | True | False | tasks.id |
| submitted_by | UUID | True | False | users.id |
| file_url | TEXT | False | False |  |
| file_type | VARCHAR(50) | False | False |  |
| file_size_bytes | BIGINT | False | False |  |
| status | VARCHAR(18) | False | False |  |
| revision_round | INTEGER | False | False |  |
| revisions_count | INTEGER | False | False |  |
| parent_deliverable_id | UUID | True | False | deliverables.id |
| rejection_comment | TEXT | True | False |  |
| approved_at | DATETIME | True | False |  |
| rejected_at | DATETIME | True | False |  |
| scheduled_at | DATETIME | True | False |  |
| ig_creation_id | VARCHAR(255) | True | False |  |
| ig_media_id | VARCHAR(255) | True | False |  |
| ig_permalink | TEXT | True | False |  |
| publish_attempts | INTEGER | False | False |  |
| publish_error | TEXT | True | False |  |
| id | UUID | False | True |  |
| created_at | DATETIME | False | False |  |
| updated_at | DATETIME | False | False |  |


### Table: `content_calendar`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| deliverable_id | UUID | True | False | deliverables.id |
| publish_date | DATE | False | False |  |
| scheduled_time | DATETIME | True | False |  |
| caption | TEXT | True | False |  |
| status | VARCHAR(20) | False | False |  |
| is_locked | BOOLEAN | False | False |  |
| slot_kind | VARCHAR(50) | True | False |  |
| slot_strategy | VARCHAR(20) | False | False |  |
| flex_deadline | DATE | True | False |  |
| concept_status | VARCHAR(30) | False | False |  |
| blueprint | JSONB | True | False |  |
| selected_hook | JSONB | True | False |  |
| cycle_id | UUID | True | False | client_cycles.id |
| shoot_day_id | UUID | True | False | shoot_days.id |
| publish_at | DATETIME | True | False |  |
| daypart | VARCHAR(50) | True | False |  |
| phase | VARCHAR(10) | False | False |  |
| locked_reason | TEXT | True | False |  |
| pillar | TEXT | True | False |  |
| funnel_stage | VARCHAR(20) | False | False |  |
| slot_source | VARCHAR(20) | False | False |  |
| source_slot_id | UUID | True | False | content_calendar.id |
| story_role | VARCHAR(20) | True | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `client_assignments`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| user_id | UUID | False | False | users.id |
| role | VARCHAR(50) | False | False |  |
| craft_role | VARCHAR(30) | False | False |  |
| points_committed | INTEGER | False | False |  |
| from_team_id | UUID | True | False | teams.id |
| is_primary | BOOLEAN | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |


### Table: `direct_messages`

| Column | Type | Nullable | Primary Key | Foreign Key |
|---|---|---|---|---|
| agency_id | UUID | True | False | agencies.id |
| client_id | UUID | False | False | users.id |
| specialist_id | UUID | False | False | users.id |
| sender_id | UUID | False | False | users.id |
| message | TEXT | False | False |  |
| thread_type | VARCHAR(50) | False | False |  |
| created_at | DATETIME | False | False |  |
| id | UUID | False | True |  |

