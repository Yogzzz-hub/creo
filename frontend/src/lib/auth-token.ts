/**
 * Auth Token Store with localStorage persistence for SPA navigation & session resilience.
 */

const STORAGE_KEY = "creo_access_token";
let _inMemoryToken: string | null = null;

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

export function clearAuthToken(): void {
  setAuthToken(null);
}
