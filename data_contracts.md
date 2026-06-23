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
| `ContentPlanStatus` | `draft`, `submitted`, `approved`, `rejected` |
| `CalendarEntryStatus` | `draft`, `scheduled`, `in_progress`, `ready_for_review`, `approved`, `rejected` |
| `LeaveStatus` | `pending`, `approved`, `rejected` |
| `CustomPricingStatus` | `pending`, `approved`, `rejected` |
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

## Table: `client_assignments`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `team_member_id` | UUID | No |
| `deliverable_type` | DeliverableType | No |
| `assigned_at` | DateTime(tz) | No |
| `assigned_by` | UUID | Yes |
| `is_active` | Boolean | No |
| `created_at` | DateTime(tz) | No |

---

## Table: `content_plans`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `month` | Integer | No |
| `year` | Integer | No |
| `status` | ContentPlanStatus | No |
| `pdf_url` | Text | Yes |
| `submitted_at` | DateTime(tz) | Yes |
| `approved_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

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

## Table: `deliverable_comments`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `deliverable_id` | UUID | No |
| `author_id` | UUID | No |
| `comment_text` | Text | No |
| `is_rejection_reason` | Boolean | No |
| `created_at` | DateTime(tz) | No |

---

## Table: `tickets`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `ticket_number` | Text | No |
| `client_id` | UUID | No |
| `ticket_type` | TicketType | No |
| `subject` | Text | No |
| `description` | Text | No |
| `status` | TicketStatus | No |
| `assigned_to` | UUID | Yes |
| `linked_deliverable_id` | UUID | Yes |
| `resolved_at` | DateTime(tz) | Yes |
| `reopened_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `ticket_messages`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `ticket_id` | UUID | No |
| `sender_id` | UUID | No |
| `message_text` | Text | Yes |
| `file_url` | Text | Yes |
| `file_name` | Text | Yes |
| `file_size_bytes` | BigInteger | Yes |
| `is_read` | Boolean | No |
| `created_at` | DateTime(tz) | No |

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

## Table: `addons`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `deliverable_type` | DeliverableType | No |
| `quantity` | Integer | No |
| `unit_price` | Numeric(10,2) | No |
| `total_price` | Numeric(10,2) | No |
| `gateway` | PaymentGateway | No |
| `gateway_payment_id` | Text | Yes |
| `status` | AddonStatus | No |
| `content_brief` | Text | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `addon_pricing`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `deliverable_type` | DeliverableType | No |
| `unit_price` | Numeric(10,2) | No |
| `is_active` | Boolean | No |
| `updated_by` | UUID | Yes |
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
| `reason` | Text | Yes |
| `status` | LeaveStatus | No |
| `reviewed_by` | UUID | Yes |
| `reviewed_at` | DateTime(tz) | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `escalations`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `type` | Text | No |
| `severity` | Text | No |
| `client_id` | UUID | Yes |
| `task_id` | UUID | Yes |
| `ticket_id` | UUID | Yes |
| `assigned_to` | UUID | Yes |
| `description` | Text | No |
| `status` | Text | No |
| `resolved_at` | DateTime(tz) | Yes |
| `resolved_by` | UUID | Yes |
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
| `link` | Text | Yes |
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
| `file_url` | Text | Yes |
| `file_name` | Text | Yes |
| `created_at` | DateTime(tz) | No |
| `updated_at` | DateTime(tz) | Yes |

---

## Table: `custom_pricing`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | UUID | No (PK) |
| `client_id` | UUID | No |
| `plan_id` | UUID | No |
| `custom_price` | Numeric(10,2) | No |
| `standard_price` | Numeric(10,2) | No |
| `discount_percent` | Numeric(5,2) | No |
| `requested_by` | UUID | No |
| `approved_by` | UUID | Yes |
| `valid_from` | Date | Yes |
| `valid_until` | Date | Yes |
| `notes` | Text | Yes |
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

### GET /api/v1/deliverables/{id}/comments → `list[DeliverableCommentOut]`
```
{ id, deliverable_id, author_id, comment_text, is_rejection_reason, created_at }
```

### POST /api/v1/deliverables/{id}/comments → `DeliverableCommentOut`
```
{ id, deliverable_id, author_id, comment_text, is_rejection_reason, created_at }
```

### GET /api/v1/payments/history → `list[PaymentHistoryResponse]`
```
{ id, plan_id, status, gateway, gateway_subscription_id, gateway_customer_id, current_period_start, current_period_end, cancelled_at, created_at, updated_at }
```

### GET /api/v1/tickets → `list[TicketOut]`
```
{ id, ticket_number, client_id, ticket_type, subject, description, status, assigned_to, linked_deliverable_id, created_at, resolved_at, reopened_at, updated_at }
```

### POST /api/v1/tickets → `TicketOut`
Request: `{ ticket_type, subject, description, linked_deliverable_id }`
```
{ id, ticket_number, client_id, ticket_type, subject, description, status, assigned_to, linked_deliverable_id, created_at, resolved_at, reopened_at, updated_at }
```

### GET /api/v1/tickets/{id}/messages → `list[TicketMessageOut]`
```
{ id, ticket_id, sender_id, message_text, file_url, file_name, file_size_bytes, is_read, created_at }
```

### POST /api/v1/tickets/{id}/messages → `TicketMessageOut`
Request: `{ message_text, file_url, file_name }`
```
{ id, ticket_id, sender_id, message_text, file_url, file_name, file_size_bytes, is_read, created_at }
```

### GET /api/v1/team/tickets → `list[TicketOut]`
```
{ id, ticket_number, client_id, ticket_type, subject, description, status, assigned_to, linked_deliverable_id, created_at, resolved_at, reopened_at, updated_at }
```

### GET /api/v1/team/tickets/{id}/messages → `list[TicketMessageOut]`
```
{ id, ticket_id, sender_id, message_text, file_url, file_name, file_size_bytes, is_read, created_at }
```

### POST /api/v1/team/tickets/{id}/messages → `TicketMessageOut`
Request: `{ message_text, file_url, file_name }`
```
{ id, ticket_id, sender_id, message_text, file_url, file_name, file_size_bytes, is_read, created_at }
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
{ members: [{ team_member_id, name, role, active_tasks, overdue_tasks, today_completed, daily_cap_posters, daily_cap_reels, daily_cap_stories }] }
```

### GET /api/v1/calendar/team → `list[TeamCalendarEntryResponse]`
```
{ id, scheduled_date, display_date, deliverable_type, client_name, content_topic, status, linked_task_id }
```

### GET /api/v1/leave → `list[LeaveRequestOut]`
```
{ id, team_member_id, start_date, end_date, reason, status, reviewed_by, reviewed_at, created_at, updated_at }
```

### POST /api/v1/leave → `LeaveRequestOut`
Request: `{ start_date, end_date, reason }`
```
{ id, team_member_id, start_date, end_date, reason, status, reviewed_by, reviewed_at, created_at, updated_at }
```

### GET /api/v1/client-assignments → `list[ClientAssignmentOut]`
```
{ id, client_id, team_member_id, deliverable_type, is_active, assigned_at, assigned_by, created_at }
```

### POST /api/v1/client-assignments → `ClientAssignmentOut`
```
{ id, client_id, team_member_id, deliverable_type, is_active, assigned_at, assigned_by, created_at }
```

### GET /api/v1/content-plans → `list[ContentPlanOut]`
```
{ id, client_id, month, year, status, pdf_url, submitted_at, approved_at, created_at, updated_at }
```

### POST /api/v1/content-plans → `ContentPlanOut`
```
{ id, client_id, month, year, status, pdf_url, submitted_at, approved_at, created_at, updated_at }
```

### PATCH /api/v1/content-plans/{id}/submit → `ContentPlanOut`
```
{ id, client_id, month, year, status, pdf_url, submitted_at, approved_at, created_at, updated_at }
```

### PATCH /api/v1/content-plans/{id}/approve → `ContentPlanOut`
```
{ id, client_id, month, year, status, pdf_url, submitted_at, approved_at, created_at, updated_at }
```

### PATCH /api/v1/content-plans/{id}/reject → `ContentPlanOut`
```
{ id, client_id, month, year, status, pdf_url, submitted_at, approved_at, created_at, updated_at }
```

### PUT /api/v1/account → `UserOut`
```
{ id, email, phone, full_name, business_name, role, account_status, plan_name, two_fa_enabled, deleted_at, created_at, updated_at }
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
{ id, type, severity, client_id, task_id, ticket_id, assigned_to, description, status, resolved_at, resolved_by, created_at, updated_at }
```

### GET /api/v1/admin/announcements → `list[AnnouncementResponse]`
```
{ id, author_id, title, content, type, target_departments, file_url, file_name, created_at, updated_at }
```

### GET /api/v1/admin/settings → `PlatformSettingsResponse`
```
{ id, sla_delivery_days, sla_revision_hours, updated_at }
```

### GET /api/v1/admin/kpi → `KPIDashboardResponse`
```
{ delivery_rate_percentage, active_capacity_percentage, total_revenue, team_capacity_bars: [{ team_member_name, current_load, max_capacity }] }
```

### GET /api/v1/admin/custom-pricing → `list[AdminCustomPricingResponse]`
```
{ id, client_name, business_name, plan_name, custom_price, status, reason, created_at }
```

### POST /api/v1/admin/custom-pricing → `CustomPricingOut`
```
{ id, client_id, plan_id, custom_price, standard_price, discount_percent, requested_by, approved_by, valid_from, valid_until, notes, status, created_at, updated_at }
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

### PATCH /api/v1/notifications/{id}/read → `NotificationOut`
```
{ id, user_id, type, title, message, link, is_read, created_at }
```
