/**
 * Ops & Team domain TypeScript type definitions (Phase 5).
 */

export interface AdminKPIs {
  refreshed_at: string;
  mrr_minor: number;
  mrr_formatted: string;
  active_clients: number;
  churned_last_30d: number;
  avg_turnaround_hours: number;
}

export interface AdminDashboardData {
  kpis: AdminKPIs;
  pipeline: Record<string, number>;
  open_sla_breaches: number;
  staff: {
    total_staff: number;
    total_capacity: number;
    active_wip: number;
  };
}

export interface ClientRosterItem {
  client_id: string;
  email: string;
  account_status: string;
  company_name: string | null;
  instagram_username: string | null;
  onboarding_stage: number;
  plan_name: string | null;
  plan_display_name: string | null;
  subscription_status: string | null;
  quota_usage: Array<{
    kind: string;
    quota: number;
    used: number;
  }>;
}

export interface StaffQueueItem {
  user_id: string;
  full_name: string | null;
  email: string;
  department: string;
  skills: string[];
  daily_capacity: number;
  is_accepting_work: boolean;
  active_wip: number;
  on_leave_today: boolean;
}

export interface AdminQueueData {
  backlog: Array<{
    id: string;
    client_id: string;
    deliverable_type: string;
    status?: string;
    due_date?: string | null;
    sla_due_at: string | null;
    created_at: string | null;
    client_company: string | null;
    client_email?: string | null;
    assignee_name?: string | null;
    assignee_email?: string | null;
    assignee_role?: string | null;
    brand_summary?: string | null;
    brand_dna?: any | null;
    blueprint?: any | null;
    concept_status?: string | null;
    effort_points?: number | null;
    instagram_username?: string | null;
  }>;
  staff: StaffQueueItem[];
}

export interface SLABreachItem {
  id: string;
  client_id: string;
  assigned_to: string | null;
  deliverable_type: string;
  status: string;
  sla_due_at: string | null;
  last_sla_notified_at: string | null;
  created_at: string | null;
  assignee_email: string | null;
  assignee_name: string | null;
  client_company: string | null;
}
