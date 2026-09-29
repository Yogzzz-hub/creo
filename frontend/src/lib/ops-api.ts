/**
 * Ops and Admin API client methods (Phase 5).
 */

import type {
  AdminDashboardData,
  AdminKPIs,
  AdminQueueData,
  ClientRosterItem,
  SLABreachItem,
} from "../types/ops";
import { request } from "./http";
export { request };

export async function autoAssignTask(
  taskId: string,
  _userId?: string,
  _role = "admin",
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/api/v1/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}


export async function fetchAdminKPIs(_userId?: string, _role = "admin", timeframe?: string): Promise<AdminKPIs> {
  const params = timeframe ? `?timeframe=${timeframe}` : "";
  return request<AdminKPIs>(`/api/v1/admin/kpis${params}`);
}

export interface RevenueTrendPoint {
  label: string;
  value: number;
}

export interface RevenueTrendData {
  timeframe: string;
  points: RevenueTrendPoint[];
  total_revenue: number;
  total_revenue_formatted: string;
  total_clients: number;
}

export async function fetchRevenueTrend(timeframe = "30d"): Promise<RevenueTrendData> {
  return request<RevenueTrendData>(`/api/v1/admin/revenue-trend?timeframe=${timeframe}`);
}

export interface PlanSummaryItem {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  monthly_price: number;
  is_recommended: boolean;
  subscriber_count: number;
  revenue_contribution: number;
  revenue_formatted: string;
  share_pct: number;
}

export interface PlansSummaryData {
  plans: PlanSummaryItem[];
  total_subscribers: number;
}

export async function fetchPlansSummary(): Promise<PlansSummaryData> {
  return request<PlansSummaryData>("/api/v1/admin/plans-summary");
}

export async function fetchAdminDashboard(
  _userId?: string,
  _role = "admin",
  timeframe?: string
): Promise<AdminDashboardData> {
  const params = timeframe ? `?timeframe=${timeframe}` : "";
  return request<AdminDashboardData>(`/api/v1/admin/dashboard${params}`);
}

export async function fetchClientRoster(
  _userId?: string,
  _role = "admin",
): Promise<ClientRosterItem[]> {
  return request<ClientRosterItem[]>("/api/v1/admin/clients");
}

export async function fetchAdminQueue(_userId?: string, _role = "admin"): Promise<AdminQueueData> {
  return request<AdminQueueData>("/api/v1/admin/queue");
}

export async function fetchSLABreaches(_userId?: string, _role = "admin"): Promise<SLABreachItem[]> {
  return request<SLABreachItem[]>("/api/v1/admin/sla");
}

export async function suspendUser(
  userIdToSuspend: string,
  _adminUserId?: string,
  _role = "admin",
): Promise<{ status: string; user_id: string }> {
  return request<{ status: string; user_id: string }>(
    `/api/v1/admin/users/${userIdToSuspend}/suspend`,
    {
      method: "POST",
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaveRequestItem {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_by_name: string | null;
}

export async function fetchLeaveRequests(): Promise<LeaveRequestItem[]> {
  return request<LeaveRequestItem[]>("/api/v1/admin/leave");
}

export async function approveLeaveRequest(leaveId: string): Promise<any> {
  return request(`/api/v1/admin/leave/${leaveId}/approve`, { method: "POST" });
}

export async function rejectLeaveRequest(leaveId: string): Promise<any> {
  return request(`/api/v1/admin/leave/${leaveId}/reject`, { method: "POST" });
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS & TICKETS (QUICK ACTIONS)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveTaskSla(taskId: string): Promise<any> {
  // Assuming a generic resolution endpoint or status patch
  return request(`/api/v1/admin/deliverables/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" })
  });
}

export async function createQuickTask(payload: any): Promise<any> {
  return request(`/api/v1/admin/deliverables`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}


export async function removeClientPlan(
  clientId: string,
  reason?: string,
  _role = "admin",
): Promise<{ status: string; client_id: string; message: string }> {
  return request<{ status: string; client_id: string; message: string }>(
    `/api/v1/admin/clients/${clientId}/remove-plan`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Admin removed plan / refund request" }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export interface FixPlanCustomPayload {
  plan_name?: string;
  custom_notes?: string;
  is_custom?: boolean;
  custom_price?: number;
  custom_reel_quota?: number;
  custom_poster_quota?: number;
  custom_story_quota?: number;
  custom_display_name?: string;
}

export async function fixClientPlan(
  clientId: string,
  payloadOrPlanName: string | FixPlanCustomPayload,
  customNotes?: string,
  _role = "admin",
): Promise<{
  status: string;
  client_id: string;
  plan_name: string;
  plan_display_name: string;
  monthly_price: number;
  is_custom?: boolean;
  quotas: { reel: number; static_post: number; carousel: number };
  message: string;
}> {
  const body =
    typeof payloadOrPlanName === "string"
      ? { plan_name: payloadOrPlanName, custom_notes: customNotes }
      : {
          plan_name: payloadOrPlanName.plan_name || (payloadOrPlanName.is_custom ? "custom" : "growth"),
          custom_notes: payloadOrPlanName.custom_notes || customNotes,
          is_custom: payloadOrPlanName.is_custom,
          custom_price: payloadOrPlanName.custom_price,
          custom_reel_quota: payloadOrPlanName.custom_reel_quota,
          custom_poster_quota: payloadOrPlanName.custom_poster_quota,
          custom_story_quota: payloadOrPlanName.custom_story_quota,
          custom_display_name: payloadOrPlanName.custom_display_name,
        };

  return request(
    `/api/v1/admin/clients/${clientId}/fix-plan`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export async function refreshKPIs(
  _adminUserId?: string,
  _role = "admin",
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>("/api/v1/admin/refresh-kpis", {
    method: "POST",
  });
}

export interface ClientBrandProfile {
  client_id: string;
  full_name: string;
  email: string;
  account_status: string;
  company_name: string | null;
  instagram_username: string | null;
  onboarding_stage: number;
  onboarding_completed_at: string | null;
  brand_summary: string | null;
  brand_dna: Record<string, any>;
  brand_dna_source: string;
  brand_dna_version: number;
  subscription: {
    plan_name: string | null;
    plan_display_name: string | null;
    status: string;
    monthly_price: number | null;
    started_at: string | null;
  } | null;
  assigned_team: {
    id: string;
    name: string;
    email: string;
    role_key: string;
    role_label: string;
    is_primary: boolean;
  }[];
  task_stats: {
    total: number;
    pending: number;
    completed: number;
    in_review: number;
  };
  quota_usage: { kind: string; quota: number; used: number }[];
  timezone: string;
  created_at: string | null;
}

export async function fetchClientBrandProfile(
  clientId: string,
): Promise<ClientBrandProfile> {
  return request<ClientBrandProfile>(`/api/v1/admin/clients/${clientId}`);
}

// Pod Dashboard Types & Functions
export interface PodMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  craft_title: string;
  department: string;
  daily_capacity: number;
  skills: string[];
  is_accepting_work: boolean;
  account_status: string;
  active_wip?: number;
}

export interface PodTask {
  id: string;
  client_id: string;
  client_name: string;
  assigned_to: string | null;
  assignee_name: string;
  assignee_role: string | null;
  deliverable_type: "reel" | "carousel" | "story" | "static_post" | "shoot_day" | string;
  status: string;
  due_date: string | null;
  sla_due_at: string | null;
  hours_remaining: number | null;
  is_near_sla: boolean;
  effort_points: number;
  blueprint: Record<string, any>;
  deliverable?: {
    id: string;
    file_url: string;
    file_type: string;
    status: string;
    revision_round: number;
    rejection_comment?: string | null;
  } | null;
}

export interface PodNotification {
  id: string;
  type: "qa_review" | "sla_warning" | "leave_request" | "urgent_ticket";
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  message: string;
  task_id?: string;
  leave_id?: string;
  created_at: string;
}

export interface PodDashboardData {
  pod: {
    id: string;
    key: string;
    letter: string;
    name: string;
    color: string;
    textColor: string;
    badgeColor: string;
    progressBg: string;
    lead: {
      id: string | null;
      name: string;
      email: string;
    };
    stats: {
      total_tasks: number;
      yet_to_do: number;
      in_production: number;
      internal_qa: number;
      completed: number;
      total_wip: number;
      sla_compliance_pct: number;
      active_clients_count: number;
    };
  };
  members: PodMember[];
  clients: {
    id: string;
    name: string;
    email: string;
    brand_summary: string;
    brand_dna: Record<string, any>;
    instagram?: string | null;
  }[];
  tasks: {
    backlog: PodTask[];
    in_production: PodTask[];
    internal_qa: PodTask[];
    client_review: PodTask[];
    ready_to_publish: PodTask[];
    completed: PodTask[];
  };
  notifications: PodNotification[];
  available_pods: {
    id: string;
    key: string;
    letter: string;
    name: string;
    color: string;
    textColor: string;
    badgeColor: string;
    lead_name: string;
  }[];
  is_lead_view: boolean;
}

export async function fetchPodDashboard(podKey?: string): Promise<PodDashboardData> {
  const param = podKey ? `?pod=${encodeURIComponent(podKey)}` : "";
  return request<PodDashboardData>(`/api/v1/admin/pod-dashboard${param}`);
}

export async function submitPodQAReview(
  taskId: string,
  decision: "approve" | "reject",
  comment?: string,
): Promise<{ status: string; message: string; task_id: string; new_task_status: string }> {
  return request<{ status: string; message: string; task_id: string; new_task_status: string }>(
    `/api/v1/admin/pod-tasks/${taskId}/qa-review`,
    {
      method: "POST",
      body: JSON.stringify({ decision, comment }),
    }
  );
}

export async function reassignPodTask(
  taskId: string,
  assigneeId: string,
): Promise<{ status: string; message: string; task_id: string; assigned_to: string; assignee_name: string }> {
  return request<{ status: string; message: string; task_id: string; assigned_to: string; assignee_name: string }>(
    `/api/v1/admin/pod-tasks/${taskId}/reassign`,
    {
      method: "POST",
      body: JSON.stringify({ assignee_id: assigneeId }),
    }
  );
}

