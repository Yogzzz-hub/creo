import { apiUrl, request } from "./http";
import { getAuthToken } from "./auth-token";

export interface CRMLead {
  id: string;
  name: string;
  company_name: string;
  phone?: string;
  email?: string;
  requirements: string;
  priority: string;
  status: string;
  assigned_bde_id: string;
  estimated_deal_value: number;
  next_follow_up_at?: string;
  lead_source: string;
  metadata_extra: {
    next_action?: string;
    qualification?: { score: number; completeness: number; reason: string };
    industry?: string;
    location?: string;
  };
}
export interface CRMTask {
  id: string;
  lead_id: string;
  title: string;
  company: string;
  kind: string;
  due_at: string;
  status: string;
  outcome?: string;
}
export interface CRMService {
  id: string;
  sku: string;
  title: string;
  description: string;
  unit_price: number;
  minimum_price: number;
  billing: string;
  active: boolean;
}
export interface ProposalLine {
  service_id?: string;
  title: string;
  description: string;
  quantity: string;
  unit_price: number;
  discount_bps: number;
  billing: string;
  total?: number;
}
export interface CRMProposal {
  id: string;
  lead_id: string;
  number: string;
  version: number;
  title: string;
  status: string;
  currency: string;
  company?: string;
  valid_until: string;
  approval_required: boolean;
  expired?: boolean;
  revoked_at?: string;
  snapshot: {
    items: ProposalLine[];
    totals: Record<string, { subtotal: number; discount: number; tax: number; total: number }>;
    tax_bps: number;
    summary: string;
    scope: string;
    terms: string;
    client: { name: string; company: string };
    branding: Record<string, string>;
  };
}
export interface CRMReferral {
  id: string;
  lead_id: string;
  referrer: string;
  company: string;
  status: string;
  acquired_at: string;
  acquired_by: string;
  source: string;
}
export interface CRMEntry {
  id: string;
  company: string;
  kind: string;
  amount: number;
  currency: string;
  reference: string;
  occurred_at: string;
}
export interface CRMMessage {
  lead_id: string;
  scheduled_at?: string;
  id: string;
  company: string;
  body: string;
  status: string;
  error?: string;
  created_at: string;
}
export interface CRMPerson {
  id: string;
  name: string;
  role: string;
}
export interface CRMOverview {
  summary: {
    total_leads: number;
    active_leads: number;
    new_leads: number;
    pipeline_minor: number;
    won_deals: number;
    booked_minor: number;
    invoiced_minor: number;
    collected_minor: number;
    overdue: number;
    today: number;
    referrals: number;
    verified_referrals: number;
    proposal_attention: number;
    sla_on_time: number;
    sla_due: number;
    stages: Record<string, number>;
    priorities: Record<string, number>;
    target_minor: number;
  };
  exceptions: { id: string; name: string; reason: string }[];
  scorecards: (CRMPerson & {
    active: number;
    won: number;
    booked_minor: number;
    referrals: number;
    overdue: number;
  })[];
  month: string;
  timezone: string;
  currency: string;
  scope: string;
  can_manage: boolean;
  can_configure: boolean;
}
export function crmAgencyKey() {
  try {
    return sessionStorage.getItem("creo-crm-agency") || "";
  } catch {
    return "";
  }
}
const crmHeaders = (): Record<string, string> => (crmAgencyKey() ? { "X-CRM-Agency": crmAgencyKey() } : {});
export const crmGet = <T>(path: string) =>
  request<T>(`/api/v1/crm/${path}`, { headers: crmHeaders() });
export const crmWrite = <T>(path: string, body: unknown, method = "POST") =>
  request<T>(`/api/v1/crm/${path}`, {
    headers: crmHeaders(),
    method,
    body: JSON.stringify(body),
    timeoutMs: 45000,
  });
export const crmMoney = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
export const crmDate = (date?: string, zone = "Asia/Kolkata") =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "No next action";
export async function downloadProposal(proposal: CRMProposal) {
  const response = await fetch(apiUrl(`/api/v1/crm/proposals/${proposal.id}/pdf`), {
    headers: { Authorization: `Bearer ${getAuthToken()}`, ...crmHeaders() },
  });
  if (!response.ok)
    throw new Error("Unable to download the proposal. Refresh your session and try again.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${proposal.number}-v${proposal.version}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
