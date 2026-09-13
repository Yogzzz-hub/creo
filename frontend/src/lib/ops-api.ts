/**
 * Ops, Kanban, and Admin API client methods (Phase 5).
 */

import type {
  AdminDashboardData,
  AdminKPIs,
  AdminQueueData,
  ClientRosterItem,
  KanbanBoardData,
  KanbanTask,
  SLABreachItem,
} from "../types/ops";
import { request } from "./http";

export async function fetchKanbanBoard(_userId?: string, _role = "admin"): Promise<KanbanBoardData> {
  return request<KanbanBoardData>("/api/v1/tasks/kanban");
}

export async function moveKanbanTask(
  taskId: string,
  toStatus: string,
  _userId?: string,
  _role = "admin",
): Promise<KanbanTask> {
  return request<KanbanTask>(`/api/v1/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ to_status: toStatus }),
  });
}

export async function autoAssignTask(
  taskId: string,
  _userId?: string,
  _role = "admin",
): Promise<KanbanTask> {
  return request<KanbanTask>(`/api/v1/tasks/${taskId}/assign`, {
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

export async function fixClientPlan(
  clientId: string,
  planName: "starter" | "growth" | "pro",
  customNotes?: string,
  _role = "admin",
): Promise<{
  status: string;
  client_id: string;
  plan_name: string;
  plan_display_name: string;
  monthly_price: number;
  quotas: { reel: number; static_post: number; carousel: number };
  message: string;
}> {
  return request(
    `/api/v1/admin/clients/${clientId}/fix-plan`,
    {
      method: "POST",
      body: JSON.stringify({ plan_name: planName, custom_notes: customNotes }),
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


