import { uploadTaskDeliverable as uploadForTask } from "./deliverables-api";
import type { PodTask } from "./ops-api";
export function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  const host = window.location.hostname;
  const base = import.meta.env.VITE_API_URL || (host.endsWith("workers.dev") || host.endsWith("pages.dev") ? "https://creo-api-singapore.onrender.com" : host === "localhost" || host === "127.0.0.1" ? "http://localhost:8000" : window.location.origin);
  return new URL(url, base).href;
}
/**
 * Upload a finished file for a production task and send it to lead QA.
 * Same path as the task board: direct-to-storage upload with an API fallback,
 * stored as the task's next deliverable version.
 */
export function uploadTaskDeliverable(task: PodTask, file: File) {
  return uploadForTask(task.id, file, "");
}
