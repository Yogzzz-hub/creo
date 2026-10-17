import { request } from "./http";

export interface FreelancerProfileItem {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  status: "ACTIVE" | "INACTIVE" | "REVOKED";
  specialty?: string;
  hourly_rate?: number;
  portfolio_link?: string;
  portfolio_url?: string;
  notes?: string;
  skills: string[];
  assigned_tasks_count: number;
  active_tasks_count: number;
  completed_tasks_count: number;
  created_at: string;
}

export interface CreateFreelancerPayload {
  email: string;
  full_name: string;
  password?: string;
  hourly_rate?: number;
  specialty?: string;
  portfolio_link?: string;
  portfolio_url?: string;
  notes?: string;
  skills?: string[];
}

export interface AssignFreelancerPayload {
  deliverable_id?: string;
  task_id?: string;
  task_title?: string;
  instructions?: string;
  role_description?: string;
  due_date?: string;
  priority?: string;
  milestone_fee?: number;
}

export interface FreelancerAssignedTask {
  id: string;
  deliverable_id?: string;
  client_id?: string;
  client_name?: string;
  title: string;
  description?: string;
  format?: string;
  status: string;
  due_date?: string;
  brief_url?: string;
  assigned_at?: string;
  deliverables?: any[];
  blueprint?: Record<string, any>;
  milestone_fee?: number;
}

export interface FreelancerSubmitPayload {
  deliverable_id?: string;
  task_id?: string;
  asset_url: string;
  storage_path?: string;
  title?: string;
  submission_notes?: string;
}

export async function fetchFreelancers(): Promise<FreelancerProfileItem[]> {
  const res = await request<any>("/api/v1/admin/freelancers");
  const rawList: any[] = Array.isArray(res) ? res : res?.freelancers || [];

  return rawList.map((item: any) => {
    const rawStatus = (item.status || item.profile_status || item.account_status || "ACTIVE").toUpperCase();
    const normalizedStatus: "ACTIVE" | "INACTIVE" | "REVOKED" =
      rawStatus === "REVOKED" || rawStatus === "SUSPENDED"
        ? "REVOKED"
        : rawStatus === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    return {
      id: String(item.id || item.user_id),
      user_id: String(item.user_id || item.id),
      email: item.email || "",
      full_name: item.full_name || item.name || "Freelancer Specialist",
      is_active: normalizedStatus === "ACTIVE",
      status: normalizedStatus,
      specialty: item.specialty || "Video Editor / Motion Designer",
      hourly_rate: item.hourly_rate ? Number(item.hourly_rate) : undefined,
      portfolio_link: item.portfolio_link || item.portfolio_url || "",
      portfolio_url: item.portfolio_url || item.portfolio_link || "",
      notes: item.notes || "",
      skills: Array.isArray(item.skills) ? item.skills : [],
      assigned_tasks_count: Number(item.assigned_tasks_count ?? item.total_tasks_assigned ?? 0),
      active_tasks_count: Number(item.active_tasks_count ?? item.active_tasks ?? 0),
      completed_tasks_count: Number(
        item.completed_tasks_count ??
          Math.max(0, (item.total_tasks_assigned ?? item.assigned_tasks_count ?? 0) - (item.active_tasks ?? item.active_tasks_count ?? 0))
      ),
      created_at: item.created_at || new Date().toISOString(),
    };
  });
}

export async function createFreelancer(
  payload: CreateFreelancerPayload
): Promise<{ freelancer_id: string; message: string; freelancer?: any }> {
  const normalized = {
    ...payload,
    portfolio_url: payload.portfolio_url || payload.portfolio_link,
    portfolio_link: payload.portfolio_link || payload.portfolio_url,
  };
  return request("/api/v1/admin/freelancers", {
    method: "POST",
    body: JSON.stringify(normalized),
  });
}

export async function updateFreelancerStatus(
  freelancerId: string,
  status: "ACTIVE" | "INACTIVE" | "REVOKED"
): Promise<{ message: string; status: string; profile_status?: string }> {
  return request(`/api/v1/admin/freelancers/${freelancerId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toLowerCase() }),
  });
}

export async function assignFreelancerTask(
  freelancerId: string,
  payload: AssignFreelancerPayload
): Promise<{ message: string; task_id?: string; deliverable_id?: string }> {
  return request(`/api/v1/admin/freelancers/${freelancerId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMyFreelancerTasks(): Promise<FreelancerAssignedTask[]> {
  const res = await request<any>("/api/v1/admin/freelancer/my-tasks");
  const rawList: any[] = Array.isArray(res) ? res : res?.tasks || [];
  return rawList.map((item: any) => ({
    id: item.id,
    deliverable_id: item.deliverable_id || (item.deliverables && item.deliverables[0]?.id),
    client_id: item.client_id,
    client_name: item.client_name || "Client",
    title: item.title || item.blueprint?.title || item.blueprint?.concept_name || item.deliverable_type || "Assigned Task",
    description: item.description || item.blueprint?.instructions || "",
    format: item.format || item.deliverable_type || "16:9 4K Video",
    status: item.status || "IN_PROGRESS",
    due_date: item.due_date || item.sla_due_at,
    brief_url: item.brief_url || item.blueprint?.brief_url,
    assigned_at: item.created_at,
    deliverables: item.deliverables || [],
    blueprint: item.blueprint,
    milestone_fee: Number(item.milestone_fee ?? item.blueprint?.milestone_fee ?? 4500),
  }));
}

export async function submitFreelancerWork(payload: FreelancerSubmitPayload): Promise<{ message: string }> {
  return request("/api/v1/admin/freelancer/submit-work", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startFreelancerTask(taskId: string): Promise<{ message: string }> {
  return request(`/api/v1/admin/freelancer/tasks/${taskId}/start-work`, {
    method: "PATCH",
  });
}

export async function uploadFreelancerContentFile(
  taskId: string,
  file: File,
  notes?: string
): Promise<{ status: string; message: string; file_url: string; deliverable_id?: string; version?: number }> {
  const formData = new FormData();
  formData.append("file", file);
  if (notes) {
    formData.append("notes", notes);
  }
  return request(`/api/v1/admin/freelancer/tasks/${taskId}/upload-content`, {
    method: "POST",
    body: formData,
  });
}
