# Creo Data Contracts — Source of Truth

> Auto-generated from backend models, Pydantic schemas, and API routers.
> Frontend MUST use these exact field names when consuming API responses.

---

## Enums

| Enum | DB Values |
|------|-----------|
| `UserRole` | `client`, `team_member`, `team_lead`, `sales`, `admin`, `investor_relations`, `super_admin` |
| `AccountStatus` | `pending_verification`, `pending_payment`, `active`, `lapsed`, `suspended`, `deleted` |
| `PlanName` | `starter`, `growth`, `pro` |
| `DeliverableType` | `poster`, `reel`, `story` |
| `DeliverableStatus` | `pending_approval`, `approved`, `rejected`, `revision_in_progress`, `revised_pending_approval` |
| `TaskStatus` | `pending`, `in_progress`, `submitted`, `approved`, `revision`, `overdue`, `assignment_requested` |
| `TicketType` | `deliverable_revision`, `general_support`, `billing_issue`, `content_brief_update` |
| `TicketStatus` | `open`, `in_progress`, `awaiting_client`, `resolved`, `escalated` |
| `Department` | `graphics`, `video`, `content_writing`, `social_media`, `sales`, `investor_relations`, `admin`, `tech` |
| `PaymentGateway` | `razorpay`, `stripe` |
| `CalendarEntryStatus` | `draft`, `scheduled`, `in_progress`, `ready_for_review`, `approved`, `rejected` |
| `LeaveStatus` | `pending`, `approved`, `rejected` |
| `AddonStatus` | `pending`, `approved`, `rejected`, `completed` |

---

## Table: `users`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `auth_id` | UUID | No |
| `email` | Text | No |
| `phone` | Text | Yes |
| `full_name` | Text | No |
| `business_name` | Text | Yes |
| `role` | UserRole | No |
| `account_status` | AccountStatus | No |
| `plan_name` | PlanName | Yes |
| `instagram_access_token` | Text | Yes |
| `instagram_user_id` | Text | Yes |
| `razorpay_customer_id` | Text | Yes |
| `stripe_customer_id` | Text | Yes |
| `two_fa_enabled` | Boolean | No |
| `deleted_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `plans`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `name` | PlanName | No |
| `display_name` | Text | No |
| `monthly_price` | Numeric(10,2) | No |
| `poster_quota` | Integer | No |
| `reel_quota` | Integer | No |
| `story_quota` | Integer | No |
| `revision_rounds` | Integer | No |
| `has_dedicated_manager` | Boolean | No |
| `is_active` | Boolean | No |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `subscriptions`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `plan_id` | UUID | No |
| `status` | Text | No |
| `gateway` | PaymentGateway | No |
| `gateway_subscription_id` | Text | No |
| `gateway_customer_id` | Text | No |
| `current_period_start` | DateTime(tz) | No |
| `current_period_end` | DateTime(tz) | No |
| `cancelled_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `tasks`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `assigned_to` | UUID | Yes |
| `assigned_by` | UUID | Yes |
| `deliverable_type` | DeliverableType | No |
| `content_brief` | Text | Yes |
| `status` | TaskStatus | No |
| `priority` | Integer | No |
| `is_addon` | Boolean | No |
| `addon_id` | UUID | Yes |
| `calendar_entry_id` | UUID | Yes |
| `assignment_date` | Date | Yes |
| `due_date` | Date | Yes |
| `submitted_at` | DateTime(tz) | Yes |
| `requested_by` | UUID | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `deliverables`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `task_id` | UUID | No |
| `client_id` | UUID | No |
| `submitted_by` | UUID | No |
| `file_url` | Text | No |
| `file_type` | Text | No |
| `file_size_bytes` | BigInteger | No |
| `status` | DeliverableStatus | No |
| `revision_round` | Integer | No |
| `parent_deliverable_id` | UUID | Yes |
| `approved_at` | DateTime(tz) | Yes |
| `rejected_at` | DateTime(tz) | Yes |
| `instagram_published_at` | DateTime(tz) | Yes |
| `instagram_post_id` | Text | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `tickets`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `ticket_type` | TicketType | No |
| `subject` | Text | No |
| `description` | Text | No |
| `status` | TicketStatus | No |
| `assigned_to` | UUID | Yes |
| `created_at` | DateTime(tz) | No |
| `resolved_at` | DateTime(tz) | Yes |

---

## Table: `ticket_messages`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `ticket_id` | UUID | No |
| `sender_id` | UUID | No |
| `message_text` | Text | No |
| `file_url` | Text | Yes |
| `created_at` | DateTime(tz) | No |

---

## Table: `content_calendar`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `content_plan_id` | UUID | Yes |
| `scheduled_date` | Date | No |
| `deliverable_type` | DeliverableType | No |
| `content_topic` | Text | Yes |
| `status` | CalendarEntryStatus | No |
| `linked_task_id` | UUID | Yes |
| `linked_deliverable_id` | UUID | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `leave_requests`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `team_member_id` | UUID | No |
| `start_date` | Date | No |
| `end_date` | Date | No |
| `reason` | Text | No |
| `status` | LeaveStatus | No |
| `approved_by` | UUID | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `escalations`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `task_id` | UUID | No |
| `client_id` | UUID | No |
| `assigned_to` | UUID | Yes |
| `severity` | Integer | No |
| `reason` | Text | No |
| `status` | Text | No |
| `resolution_notes` | Text | Yes |
| `resolved_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `notifications`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `type` | Text | No |
| `title` | Text | No |
| `message` | Text | No |
| `is_read` | Boolean | No |
| `created_at` | DateTime(tz) | No |

---

## Table: `announcements`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `author_id` | UUID | No |
| `title` | Text | No |
| `content` | Text | No |
| `type` | Text | No |
| `target_departments` | ARRAY(Text) | Yes |
| `created_at` | DateTime(tz) | No |

---

## Table: `addons`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `deliverable_type` | DeliverableType | No |
| `quantity` | Integer | No |
| `unit_price` | Numeric(10,2) | No |
| `total_price` | Numeric(10,2) | No |
| `status` | AddonStatus | No |
| `gateway` | PaymentGateway | Yes |
| `payment_id` | Text | Yes |
| `created_at` | DateTime(tz) | No |

---

## Table: `addon_pricing`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `deliverable_type` | DeliverableType | No |
| `unit_price` | Numeric(10,2) | No |
| `is_active` | Boolean | No |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `team_members`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `department` | Department | No |
| `daily_cap_posters` | Integer | No |
| `daily_cap_reels` | Integer | No |
| `daily_cap_stories` | Integer | No |
| `is_active` | Boolean | No |
| `joined_at` | Date | No |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `questionnaires`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `industry` | Text | No |
| `business_description` | Text | No |
| `target_audience` | JSONB | No |
| `social_handles` | JSONB | No |
| `current_posting_frequency` | Text | Yes |
| `content_what_works` | Text | Yes |
| `content_what_doesnt` | Text | Yes |
| `primary_goal` | Text | No |
| `brand_tone` | ARRAY(Text) | No |
| `competitor_refs` | ARRAY(Text) | Yes |
| `topics_to_avoid` | Text | Yes |
| `style_references` | ARRAY(Text) | Yes |
| `ai_analysis` | JSONB | Yes |
| `ai_summary_line` | Text | Yes |
| `submitted_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `custom_pricing`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `user_id` | UUID | No |
| `plan_id` | UUID | No |
| `custom_price` | Numeric(10,2) | No |
| `approved_by` | UUID | Yes |
| `valid_from` | Date | Yes |
| `valid_until` | Date | Yes |
| `status` | CustomPricingStatus | No |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `platform_settings`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | Text | No (PK, default="default") |
| `sla_delivery_days` | Integer | No |
| `sla_revision_hours` | Integer | No |
| `updated_at` | DateTime(tz) | Yes |

---

## API Response Contracts

### GET /api/v1/portal/dashboard → `DashboardResponse`
```
{ pending_deliverable_count: int, open_ticket_count: int, ai_summary_line: str|null, onboarding_stage: int }
```

### GET /api/v1/deliverables → `list[DeliverableResponse]`
```
{ id, task_id, client_id, submitted_by, file_url, file_type, file_size_bytes, status, revision_round, parent_deliverable_id, approved_at, rejected_at, instagram_published_at, instagram_post_id, created_at, updated_at }
```

### GET /api/v1/payments/history → `list[PaymentHistoryResponse]`
```
{ id, plan_id, status, gateway, gateway_subscription_id, gateway_customer_id, current_period_start, current_period_end, cancelled_at, created_at, updated_at }
```

### GET /api/v1/tickets → `list[TicketOut]`
```
{ id, user_id, ticket_type, subject, description, status, assigned_to, created_at, resolved_at }
```

### GET /api/v1/tickets/{id}/messages → `list[TicketMessageOut]`
```
{ id, ticket_id, sender_id, message_text, file_url, created_at }
```

### GET /api/v1/calendar → `list[CalendarEntryResponse]`
```
{ id, client_id, content_plan_id, scheduled_date, deliverable_type, content_topic, status, linked_task_id, linked_deliverable_id, created_at, updated_at }
```

### GET /api/v1/addons/pricing → `list[AddonPricingResponse]`
```
{ id, deliverable_type, unit_price, is_active }
```

### GET /api/v1/dashboard/team → `TeamDashboardResponse`
```
{ daily_metrics: { posters_completed, posters_cap, reels_completed, reels_cap, stories_completed, stories_cap }, active_tasks_count, overdue_tasks_count, pending_leave_requests }
```

### GET /api/v1/tasks → `list[TaskResponse]`
```
{ id, client_id, client: { id, full_name, business_name, plan_name }|null, assigned_to, assigned_by, deliverable_type, status, priority, is_addon, assignment_date, due_date, submitted_at, created_at, updated_at }
```

### GET /api/v1/tasks/{id} → `TaskDetailResponse`
```
{ ...TaskResponse, content_brief, ai_analysis_excerpt }
```

### GET /api/v1/team/overview → `TeamOverviewResponse`
```
{ members: [{ team_member_id, name, role, active_tasks, overdue_tasks, today_completed, today_cap }] }
```

### GET /api/v1/calendar/team → `list[TeamCalendarEntryResponse]`
```
{ id, scheduled_date, display_date, deliverable_type, client_name, status, linked_task_id }
```

### GET /api/v1/leave → `list[LeaveRequestOut]`
```
{ id, team_member_id, start_date, end_date, reason, status, approved_by, created_at, updated_at }
```

### GET /api/v1/sales/clients → `list[SalesClientResponse]`
```
{ user_id, full_name, business_name, plan_name, account_status, created_at }
```

### GET /api/v1/admin/dashboard → `AdminDashboardResponse`
```
{ total_active_clients, mrr_estimate, active_escalations, pending_leave_requests }
```

### GET /api/v1/admin/clients → `list[AdminClientListResponse]`
```
{ user_id, business_name, email, plan_name, status, created_at }
```

### GET /api/v1/admin/clients/{id} → `AdminClientDetailResponse`
```
{ user_id, full_name, business_name, email, phone, plan_name, status, created_at, subscriptions: [{ id, plan_id, plan_name, status, monthly_price, gateway, current_period_start, current_period_end }], deliverables_count, open_tickets_count }
```

### GET /api/v1/admin/team → `list[TeamMemberAdminResponse]`
```
{ team_member_id, user_id, full_name, email, role, department, daily_cap_posters, daily_cap_reels, daily_cap_stories, is_active, joined_at }
```

### GET /api/v1/admin/escalations → `list[EscalationResponse]`
```
{ id, task_id, client_id, assigned_to, severity, reason, status, resolution_notes, resolved_at, created_at, updated_at }
```

### GET /api/v1/admin/announcements → `list[AnnouncementResponse]`
```
{ id, author_id, title, content, type, target_departments, created_at }
```

### GET /api/v1/admin/settings → `PlatformSettingsResponse`
```
{ id, sla_delivery_days, sla_revision_hours, updated_at }
```

### GET /api/v1/admin/kpi → `KPIDashboardResponse`
```
{ delivery_rate_percentage, active_capacity_percentage, total_revenue, team_capacity_bars: [{ team_member_name, current_load, max_capacity }] }
```

### GET /api/v1/plans → `list[PlanResponse]`
```
{ id, name, display_name, monthly_price, poster_quota, reel_quota, story_quota, revision_rounds, has_dedicated_manager, is_active }
```

### GET /api/v1/questionnaire/status → `QuestionnaireStatusResponse`
```
{ status, summary_line }
```

### POST /api/v1/auth/register → `RegisterResponse`
```
{ id, email, full_name, role, account_status }
```
