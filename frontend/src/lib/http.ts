/**
 * Central HTTP client wrapper for Creo.
 * All client-side requests go through this module.
 */

import type { ApiErrorResponse } from "../types/api";
import { getAuthToken, setAuthToken, getRefreshToken, clearAuthToken, isTokenUnexpired } from "./auth-token";

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

  // The deployed Worker proxies API calls on the site's existing connection.
  // Pages/Vercel and explicit API overrides keep their original routing.
  const isPagesDev = typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev");

  const apiBase = (
    import.meta.env.VITE_API_URL ||
    (isPagesDev
      ? "https://creo-api-singapore.onrender.com"
      : (isLocalhost ? "http://localhost:8000" : ""))
  ).replace(/\/$/, "");
  return path.startsWith("/api") && apiBase ? `${apiBase}${path}` : path;
}

/** RequestInit plus an optional per-call timeout (ms) overriding the GET/write defaults. */
export type RequestOptions = RequestInit & { timeoutMs?: number };

// Paths that establish or renew a session: a 401 there is an answer, not an expired token.
const AUTH_ENTRY_PATHS = ["/auth/login", "/auth/verify-", "/auth/refresh", "/auth/google/", "/auth/reset-password"];
const isAuthEntry = (path: string) => AUTH_ENTRY_PATHS.some((entry) => path.includes(entry));

// A 401 with one of these codes is final: renewing cannot bring the session back.
export const SESSION_ENDED_CODES = ["SESSION_REVOKED", "ACCOUNT_SUSPENDED"];

// Concurrent requests that all hit an expired access token share one renewal.
let renewal: Promise<boolean> | null = null;

/**
 * Trade the refresh token for a new access token. Resolves false when it could not be
 * renewed. The tokens are cleared only if the server rejected the refresh token (the
 * session is really over); after a network failure or timeout they are kept so the
 * next attempt can still succeed.
 */
function renewAccessToken(): Promise<boolean> {
  if (renewal) return renewal;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);
  renewal = (async () => {
    try {
      const res = await performRequest<{ access_token?: string }>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
        timeoutMs: 15_000,
      });
      if (!res?.access_token) return false;
      setAuthToken(res.access_token);
      return true;
    } catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) clearAuthToken();
      return false;
    } finally {
      renewal = null;
    }
  })();
  return renewal;
}

async function performRequest<T>(path: string, options: RequestOptions = {}, renewed = false): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options;
  options = fetchOptions;
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let token = getAuthToken();
  // An expired (or missing) access token with a refresh token to renew it: renew first
  // rather than spend a round trip on a request the server is certain to reject.
  if (!renewed && !isAuthEntry(path) && !isTokenUnexpired(token) && getRefreshToken() && !headers.has("Authorization")) {
    // Whatever the outcome, a failed 401 below must not trigger a second attempt.
    renewed = true;
    if (await renewAccessToken()) token = getAuthToken();
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestUrl = apiUrl(path);

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => controller.abort(new DOMException("The request timed out. Please try again.", "TimeoutError")), timeoutMs ?? ((options.method || "GET").toUpperCase() === "GET" ? 20_000 : 60_000));

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

      if (response.status === 401 && !isAuthEntry(path)) {
        // The short-lived access token expired: renew it from the refresh token and
        // replay the request once, so the user never notices.
        if (SESSION_ENDED_CODES.includes(errorCode)) {
          clearAuthToken();
        } else if (!renewed && token && getRefreshToken() && getAuthToken()) {
          const staleToken = token;
          // Another request may already have renewed it while this one was in flight.
          const ok = getAuthToken() !== staleToken || (await renewAccessToken());
          if (ok) {
            const replayHeaders = new Headers(options.headers);
            if (replayHeaders.get("Authorization") === `Bearer ${staleToken}`) replayHeaders.delete("Authorization");
            return performRequest<T>(path, { ...options, headers: replayHeaders, timeoutMs }, true);
          }
        }
        // Nothing left to renew with: the session expired or the token was revoked.
        if (!getRefreshToken()) clearAuthToken();
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
export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
