export interface User {
  id: string;
  auth_id: string;
  email: string;
  phone: string | null;
  full_name: string;
  business_name: string | null;
  role: UserRole;
  account_status: AccountStatus;
  plan_name: PlanName | null;
  instagram_access_token: string | null;
  instagram_user_id: string | null;
  razorpay_customer_id: string | null;
  stripe_customer_id: string | null;
  two_fa_enabled: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole =
  | "client"
  | "team_member"
  | "team_lead"
  | "sales"
  | "admin"
  | "investor_relations"
  | "super_admin";

export type AccountStatus =
  | "pending_verification"
  | "pending_payment"
  | "active"
  | "lapsed"
  | "suspended"
  | "deleted";

export type PlanName = "starter" | "growth" | "pro";

export interface Plan {
  id: string;
  name: PlanName;
  display_name: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  deliverable_type: DeliverableType;
  content_brief: string | null;
  status: TaskStatus;
  priority: number;
  is_addon: boolean;
  addon_id: string | null;
  calendar_entry_id: string | null;
  assignment_date: string | null;
  due_date: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliverableType = "poster" | "reel" | "story";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "revision"
  | "overdue";

export interface Deliverable {
  id: string;
  task_id: string;
  client_id: string;
  submitted_by: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  status: DeliverableStatus;
  revision_round: number;
  parent_deliverable_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  instagram_published_at: string | null;
  instagram_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliverableStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_in_progress"
  | "revised_pending_approval";

export interface Ticket {
  id: string;
  user_id: string;
  ticket_type: TicketType;
  subject: string;
  description: string;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type TicketType =
  | "deliverable_revision"
  | "general_support"
  | "billing_issue"
  | "content_brief_update";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_client"
  | "resolved"
  | "escalated";
