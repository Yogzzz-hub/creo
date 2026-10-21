import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { HttpError, SESSION_ENDED_CODES, request } from "./http";
import { getAuthToken, setAuthToken, getRefreshToken, setRefreshToken, clearAuthToken, isTokenUnexpired } from "./auth-token";

import { queryClient } from "./query-client";

const USER_CACHE_KEY = "creo_auth_user";
export const GOOGLE_OAUTH_STATE_KEY = "creo_google_oauth_state";

function rememberGoogleState(state: string): void {
  try {
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
    localStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
  } catch {
    // storage unavailable
  }
}

// The consent URL only needs a fresh state once per sign-in attempt, so the login page
// asks for it while the visitor types and the click can redirect with no waiting.
const GOOGLE_URL_TTL_MS = 10 * 60_000;
let googleUrlCache: { url: string; state: string; at: number } | null = null;
let googleUrlPending: Promise<string> | null = null;

function readGoogleState(): string | null {
  try {
    return sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY) || localStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
  } catch {
    return null;
  }
}

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** A refresh token lets an expired access token be renewed silently, so the session survives. */
function canResumeSession(token: string | null): boolean {
  return isTokenUnexpired(token) || Boolean(getRefreshToken());
}

function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  role: string;
  account_status: string;
  onboarding_stage: number;
  onboarding_status?: string;
  terms_accepted?: boolean;
  must_reset_password?: boolean;
  /** Linked sign-in methods for this one account: "password", "google". */
  sign_in_methods?: string[];
}

export interface RegistrationCodeResult {
  status: "sent";
  message: string;
  email: string;
  email_delivered: true;
  expires_in_seconds: number;
}

export interface PasswordResetVerification {
  reset_token: string;
  email: string;
  sign_in_methods: string[];
}

export interface SessionResponse {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  sendOtp: (email: string, full_name?: string) => Promise<{ status: string; message: string }>;
  verifyOtp: (email: string, code: string, full_name?: string) => Promise<AuthUser>;
  loginWithPassword: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, full_name?: string) => Promise<AuthUser>;
  registerIntent: (email: string, password: string, full_name?: string) => Promise<RegistrationCodeResult>;
  resendRegistration: (email: string) => Promise<RegistrationCodeResult>;
  verifyRegistration: (email: string, code: string, password?: string, full_name?: string) => Promise<AuthUser>;
  forgotPassword: (email: string) => Promise<{ status: string; message: string }>;
  verifyResetOtp: (email: string, code: string) => Promise<PasswordResetVerification>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<AuthUser>;
  directResetPassword: (email: string, newPassword: string) => Promise<{ status: string; message: string }>;
  setMandatoryPassword: (newPassword: string) => Promise<void>;
  getGoogleAuthUrl: () => Promise<string>;
  /** Adopt a session the caller already obtained (e.g. the Google code exchange). */
  completeSignIn: (session: SessionResponse) => AuthUser;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Merge fresh fields (e.g. onboarding_stage) into the signed-in user. */
  patchUser: (fields: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // With a resumable session (a valid token, or a refresh token that can renew an
  // expired one) and a cached profile we render the app immediately and revalidate
  // /auth/me in the background, instead of blocking every page load on it. Without
  // either, the normal blocking path runs so nobody sees a flash of the app right
  // before being sent to the login screen.
  const [initialUser] = useState<AuthUser | null>(() =>
    canResumeSession(getAuthToken()) ? readCachedUser() : null,
  );
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(!initialUser);
  const cacheIdentity = useRef(initialUser?.id);

  useEffect(() => {
    if (cacheIdentity.current !== user?.id) {
      queryClient.clear();
      cacheIdentity.current = user?.id;
    }
  }, [user?.id]);

  // Begin the first dashboard request while its route code is downloading.
  // Use exactly the page's query key so it reuses this request and result.
  useEffect(() => {
    if (!user?.id || user.must_reset_password) return;
    if (user.role === "client" && user.onboarding_stage >= 8) {
      void queryClient.prefetchQuery({
        queryKey: ["portal-dashboard", user.id],
        queryFn: () => request("/api/v1/portal/dashboard"),
        staleTime: 60_000,
      });
    } else if (user.role === "admin" || user.role === "super_admin") {
      void queryClient.prefetchQuery({
        queryKey: ["admin_dashboard", user.id, "admin"],
        queryFn: () => request("/api/v1/admin/kpis"),
        staleTime: 30_000,
      });
    }
  }, [user?.id, user?.role, user?.onboarding_stage, user?.must_reset_password]);

  // Persist the profile for the next page load (and forget it on sign-out)
  useEffect(() => {
    if (!loading) writeCachedUser(user);
  }, [user, loading]);

  const patchUser = useCallback(
    (fields: Partial<AuthUser>) => setUser((prev) => (prev ? { ...prev, ...fields } : prev)),
    [],
  );

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    setAuthToken(newToken);
  };

  // Every sign-in method ends here: keep both tokens so the session outlives the
  // short-lived access token, and show the user without another /auth/me round trip.
  const adoptSession = (session: SessionResponse): AuthUser => {
    setToken(session.access_token);
    if (session.refresh_token) setRefreshToken(session.refresh_token);
    setUser(session.user);
    return session.user;
  };

  const refresh = async () => {
    const currentToken = getAuthToken();
    if (!currentToken && !getRefreshToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const data = await request<AuthUser & { access_token?: string }>("/api/v1/auth/me", {
        signal: controller.signal,
      });
      if (data.access_token && data.access_token !== getAuthToken()) {
        setToken(data.access_token);
      }
      const { access_token: _ignored, ...profile } = data;
      setUser(profile);
    } catch (err: any) {
      // A rejected session (401/403) forces login. A 401 that still has a refresh token
      // only means renewing failed for now (network or timeout): keep the tokens so the
      // next attempt can succeed. A timeout alone never signs anyone out.
      const isAuthError = err instanceof HttpError && (err.status === 401 || err.status === 403);
      const isTimeout = err.name === "AbortError";
      const renewable =
        err instanceof HttpError && err.status === 401 && !SESSION_ENDED_CODES.includes(err.code) && Boolean(getRefreshToken());

      if (renewable) {
        if (!readCachedUser()) setUser(null);
      } else if (isAuthError || (!isTimeout && !readCachedUser())) {
        setUser(null);
        setToken(null);
        clearAuthToken();
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sendOtp = async (email: string, full_name?: string) => {
    return await request<{ status: string; message: string }>("/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, full_name }),
    });
  };

  const verifyOtp = async (email: string, code: string, full_name?: string) => {
    const res = await request<SessionResponse>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code, full_name }),
    });
    return adoptSession(res);
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await request<SessionResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return adoptSession(res);
  };

  const register = async (email: string, password: string, full_name?: string) => {
    const res = await request<SessionResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    return adoptSession(res);
  };

  const registerIntent = async (email: string, password: string, full_name?: string) => {
    return await request<RegistrationCodeResult>("/api/v1/auth/register-intent", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
  };

  const resendRegistration = async (email: string) => {
    return await request<RegistrationCodeResult>("/api/v1/auth/resend-registration", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const verifyRegistration = async (email: string, code: string, password?: string, full_name?: string) => {
    const res = await request<SessionResponse>("/api/v1/auth/verify-registration", {
      method: "POST",
      body: JSON.stringify({ email, code, ...(password ? { password } : {}), full_name }),
    });
    return adoptSession(res);
  };

  const forgotPassword = async (email: string) => {
    return await request<{ status: string; message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  // Verifying the code only proves email ownership; the session starts once the new password is saved.
  const verifyResetOtp = async (email: string, code: string) => {
    return await request<PasswordResetVerification>("/api/v1/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    const res = await request<SessionResponse>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
    });
    return adoptSession(res);
  };

  const directResetPassword = async (email: string, newPassword: string) => {
    return await request<{ status: string; message: string }>("/api/v1/auth/direct-reset-password", {
      method: "POST",
      body: JSON.stringify({ email, new_password: newPassword }),
    });
  };

  const setMandatoryPassword = async (newPassword: string) => {
    const res = await request<SessionResponse & { status: string }>("/api/v1/auth/set-mandatory-password", {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    });
    setToken(res.access_token);
    if (res.refresh_token) setRefreshToken(res.refresh_token);
    if (res.user) {
      setUser(res.user);
    } else {
      setUser((prev) => (prev ? { ...prev, must_reset_password: false } : null));
    }
  };

  const fetchGoogleAuthUrl = async (): Promise<string> => {
    const callbackUrl = window.location.origin + "/auth/google/callback";
    try {
      const res = await request<{ url: string; state: string }>(
        `/api/v1/auth/google/url?redirect_uri=${encodeURIComponent(callbackUrl)}`,
        { timeoutMs: 6000 },
      );
      if (res?.url) {
        rememberGoogleState(res.state);
        googleUrlCache = { url: res.url, state: res.state, at: Date.now() };
        return res.url;
      }
    } catch (e) {
      console.warn("Backend /auth/google/url request failed, using client OAuth fallback", e);
    }

    const clientId =
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      "810637569983-c6evh2ce0evjkgdmsgcicghl4lmnvfer.apps.googleusercontent.com";
    const state = crypto.randomUUID().replace(/-/g, "");
    rememberGoogleState(state);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(
      callbackUrl
    )}&state=${state}&access_type=offline&prompt=consent`;
  };

  // Reuse a URL fetched moments ago (the login page prefetches it); a click then
  // redirects to Google instantly instead of waiting on an API round trip.
  const getGoogleAuthUrl = () => {
    // Only while its state is still the one this tab will check on return.
    if (googleUrlCache && Date.now() - googleUrlCache.at < GOOGLE_URL_TTL_MS && readGoogleState() === googleUrlCache.state) {
      return Promise.resolve(googleUrlCache.url);
    }
    googleUrlPending ??= fetchGoogleAuthUrl().finally(() => {
      googleUrlPending = null;
    });
    return googleUrlPending;
  };

  const logout = async () => {
    try {
      await request("/api/v1/auth/logout", { method: "POST" });
    } finally {
      clearAuthToken();
      setToken(null);
      setUser(null);
      queryClient.clear();
      try {
        sessionStorage.removeItem("creo_last_route");
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sendOtp,
        verifyOtp,
        loginWithPassword,
        register,
        registerIntent,
        resendRegistration,
        verifyRegistration,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        directResetPassword,
        setMandatoryPassword,
        getGoogleAuthUrl,
        completeSignIn: adoptSession,
        logout,
        refresh,
        patchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
