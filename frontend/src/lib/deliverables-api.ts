/**
 * Deliverables API client methods (Phase 4).
 * Handles portal contact sheet fetching, optimistic approvals, and change requests.
 */

import type { DeliverableItem, PortalDeliverablesResponse } from "../types/api";
import { request } from "./http";

function actorHeaders(clientId: string): HeadersInit {
  return {
    "X-User-Id": clientId,
    "X-User-Role": "client",
    "X-Client-Id": clientId,
  };
}

export async function fetchPortalDeliverables(
  clientId: string,
  status?: string,
  limit = 50,
): Promise<PortalDeliverablesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) {
    params.set("status", status);
  }
  return request<PortalDeliverablesResponse>(`/api/v1/portal/deliverables?${params.toString()}`, {
    headers: actorHeaders(clientId),
  });
}

export async function approveDeliverable(
  deliverableId: string,
  clientId: string,
  idempotencyKey: string,
): Promise<{ status: string; deliverable_id: string }> {
  return request<{ status: string; deliverable_id: string }>(
    `/api/v1/deliverables/${deliverableId}/approve`,
    {
      method: "POST",
      headers: {
        ...actorHeaders(clientId),
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
}

export async function requestChanges(
  deliverableId: string,
  clientId: string,
  rejectionComment: string,
): Promise<{ status: string; deliverable_id: string; revision_round: number }> {
  const params = new URLSearchParams({ rejection_comment: rejectionComment });
  return request<{ status: string; deliverable_id: string; revision_round: number }>(
    `/api/v1/deliverables/${deliverableId}/request-changes?${params.toString()}`,
    {
      method: "POST",
      headers: actorHeaders(clientId),
    },
  );
}

export async function fetchDeliverableVersions(
  deliverableId: string,
  clientId: string,
): Promise<{ versions: DeliverableItem[] }> {
  return request<{ versions: DeliverableItem[] }>(
    `/api/v1/deliverables/${deliverableId}/versions`,
    {
      headers: actorHeaders(clientId),
    },
  );
}
