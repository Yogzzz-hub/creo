import { request } from "./http";

export type LeadPriority = "hot" | "warm" | "cold";

export type LeadStatus =
  | "new"
  | "contacted"
  | "meeting_scheduled"
  | "proposal_sent"
  | "negotiation"
  | "converted"
  | "lost";

export interface LeadActivity {
  id: string;
  lead_id: string;
  bde_id?: string | null;
  bde_name?: string | null;
  activity_type: "call" | "whatsapp" | "email" | "meeting" | "note" | "proposal" | "status_change";
  summary: string;
  outcome?: string | null;
  scheduled_follow_up?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company_name: string;
  email?: string | null;
  phone?: string | null;
  requirements?: string | null;
  estimated_deal_value: number;
  lead_source: string;
  priority: LeadPriority;
  status: LeadStatus;
  lost_reason?: string | null;
  assigned_bde_id?: string | null;
  assigned_bde_name?: string | null;
  assigned_bde_email?: string | null;
  next_follow_up_at?: string | null;
  last_contacted_at?: string | null;
  activity_count?: number;
  created_at: string;
  updated_at: string;
  activities?: LeadActivity[];
}

export interface BDEMetrics {
  total_leads: number;
  conversion_rate: number;
  total_pipeline_value: number;
  closed_revenue: number;
  overdue_follow_ups: number;
  today_follow_ups: number;
  priorities: {
    hot: number;
    warm: number;
    cold: number;
  };
  stages: Record<LeadStatus, number>;
}

export interface BDECalendarItem {
  id: string;
  lead_id?: string;
  title: string;
  scheduled_time?: string | null;
  is_overdue: boolean;
  is_today: boolean;
  status_category: "overdue" | "today" | "upcoming";
  lead: {
    id: string;
    name: string;
    company: string;
    phone?: string | null;
    priority: LeadPriority;
    status: LeadStatus;
  };
  bde: {
    name?: string | null;
  };
}

export interface CreateLeadPayload {
  name: string;
  company_name: string;
  email?: string;
  phone?: string;
  requirements?: string;
  estimated_deal_value?: number;
  lead_source?: string;
  priority?: LeadPriority;
  status?: LeadStatus;
  assigned_bde_id?: string;
  next_follow_up_at?: string;
}

export interface UpdateLeadPayload {
  name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  requirements?: string;
  estimated_deal_value?: number;
  lead_source?: string;
  priority?: LeadPriority;
  status?: LeadStatus;
  lost_reason?: string;
  assigned_bde_id?: string;
  next_follow_up_at?: string;
}

export interface CreateActivityPayload {
  activity_type: "call" | "whatsapp" | "email" | "meeting" | "note" | "proposal" | "status_change";
  summary: string;
  outcome?: string;
  scheduled_follow_up?: string;
}

export async function fetchLeads(params?: {
  priority?: string;
  status?: string;
  search?: string;
  assigned_to_me?: boolean;
  follow_up_filter?: "today" | "overdue" | "upcoming";
}): Promise<Lead[]> {
  const query = new URLSearchParams();
  if (params?.priority && params.priority !== "all") query.set("priority", params.priority);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.assigned_to_me) query.set("assigned_to_me", "true");
  if (params?.follow_up_filter && params.follow_up_filter !== ("all" as any)) {
    query.set("follow_up_filter", params.follow_up_filter);
  }

  return request<Lead[]>(`/api/v1/bde/leads?${query.toString()}`);
}

export async function fetchLeadDetail(id: string): Promise<Lead> {
  return request<Lead>(`/api/v1/bde/leads/${id}`);
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  return request<Lead>("/api/v1/bde/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
  return request<Lead>(`/api/v1/bde/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteLead(id: string): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(`/api/v1/bde/leads/${id}`, {
    method: "DELETE",
  });
}

export async function logLeadActivity(
  id: string,
  payload: CreateActivityPayload,
): Promise<{ status: string; message: string; activity_id: string; next_follow_up_at?: string }> {
  return request<{ status: string; message: string; activity_id: string; next_follow_up_at?: string }>(
    `/api/v1/bde/leads/${id}/activities`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchBDEMetrics(): Promise<BDEMetrics> {
  const data = await request<any>("/api/v1/bde/metrics");
  return {
    ...data,
    priorities: data?.priorities || {
      hot: data?.hot_count || 0,
      warm: data?.warm_count || 0,
      cold: data?.cold_count || 0,
    },
    stages: data?.stages || {},
  };
}

export async function fetchBDECalendar(): Promise<{
  overdue: BDECalendarItem[];
  today: BDECalendarItem[];
  upcoming: BDECalendarItem[];
  total_scheduled: number;
}> {
  return request<{
    overdue: BDECalendarItem[];
    today: BDECalendarItem[];
    upcoming: BDECalendarItem[];
    total_scheduled: number;
  }>("/api/v1/bde/calendar");
}

export interface BDERepPerformance {
  bde_id: string;
  name: string;
  email: string;
  avatar_initials: string;
  total_assigned: number;
  clients_reached: number;
  calls_count: number;
  whatsapp_count: number;
  emails_count: number;
  meetings_count: number;
  proposals_sent: number;
  deals_won: number;
  revenue_generated: number;
  conversion_rate: number;
  last_active_at?: string | null;
}

export interface BDERecentActivity {
  id: string;
  lead_id: string;
  lead_name: string;
  company_name: string;
  bde_name: string;
  activity_type: "call" | "whatsapp" | "email" | "meeting" | "note" | "proposal" | "status_change";
  summary: string;
  outcome?: string | null;
  created_at: string;
}

export interface BDEStageMetric {
  stage: string;
  count: number;
  value: number;
}

export interface BDEPerformanceResponse {
  overview: {
    total_clients_reached: number;
    total_leads: number;
    reach_rate: number;
    active_pipeline_value: number;
    closed_revenue: number;
    converted_count: number;
    conversion_rate: number;
    total_outreach_activities: number;
    activity_breakdown: Record<string, number>;
  };
  bde_reps: BDERepPerformance[];
  recent_activities: BDERecentActivity[];
  stages: BDEStageMetric[];
  leads: Array<{
    id: string;
    name: string;
    company_name: string;
    email?: string | null;
    phone?: string | null;
    priority: string;
    status: string;
    estimated_deal_value: number;
    lead_source: string;
    assigned_bde_id?: string | null;
    assigned_bde_name: string;
    last_contacted_at?: string | null;
    next_follow_up_at?: string | null;
    activities_count: number;
    created_at?: string | null;
  }>;
}

export async function fetchBDEPerformance(): Promise<BDEPerformanceResponse> {
  return request<BDEPerformanceResponse>("/api/v1/bde/performance");
}

export interface BDEAnalyticsData {
  revenue_tracking: {
    monthly_target: number;
    closed_revenue: number;
    target_achievement_pct: number;
    remaining_to_target: number;
    quarterly_projected: number;
  };
  pipeline_value: {
    total_unweighted: number;
    weighted_expected: number;
    active_deals_count: number;
    avg_deal_size: number;
  };
  forecasting: {
    best_case: number;
    expected: number;
    worst_case: number;
    stage_probabilities: Record<string, number>;
  };
  win_loss_analysis: {
    won_count: number;
    lost_count: number;
    win_rate: number;
    loss_rate: number;
    loss_reasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
  activity_metrics: {
    total_activities: number;
    calls: number;
    emails: number;
    whatsapp: number;
    meetings: number;
    proposals: number;
    weekly_actual: number;
    weekly_target: number;
    weekly_adherence_pct: number;
  };
}

export interface BDECollateralItem {
  id: string;
  title?: string;
  brand?: string;
  sector?: string;
  headline?: string;
  subtitle?: string;
  summary?: string;
  format?: string;
  download_url: string;
  category?: string;
  updated_at?: string;
  highlight_metric?: string;
}

export interface BDECollateralResponse {
  pitch_decks: BDECollateralItem[];
  case_studies: BDECollateralItem[];
  rate_cards_and_agreements: BDECollateralItem[];
}

export interface GenerateProposalPayload {
  lead_id: string;
  plan_name: string;
  monthly_fee: number;
  discount_pct: number;
  deliverables: Record<string, number>;
  notes?: string;
  valid_until?: string;
}

export interface GenerateProposalResponse {
  status: string;
  message: string;
  activity_id: string;
  proposal: {
    lead_id: string;
    lead_name: string;
    company_name: string;
    plan_name: string;
    original_monthly_fee: number;
    discount_pct: number;
    discount_tier: string;
    final_monthly_fee: number;
    deliverables: Record<string, number>;
    scope_summary: string;
    notes?: string;
    valid_until: string;
  };
}

export async function fetchBDEAnalytics(): Promise<BDEAnalyticsData> {
  return request<BDEAnalyticsData>("/api/v1/bde/analytics");
}

export async function fetchBDECollateral(): Promise<BDECollateralResponse> {
  return request<BDECollateralResponse>("/api/v1/bde/collateral");
}

export async function generateProposal(payload: GenerateProposalPayload): Promise<GenerateProposalResponse> {
  return request<GenerateProposalResponse>("/api/v1/bde/proposals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


