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

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const apiBase = (
    (import.meta.env.VITE_API_URL as string) ||
    (typeof window !== "undefined" && (window.location.hostname.includes("workers.dev") || window.location.hostname.includes("pages.dev"))
      ? "https://creo-fhhl.onrender.com"
      : "")
  ).replace(/\/$/, "");
  const requestUrl = path.startsWith("/api") && apiBase ? `${apiBase}${path}` : path;

  const response = await fetch(requestUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorCode = "HTTP_ERROR";
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: Record<string, unknown> = {};

    try {
      const errorJson = (await response.json()) as
        | ApiErrorResponse
        | { detail?: string | Array<{ loc?: string[]; msg: string }> }
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

  return (await response.json()) as T;
}
