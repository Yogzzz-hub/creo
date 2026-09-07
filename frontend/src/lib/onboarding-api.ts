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

// ── Auth-sim helpers (pre-auth phase) ──────────────────────────────────────
// During Phase 3, identity is passed via X-User-Id + X-User-Role headers.
// In the final auth phase this will be replaced by the JWT Bearer flow.
export function actorHeaders(userId: string, role = "client"): HeadersInit {
  return { "X-User-Id": userId, "X-User-Role": role };
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
