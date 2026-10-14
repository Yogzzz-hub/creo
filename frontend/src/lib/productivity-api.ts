import { request } from "./http";

export interface SpecialistMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  is_freelancer: boolean;
  specialty: string;
  hourly_rate?: number | null;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
  tasks_rejected_revisions: number;
  revision_rate_pct: number;
  avg_turnaround_hours: number;
  on_time_count: number;
  late_count: number;
  on_time_completion_pct: number;
  allocated_workload_pct: number;
  capacity_status: "Overloaded" | "Optimal" | "Available";
  category_distribution: {
    reel: number;
    static_post: number;
    carousel: number;
    story: number;
  };
}

export interface ComparativeBenchmark {
  category: string;
  leader: string;
  runner_up: string;
  leader_completed: number;
  runner_up_completed: number;
  leader_turnaround: number;
  runner_up_turnaround: number;
  delta_efficiency_pct: number;
}

export interface ProductivitySummary {
  total_assigned: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
  revision_rate_pct: number;
  avg_turnaround_hours: number;
  on_time_completion_pct: number;
}

export interface ProductivityResponse {
  period: string;
  summary: ProductivitySummary;
  specialists: SpecialistMetric[];
  comparisons: ComparativeBenchmark[];
  workload_imbalance: {
    overloaded: SpecialistMetric[];
    underutilized: SpecialistMetric[];
    recommended_rebalancing_actions: string[];
  };
}

export async function fetchProductivityMetrics(params?: {
  period?: string;
  department?: string;
  role?: string;
  task_type?: string;
}): Promise<ProductivityResponse> {
  const query = new URLSearchParams();
  if (params?.period) query.set("period", params.period);
  if (params?.department && params.department !== "all") query.set("department", params.department);
  if (params?.role && params.role !== "all") query.set("role", params.role);
  if (params?.task_type && params.task_type !== "all") query.set("task_type", params.task_type);

  return request<ProductivityResponse>(`/api/v1/admin/productivity?${query.toString()}`);
}
