/**
 * Auth Token Store with localStorage persistence for SPA navigation & session resilience.
 */

const STORAGE_KEY = "creo_access_token";
const REFRESH_STORAGE_KEY = "creo_refresh_token";
let _inMemoryToken: string | null = null;
let _inMemoryRefresh: string | null = null;

export function getAuthToken(): string | null {
  if (_inMemoryToken) return _inMemoryToken;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      _inMemoryToken = stored;
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  _inMemoryToken = token;
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

/** Long-lived token that renews the short-lived access token without a new sign-in. */
export function getRefreshToken(): string | null {
  if (_inMemoryRefresh) return _inMemoryRefresh;
  try {
    const stored = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (stored) {
      _inMemoryRefresh = stored;
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

export function setRefreshToken(token: string | null): void {
  _inMemoryRefresh = token;
  try {
    if (token) {
      localStorage.setItem(REFRESH_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
  setRefreshToken(null);
}

/** True when the JWT's own expiry is still comfortably in the future. */
export function isTokenUnexpired(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? ""));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 10_000;
  } catch {
    return false;
  }
}
