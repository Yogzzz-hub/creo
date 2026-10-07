/**
 * Deliverables API client.
 *
 * Client portal: list/detail of deliverables ready for review, approvals and change requests.
 * Creative team: start a task, upload the finished file (direct-to-storage with a
 * server-side fallback), and lead QA decisions.
 */

import type { DeliverableDetail, PortalDeliverablesResponse } from "../types/api";
import { getAuthToken } from "./auth-token";
import { HttpError, apiUrl, request } from "./http";

// ── Client portal ────────────────────────────────────────────────────────────

export async function fetchPortalDeliverables(
  _clientId: string,
  status?: string,
  limit = 50,
): Promise<PortalDeliverablesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) {
    params.set("status", status);
  }
  return request<PortalDeliverablesResponse>(`/api/v1/portal/deliverables?${params.toString()}`);
}

export async function fetchPortalDeliverable(deliverableId: string): Promise<DeliverableDetail> {
  return request<DeliverableDetail>(`/api/v1/portal/deliverables/${deliverableId}`);
}

export async function approveDeliverable(
  deliverableId: string,
  _clientId: string,
  idempotencyKey: string,
): Promise<{ status: string; deliverable_id: string }> {
  return request<{ status: string; deliverable_id: string }>(
    `/api/v1/deliverables/${deliverableId}/approve`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );
}

export async function requestChanges(
  deliverableId: string,
  _clientId: string,
  rejectionComment: string,
): Promise<{ status: string; deliverable_id: string; revision_round: number }> {
  return request<{ status: string; deliverable_id: string; revision_round: number }>(
    `/api/v1/deliverables/${deliverableId}/request-changes`,
    {
      method: "POST",
      body: JSON.stringify({ rejection_comment: rejectionComment }),
    },
  );
}

/** Saves every approved deliverable as one ZIP file. */
export async function downloadApprovedZip(): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(apiUrl("/api/v1/portal/deliverables/download-zip"), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    throw new HttpError(res.status, "DOWNLOAD_FAILED", "Could not prepare the download. Please try again.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "creo_approved_assets.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Creative team ────────────────────────────────────────────────────────────

export const UPLOAD_ACCEPT = "video/mp4,video/quicktime,image/png,image/jpeg,image/webp,image/gif,.mp4,.mov,.png,.jpg,.jpeg,.webp,.gif";

const EXTENSION_MIMES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const MB = 1024 * 1024;

/** MIME type the backend accepts for this file, or null if unsupported. */
export function uploadMimeType(file: File): string | null {
  if (Object.values(EXTENSION_MIMES).includes(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIMES[ext] || null;
}

/** Same limits as the backend (App Flow 6.4): 10 MB images, 500 MB videos. */
export function validateUploadFile(file: File): string | null {
  const mime = uploadMimeType(file);
  if (!mime) return "Unsupported file type. Upload MP4/MOV video or PNG/JPG/WEBP/GIF images.";
  const limit = mime.startsWith("video/") ? 500 * MB : 10 * MB;
  if (file.size === 0) return "This file is empty.";
  if (file.size > limit) {
    return "File exceeds maximum size (10MB for images, 500MB for videos).";
  }
  return null;
}

export interface TeamDeliverable {
  id: string;
  root_id: string;
  version: number;
  status: string;
  file_url: string | null;
  file_type: string;
  is_video: boolean;
  revision_round: number;
  rejection_comment: string | null;
  task_id: string | null;
}

export async function startProductionTask(taskId: string): Promise<{ task_id: string; status: string }> {
  return request(`/api/v1/deliverables/tasks/${taskId}/start`, { method: "POST" });
}

interface UploadIntent {
  direct_upload: boolean;
  upload_url?: string;
  storage_key?: string;
}

function xhrSend(
  method: string,
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send(body);
  });
}

function errorFromResponse(status: number, text: string): HttpError {
  let code = "UPLOAD_FAILED";
  let message = `Upload failed (HTTP ${status}).`;
  try {
    const json = JSON.parse(text);
    const err = json?.error || json?.detail;
    if (typeof err === "string") message = err;
    else if (err) {
      code = err.code || code;
      message = err.message || message;
    }
  } catch {
    // body was not JSON
  }
  return new HttpError(status, code, message);
}

/**
 * Upload the finished file for a task and send it to lead QA.
 *
 * Tries a direct browser → bucket upload first (large videos never pass through
 * the API server); if the bucket refuses the browser (for example no CORS rule),
 * falls back to uploading through the API, which stores it in the same bucket.
 */
export async function uploadTaskDeliverable(
  taskId: string,
  file: File,
  notes: string,
  onProgress?: (fraction: number) => void,
): Promise<TeamDeliverable> {
  const invalid = validateUploadFile(file);
  if (invalid) throw new HttpError(400, "INVALID_FILE", invalid);
  const mimeType = uploadMimeType(file) as string;

  const intent = await request<UploadIntent>(`/api/v1/deliverables/tasks/${taskId}/upload-intent`, {
    method: "POST",
    body: JSON.stringify({ mime_type: mimeType, file_size_bytes: file.size }),
  });

  if (intent.direct_upload && intent.upload_url && intent.storage_key) {
    let directOk = false;
    try {
      const res = await xhrSend("PUT", intent.upload_url, file, { "Content-Type": mimeType }, onProgress);
      directOk = res.status >= 200 && res.status < 300;
    } catch {
      directOk = false;
    }
    if (directOk) {
      return request<TeamDeliverable>(`/api/v1/deliverables/tasks/${taskId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          storage_key: intent.storage_key,
          mime_type: mimeType,
          file_size_bytes: file.size,
          notes: notes || null,
        }),
      });
    }
    onProgress?.(0);
  }

  const form = new FormData();
  form.append("file", file, file.name);
  if (notes) form.append("notes", notes);
  const token = getAuthToken();
  const res = await xhrSend(
    "POST",
    apiUrl(`/api/v1/deliverables/tasks/${taskId}/upload`),
    form,
    token ? { Authorization: `Bearer ${token}` } : {},
    onProgress,
  );
  if (res.status < 200 || res.status >= 300) throw errorFromResponse(res.status, res.text);
  return JSON.parse(res.text) as TeamDeliverable;
}

export async function qaApproveDeliverable(deliverableId: string, notes?: string): Promise<{ status: string }> {
  return request(`/api/v1/deliverables/${deliverableId}/qa-approve`, {
    method: "POST",
    body: JSON.stringify({ notes: notes || null }),
  });
}

export async function qaRejectDeliverable(deliverableId: string, notes: string): Promise<{ status: string }> {
  return request(`/api/v1/deliverables/${deliverableId}/qa-reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function createProductionTask(payload: {
  client_id: string;
  deliverable_type: string;
  title: string;
  brief?: string;
  due_date?: string | null;
}): Promise<{ id: string; status: string }> {
  return request(`/api/v1/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
