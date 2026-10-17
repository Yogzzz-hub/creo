import type {
  BrandDNAStatus,
  CreateOrderResponse,
  OnboardingCompleteResponse,
  OnboardingStatus,
  Plan,
  QuestionnairePayload,
} from "../types/api";
/**
 * Onboarding API helpers.
 * All network calls for onboarding, billing, and brand DNA go here.
 */
import { request } from "./http";

export function actorHeaders(_userId?: string, _role = "client"): HeadersInit {
  return {};
}

// ── Onboarding ──────────────────────────────────────────────────────────────

export function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  return request<OnboardingStatus>("/api/v1/onboarding/status", {
    headers: actorHeaders(userId),
  });
}

export function acceptTerms(userId: string, termsVersion = "v1.0"): Promise<{ status: string }> {
  return request<{ status: string }>("/api/v1/onboarding/terms", {
    method: "POST",
    body: JSON.stringify({ terms_version: termsVersion }),
    headers: actorHeaders(userId),
  });
}

export function submitQuestionnaire(
  userId: string,
  payload: QuestionnairePayload,
): Promise<{ status: string }> {
  return request<{ status: string }>("/api/v1/onboarding/questionnaire", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: actorHeaders(userId),
  });
}

export function fetchBrandDNAStatus(userId: string): Promise<BrandDNAStatus> {
  return request<BrandDNAStatus>("/api/v1/onboarding/brand-dna/status", {
    headers: actorHeaders(userId),
  });
}

export function completeOnboarding(userId: string): Promise<OnboardingCompleteResponse> {
  return request<OnboardingCompleteResponse>("/api/v1/onboarding/complete", {
    method: "POST",
    headers: actorHeaders(userId),
  });
}

export function resendOnboardingSummary(userId: string): Promise<{ status: string; message: string; notified: number; emails_sent: number }> {
  return request<{ status: string; message: string; notified: number; emails_sent: number }>("/api/v1/onboarding/resend-summary", {
    method: "POST",
    headers: actorHeaders(userId),
  });
}

export interface QuestionnaireState {
  client_id: string;
  section_a: Record<string, any>;
  section_b: Record<string, any>;
  section_c: Record<string, any>;
  section_d: Record<string, any>;
  section_e: Record<string, any>;
  section_f: Record<string, any>;
  section_g: Record<string, any>;
  core_completed: boolean;
  extended_completed: boolean;
  version: number;
  last_active_section?: string | null;
}

export function fetchQuestionnaireState(userId: string): Promise<QuestionnaireState> {
  return request<QuestionnaireState>("/api/v1/onboarding/questionnaire", {
    headers: actorHeaders(userId),
  });
}

export function saveQuestionnaireSection(
  userId: string,
  section: "a" | "b" | "c" | "d" | "e" | "f" | "g",
  data: Record<string, any>
): Promise<{ client_id: string; section_saved: string; core_completed: boolean; extended_completed: boolean; version: number }> {
  return request<{ client_id: string; section_saved: string; core_completed: boolean; extended_completed: boolean; version: number }>(
    "/api/v1/onboarding/questionnaire/section",
    {
      method: "POST",
      body: JSON.stringify({ section, data }),
      headers: actorHeaders(userId),
    }
  );
}

export function saveQuestionnaireSections(
  userId: string,
  sections: Partial<Record<"a" | "b" | "c" | "d" | "e" | "f" | "g", Record<string, unknown>>>,
  activeSection: string,
): Promise<{ core_completed: boolean; extended_completed: boolean; version: number }> {
  return request("/api/v1/onboarding/questionnaire/sections", {
    method: "POST",
    headers: actorHeaders(userId),
    body: JSON.stringify({ sections, active_section: activeSection }),
  });
}

export function queueBrandDNAGeneration(userId: string): Promise<{ status: string; brand_dna?: any }> {
  return request<{ status: string; brand_dna?: any }>("/api/v1/onboarding/brand", {
    method: "POST",
    headers: actorHeaders(userId),
  });
}

export function fetchBrandStatus(userId: string): Promise<BrandDNAStatus> {
  return request<BrandDNAStatus>("/api/v1/onboarding/brand/status", {
    headers: actorHeaders(userId),
  });
}

export function fetchPortalBrandDNA(): Promise<{ brand_dna: any; brand_dna_source: string; brand_dna_version: number; summary_line?: string }> {
  return request<{ brand_dna: any; brand_dna_source: string; brand_dna_version: number; summary_line?: string }>("/api/v1/portal/brand-dna");
}



// ── Billing ─────────────────────────────────────────────────────────────────

export function fetchPlans(): Promise<Plan[]> {
  return request<Plan[]>("/api/v1/payments/plans");
}

export function createOrder(
  userId: string,
  planId: string,
  provider: "razorpay" | "stripe",
): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>("/api/v1/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId, gateway: provider }),
    headers: actorHeaders(userId),
  });
}

export function confirmPayment(
  userId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  gateway: "razorpay" | "stripe",
): Promise<{ status: "active" | "pending" }> {
  return request<{ status: "active" | "pending" }>("/api/v1/payments/confirm", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature, gateway }),
    headers: actorHeaders(userId),
  });
}

// ── Manual & Offline Payment Bypass ──────────────────────────────────────────

export interface ManualPaymentRequest {
  id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  plan_id: string;
  plan_name?: string;
  plan_display_name?: string;
  payment_method: string;
  amount: number;
  reference_note?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  reviewer_name?: string;
}

export function submitManualPaymentRequest(
  planId: string,
  paymentMethod: string,
  referenceNote?: string,
): Promise<ManualPaymentRequest> {
  return request<ManualPaymentRequest>("/api/v1/onboarding/manual-payment-request", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      payment_method: paymentMethod,
      reference_note: referenceNote,
    }),
  });
}

export function fetchManualPaymentRequest(): Promise<ManualPaymentRequest | null> {
  return request<ManualPaymentRequest | null>("/api/v1/onboarding/manual-payment-request");
}

export function cancelManualPaymentRequest(): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>("/api/v1/onboarding/manual-payment-request", {
    method: "DELETE",
  });
}

export function uploadBrandLogo(file: File): Promise<{ status: string; logo_url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request<{ status: string; logo_url: string; filename: string }>(
    "/api/v1/onboarding/questionnaire/logo",
    {
      method: "POST",
      body: formData,
    }
  );
}

export function fetchBrandLogo(): Promise<{ brand_logo_url: string | null }> {
  return request<{ brand_logo_url: string | null }>("/api/v1/onboarding/questionnaire/logo");
}

export function deleteBrandLogo(): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>("/api/v1/onboarding/questionnaire/logo", {
    method: "DELETE",
  });
}

