/**
 * Central HTTP client wrapper for Creo.
 * All client-side requests go through this module.
 */

import type { ApiErrorResponse } from "../types/api";
import { getAuthToken, clearAuthToken } from "./auth-token";

export class HttpError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Absolute URL for an API path, matching the backend that request() talks to. */
export function apiUrl(path: string): string {
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."));

  const isWorkersDev = typeof window !== "undefined" && (window.location.hostname.includes("workers.dev") || window.location.hostname.includes("pages.dev"));

  const apiBase = (
    import.meta.env.VITE_API_URL ||
    (isWorkersDev
      ? "https://creo-api-singapore.onrender.com"
      : (isLocalhost ? "http://localhost:8000" : ""))
  ).replace(/\/$/, "");
  return path.startsWith("/api") && apiBase ? `${apiBase}${path}` : path;
}

async function performRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestUrl = apiUrl(path);

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => controller.abort(new DOMException("The request timed out. Please try again.", "TimeoutError")), (options.method || "GET").toUpperCase() === "GET" ? 20_000 : 60_000);

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: "include",
    });

    if (!response.ok) {
      let errorCode = "HTTP_ERROR";
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails: Record<string, unknown> = {};

      try {
        const errorJson = (await response.json()) as
          | ApiErrorResponse
          | { detail?: string | Array<{ loc?: string[]; msg: string }> | { code?: string; message?: string; [key: string]: unknown } }
          | undefined;
        if (errorJson && "error" in errorJson && errorJson.error) {
          errorCode = errorJson.error.code || errorCode;
          errorMessage = errorJson.error.message || errorMessage;
          errorDetails = errorJson.error.details || {};
        } else if (errorJson && "detail" in errorJson && errorJson.detail) {
          errorCode = "VALIDATION_ERROR";
          if (Array.isArray(errorJson.detail)) {
            errorMessage =
              errorJson.detail
                .map((d) => `${d.loc ? d.loc.filter((l) => l !== "body").join(".") + ": " : ""}${d.msg}`)
                .join("; ") || errorMessage;
          } else if (typeof errorJson.detail === "string") {
            errorMessage = errorJson.detail;
          } else {
            errorCode = errorJson.detail.code || errorCode;
            errorMessage = errorJson.detail.message || errorMessage;
            errorDetails = errorJson.detail;
          }
        }
      } catch {
        // Body was not JSON
      }

      if (response.status === 401) {
        // If an existing authenticated session expired or token was revoked
        if (!path.includes("/auth/login") && !path.includes("/auth/verify-")) {
          clearAuthToken();
        }
      }

      throw new HttpError(response.status, errorCode, errorMessage, errorDetails);
    }

    if (response.status === 204 || response.status === 205) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

// Share only concurrent, identical GETs. Nothing is retained after completion;
// writes and independently cancellable requests always have their own transport.
const inFlightReads = new Map<string, Promise<unknown>>();
export function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const canShare = (options.method ?? "GET").toUpperCase() === "GET"
    && !options.signal && !options.body
    && Object.keys(options).every(key => ["method", "headers", "credentials"].includes(key));
  if (!canShare) return performRequest<T>(path, options);
  const headers = Array.from(new Headers(options.headers).entries()).sort();
  const key = JSON.stringify([apiUrl(path), getAuthToken(), headers, options.credentials ?? "include"]);
  const existing = inFlightReads.get(key);
  if (existing) return existing as Promise<T>;
  const pending = performRequest<T>(path, options).finally(() => {
    if (inFlightReads.get(key) === pending) inFlightReads.delete(key);
  });
  inFlightReads.set(key, pending);
  return pending;
}
