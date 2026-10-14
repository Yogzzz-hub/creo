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
  skills?: string[];
}

export interface AssignFreelancerPayload {
  deliverable_id?: string;
  task_title?: string;
  instructions?: string;
  due_date?: string;
}

export interface FreelancerAssignedTask {
  id: string;
  deliverable_id: string;
  client_id: string;
  client_name: string;
  title: string;
  description: string;
  format: string;
  status: string;
  due_date: string;
  brief_url?: string;
  assigned_at?: string;
}

export interface FreelancerSubmitPayload {
  deliverable_id: string;
  asset_url: string;
  submission_notes?: string;
}

export async function fetchFreelancers(): Promise<FreelancerProfileItem[]> {
  const res = await request<{ freelancers: FreelancerProfileItem[] }>("/api/v1/admin/freelancers");
  return res.freelancers;
}

export async function createFreelancer(payload: CreateFreelancerPayload): Promise<{ freelancer_id: string; message: string }> {
  return request("/api/v1/admin/freelancers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFreelancerStatus(
  freelancerId: string,
  status: "ACTIVE" | "INACTIVE" | "REVOKED"
): Promise<{ message: string; status: string }> {
  return request(`/api/v1/admin/freelancers/${freelancerId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignFreelancerTask(
  freelancerId: string,
  payload: AssignFreelancerPayload
): Promise<{ message: string }> {
  return request(`/api/v1/admin/freelancers/${freelancerId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMyFreelancerTasks(): Promise<FreelancerAssignedTask[]> {
  const res = await request<{ tasks: FreelancerAssignedTask[] }>("/api/v1/admin/freelancer/my-tasks");
  return res.tasks;
}

export async function submitFreelancerWork(payload: FreelancerSubmitPayload): Promise<{ message: string }> {
  return request("/api/v1/admin/freelancer/submit-work", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
