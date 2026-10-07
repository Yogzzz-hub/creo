import { request } from "./http";
import type { PodTask } from "./ops-api";
export function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  const host = window.location.hostname;
  const base = import.meta.env.VITE_API_URL || (host.endsWith("workers.dev") || host.endsWith("pages.dev") ? "https://creo-api-singapore.onrender.com" : host === "localhost" || host === "127.0.0.1" ? "http://localhost:8000" : window.location.origin);
  return new URL(url, base).href;
}
export async function uploadTaskDeliverable(task: PodTask, file: File) {
  const body = new FormData(); body.set("file", file);
  const uploaded = await request<{ file_url: string }>("/api/v1/admin/deliverables/upload", { method: "POST", body });
  return request("/api/v1/admin/deliverables", { method: "POST", body: JSON.stringify({ client_id: task.client_id, task_id: task.id, type: task.deliverable_type, file_url: uploaded.file_url, file_type: file.type, file_size_bytes: file.size, status: "pending_qa" }) });
}
