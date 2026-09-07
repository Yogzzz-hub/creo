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

export function getAdminHeaders(
  userId = "00000000-0000-0000-0000-000000000001",
  role = "admin",
): HeadersInit {
  return {
    "X-User-Id": userId,
    "X-User-Role": role,
  };
}

export async function fetchKanbanBoard(userId?: string, role = "admin"): Promise<KanbanBoardData> {
  return request<KanbanBoardData>("/api/v1/tasks/kanban", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function moveKanbanTask(
  taskId: string,
  toStatus: string,
  userId?: string,
  role = "admin",
): Promise<KanbanTask> {
  return request<KanbanTask>(`/api/v1/tasks/${taskId}/move`, {
    method: "PATCH",
    headers: getAdminHeaders(userId, role),
    body: JSON.stringify({ to_status: toStatus }),
  });
}

export async function autoAssignTask(
  taskId: string,
  userId?: string,
  role = "admin",
): Promise<KanbanTask> {
  return request<KanbanTask>(`/api/v1/tasks/${taskId}/assign`, {
    method: "POST",
    headers: getAdminHeaders(userId, role),
    body: JSON.stringify({}),
  });
}

export async function fetchAdminKPIs(userId?: string, role = "admin"): Promise<AdminKPIs> {
  return request<AdminKPIs>("/api/v1/admin/kpis", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function fetchAdminDashboard(
  userId?: string,
  role = "admin",
): Promise<AdminDashboardData> {
  return request<AdminDashboardData>("/api/v1/admin/dashboard", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function fetchClientRoster(
  userId?: string,
  role = "admin",
): Promise<ClientRosterItem[]> {
  return request<ClientRosterItem[]>("/api/v1/admin/clients", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function fetchAdminQueue(userId?: string, role = "admin"): Promise<AdminQueueData> {
  return request<AdminQueueData>("/api/v1/admin/queue", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function fetchSLABreaches(userId?: string, role = "admin"): Promise<SLABreachItem[]> {
  return request<SLABreachItem[]>("/api/v1/admin/sla", {
    headers: getAdminHeaders(userId, role),
  });
}

export async function suspendUser(
  userIdToSuspend: string,
  adminUserId?: string,
  role = "admin",
): Promise<{ status: string; user_id: string }> {
  return request<{ status: string; user_id: string }>(
    `/api/v1/admin/users/${userIdToSuspend}/suspend`,
    {
      method: "POST",
      headers: getAdminHeaders(adminUserId, role),
    },
  );
}

export async function refreshKPIs(
  adminUserId?: string,
  role = "admin",
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>("/api/v1/admin/refresh-kpis", {
    method: "POST",
    headers: getAdminHeaders(adminUserId, role),
  });
}
