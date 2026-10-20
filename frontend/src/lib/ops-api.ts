/**
 * Ops and Admin API client methods (Phase 5).
 */

import type {
  AdminDashboardData,
  AdminKPIs,
  AdminQueueData,
  ClientRosterItem,
  SLABreachItem,
  SLAPerformanceData,
} from "../types/ops";
import { HttpError, request } from "./http";
export { request };
export type { ClientRosterItem, AdminDashboardData, AdminKPIs, AdminQueueData, SLABreachItem, SLAPerformanceData };

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

export async function fetchAdminTransactions(): Promise<any[]> {
  return request<any[]>("/api/v1/admin/transactions");
}

export async function sendClientReminder(payload: {
  client_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  client_name?: string;
  reminder_type?: "auto" | "payment" | "onboarding";
  custom_message?: string;
}): Promise<{ status: string; message: string; reminder_type: string; notification_id?: string }> {
  return request("/api/v1/admin/send-reminder", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function fetchSLAPerformance(): Promise<SLAPerformanceData> {
  return request<SLAPerformanceData>("/api/v1/admin/sla-performance");
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
  user_id?: string;
  team_member_id?: string;
  employee_name?: string;
  user_name?: string;
  name?: string;
  employee_email?: string;
  email?: string;
  role?: string;
  role_raw?: string;
  user_role?: string;
  role_display?: string;
  department?: string;
  domain?: string;
  pod_name?: string;
  team_lead_id?: string | null;
  team_lead_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  created_at_ist?: string;
  approved_by?: string | null;
  approved_by_name?: string | null;
  can_approve?: boolean;
  can_reject?: boolean;
  can_cancel?: boolean;
  is_self?: boolean;
  is_on_leave_today?: boolean;
}

export async function fetchLeaveRequests(): Promise<LeaveRequestItem[]> {
  return request<LeaveRequestItem[]>("/api/v1/admin/leave");
}

export async function submitLeaveRequest(data: {
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<any> {
  return request("/api/v1/admin/leave", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function approveLeaveRequest(leaveId: string): Promise<any> {
  return request(`/api/v1/admin/leave/${leaveId}/approve`, { method: "POST" });
}

export async function rejectLeaveRequest(leaveId: string): Promise<any> {
  return request(`/api/v1/admin/leave/${leaveId}/reject`, { method: "POST" });
}

export interface TeamMemberItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  account_status: string;
  department: string;
  daily_capacity: number;
  skills: string[];
  is_accepting_work: boolean;
  active_wip: number;
  on_leave_today: boolean;
  team_lead_id: string | null;
  team_lead_name: string | null;
}

export async function fetchTeamMembers(): Promise<TeamMemberItem[]> {
  return request<TeamMemberItem[]>("/api/v1/admin/teams");
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS & TICKETS (QUICK ACTIONS)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchKanbanTasks(): Promise<any> {
  return request<any>("/api/v1/tasks/kanban");
}

export async function resolveTaskSla(taskId: string): Promise<any> {
  // Assuming a generic resolution endpoint or status patch
  return request(`/api/v1/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ to_status: "ready_to_publish" })
  });
}

export async function moveTaskStage(taskId: string, toStatus: string): Promise<any> {
  return request(`/api/v1/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ to_status: toStatus })
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
  phone?: string | null;
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
  industry?: string | null;
  created_at: string | null;
}

export async function fetchClientBrandProfile(
  clientId: string,
): Promise<ClientBrandProfile> {
  return request<ClientBrandProfile>(`/api/v1/admin/clients/${clientId}`);
}

export interface UpdateClientProfilePayload {
  company_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram_username?: string | null;
  timezone?: string | null;
  industry?: string | null;
  brand_summary?: string | null;
  palette?: string[] | null;
  colors?: string[] | null;
  brand_dna?: Record<string, any>;
}

export async function updateClientProfile(
  clientId: string,
  payload: UpdateClientProfilePayload,
): Promise<ClientBrandProfile> {
  return request<ClientBrandProfile>(`/api/v1/admin/clients/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

// Pod Dashboard Types & Functions
export interface PodMember {
  id: string;
  full_name: string;
  name: string;
  email: string;
  role: string;
  craft_title: string;
  department: string;
  daily_capacity: number;
  capacity?: number;
  tasks_count?: number;
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
  assignee: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  } | null;
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
  is_revision?: boolean;
  /** Newest non-archived upload for this task. */
  deliverable?: {
    id: string;
    root_id: string;
    version: number;
    /** Signed or absolute URL, null if the stored file cannot be served. */
    file_url: string | null;
    file_type: string;
    is_video: boolean;
    status: string;
    revision_round: number;
    /** QA notes (qa_rejected) or the client's change request (revision_requested). */
    rejection_comment?: string | null;
    voice_note_url?: string | null;
    voice_note_duration?: number | null;
    created_at?: string | null;
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


// ─────────────────────────────────────────────────────────────────────────────
// Plan Negotiations API
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanNegotiationApiItem {
  id: string;
  clientName: string;
  clientId?: string | null;
  clientEmail: string;
  clientLogo: string;
  targetTopic: string;
  proposedOffer: string | null;
  phoneNumber: string;
  preferredTime: string;
  notes: string | null;
  status: "Pending Review" | "Accepted" | "Declined" | "Counter Offered";
  counterPrice: number | null;
  agreedAmount?: number | null;
  counterNote: string | null;
  declineReason: string | null;
  reelQuota?: number | null;
  posterQuota?: number | null;
  storyQuota?: number | null;
  requestedAt: string | null;
  reviewedAt: string | null;
}

export async function fetchPlanNegotiations(): Promise<PlanNegotiationApiItem[]> {
  try {
    const res = await request<any>(`/api/v1/admin/negotiations`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.negotiations)) return res.negotiations;
  } catch (err) {
    console.warn("fetchPlanNegotiations /admin error, falling back:", err);
  }

  try {
    const fallback = await request<any>(`/api/v1/negotiations`);
    if (Array.isArray(fallback)) return fallback;
    if (fallback && Array.isArray(fallback.negotiations)) {
      return fallback.negotiations.map((n: any) => ({
        id: n.id,
        clientName: n.client_name || n.clientName || "Client",
        clientId: n.client_id || n.clientId || null,
        clientEmail: n.client_email || n.clientEmail || "",
        clientLogo: (n.client_name || n.clientEmail || "??").slice(0, 2).toUpperCase(),
        targetTopic: n.target_topic || n.targetTopic || "Custom Retainer Pricing",
        proposedOffer: n.proposed_budget || n.proposed_offer || n.proposedOffer || null,
        phoneNumber: n.contact_phone || n.phone_number || n.phoneNumber || "—",
        preferredTime: n.preferred_window || n.preferred_time || n.preferredTime || "—",
        notes: n.notes || null,
        status: (n.status === "PENDING" ? "Pending Review" : n.status === "APPROVED" ? "Accepted" : n.status === "REJECTED" ? "Declined" : n.status) || "Pending Review",
        counterPrice: n.counter_price || n.agreed_amount || null,
        agreedAmount: n.agreed_amount || n.counter_price || null,
        reelQuota: n.reel_quota || n.reelQuota || 8,
        posterQuota: n.poster_quota || n.posterQuota || 12,
        storyQuota: n.story_quota || n.storyQuota || 15,
        counterNote: n.counter_note || null,
        declineReason: n.decline_reason || null,
        requestedAt: n.created_at || n.requestedAt || null,
        reviewedAt: n.reviewed_at || n.reviewedAt || null,
      }));
    }
  } catch (err) {
    console.error("Failed to fetch plan negotiations:", err);
  }
  return [];
}

export async function updatePlanNegotiation(
  negId: string,
  action: "accept" | "decline" | "counter",
  extra?: { decline_reason?: string; counter_price?: number; counter_note?: string; agreed_price?: number; agreed_amount?: number; reel_quota?: number; poster_quota?: number; story_quota?: number },
): Promise<{ status: string; message: string; negotiation_id: string; new_status: string }> {
  const payload = {
    action,
    agreed_price: extra?.agreed_price || extra?.agreed_amount,
    agreed_amount: extra?.agreed_price || extra?.agreed_amount,
    counter_price: extra?.counter_price,
    counter_note: extra?.counter_note,
    decline_reason: extra?.decline_reason,
    reel_quota: extra?.reel_quota,
    poster_quota: extra?.poster_quota,
    story_quota: extra?.story_quota,
  };

  type Result = { status: string; message: string; negotiation_id: string; new_status: string };
  try {
    return await request<Result>(`/api/v1/admin/negotiations/${negId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Only retry through the alternate route when this one does not exist (an older API).
    // A real answer (validation, permission, conflict) must reach the admin instead of
    // being retried against a second endpoint.
    if (!(err instanceof HttpError) || ![404, 405].includes(err.status)) throw err;
    return await request<Result>(`/api/v1/negotiations/${negId}/approve`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
}

export async function createPlanNegotiation(payload: {
  client_name: string;
  target_topic: string;
  proposed_offer?: string;
  phone_number?: string;
  preferred_time?: string;
  notes?: string;
  client_email?: string;
  client_id?: string;
  standard_rate?: number;
  proposed_rate?: number;
  current_plan?: string;
  target_plan?: string;
  send_email?: boolean;
}): Promise<{ status: string; id: string; message: string; email_sent?: boolean }> {
  try {
    return await request<{ status: string; id: string; message: string; email_sent?: boolean }>(
      `/api/v1/admin/negotiations`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  } catch (err) {
    return await request<{ status: string; id: string; message: string; email_sent?: boolean }>(
      `/api/v1/negotiations/submit`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }
}

export async function resendProposalEmail(negId: string): Promise<{ status: string; message: string; email_sent?: boolean }> {
  return request<{ status: string; message: string; email_sent?: boolean }>(
    `/api/v1/admin/negotiations/${negId}/resend-email`,
    {
      method: "POST",
    }
  );
}

export async function fetchClientNegotiations(): Promise<PlanNegotiationApiItem[]> {
  return request<PlanNegotiationApiItem[]>(`/api/v1/portal/negotiations`);
}




export async function fetchAdminDeliverables(clientId?: string): Promise<any[]> {
  const url = clientId ? `/api/v1/admin/deliverables?client_id=${clientId}` : `/api/v1/admin/deliverables`;
  return request<any[]>(url);
}

// ── Manual & Offline Payment Bypass (Admin) ──────────────────────────────────
import type { ManualPaymentRequest } from "./onboarding-api";
export type { ManualPaymentRequest };

export async function fetchAdminManualPayments(): Promise<ManualPaymentRequest[]> {
  return request<ManualPaymentRequest[]>("/api/v1/admin/manual-payments");
}

export async function approveManualPayment(
  requestId: string,
  adminNotes?: string,
): Promise<{ status: string; message: string; subscription_id: string; client_id: string }> {
  return request<{ status: string; message: string; subscription_id: string; client_id: string }>(
    `/api/v1/admin/manual-payments/${requestId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ admin_notes: adminNotes }),
    },
  );
}

export async function rejectManualPayment(
  requestId: string,
  adminNotes?: string,
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(
    `/api/v1/admin/manual-payments/${requestId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ admin_notes: adminNotes }),
    },
  );
}

export async function directBypassClientPayment(
  clientId: string,
  data: { plan_id: string; payment_method?: string; notes?: string },
): Promise<{ status: string; message: string; subscription_id: string; client_id: string }> {
  return request<{ status: string; message: string; subscription_id: string; client_id: string }>(
    `/api/v1/admin/clients/${clientId}/bypass-payment`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function revokeClientBypass(
  clientId: string,
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(
    `/api/v1/admin/clients/${clientId}/revoke-bypass`,
    {
      method: "POST",
    },
  );
}



/** Create and assign in one transaction; never report success for a browser-only card. */
export function createPodTask(input: { client_id: string; assignee_id?: string; deliverable_type: string; title: string; brief?: string }) {
  return request<{ id: string }>("/api/v1/tasks", { method: "POST", body: JSON.stringify(input) });
}
