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


export async function fetchAdminKPIs(_userId?: string, _role = "admin"): Promise<AdminKPIs> {
  return request<AdminKPIs>("/api/v1/admin/kpis");
}

export async function fetchAdminDashboard(
  _userId?: string,
  _role = "admin",
): Promise<AdminDashboardData> {
  return request<AdminDashboardData>("/api/v1/admin/dashboard");
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


