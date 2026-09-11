import React, { createContext, useContext, useEffect, useState } from "react";
import { request } from "./http";
import { getAuthToken, setAuthToken } from "./auth-token";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_status: string;
  onboarding_stage: number;
  terms_accepted?: boolean;
  must_reset_password?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  sendOtp: (email: string, full_name?: string) => Promise<{ status: string; message: string }>;
  verifyOtp: (email: string, code: string, full_name?: string) => Promise<AuthUser>;
  loginWithPassword: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, full_name?: string) => Promise<AuthUser>;
  registerIntent: (email: string, password: string, full_name?: string) => Promise<{ status: string; message: string }>;
  verifyRegistration: (email: string, code: string, password: string, full_name?: string) => Promise<AuthUser>;
  forgotPassword: (email: string) => Promise<{ status: string; message: string }>;
  verifyResetOtp: (email: string, code: string) => Promise<AuthUser>;
  setMandatoryPassword: (newPassword: string) => Promise<void>;
  getGoogleAuthUrl: () => Promise<string>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    setAuthToken(newToken);
  };

  const refresh = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await request<AuthUser & { access_token?: string }>("/api/v1/auth/me");
      if (data.access_token && data.access_token !== currentToken) {
        setToken(data.access_token);
      }
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
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
    const res = await request<{ access_token: string; user: AuthUser }>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code, full_name }),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await request<{ access_token: string; user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, password: string, full_name?: string) => {
    const res = await request<{ access_token: string; user: AuthUser }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const registerIntent = async (email: string, password: string, full_name?: string) => {
    return await request<{ status: string; message: string }>("/api/v1/auth/register-intent", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
  };

  const verifyRegistration = async (email: string, code: string, password: string, full_name?: string) => {
    const res = await request<{ access_token: string; user: AuthUser }>("/api/v1/auth/verify-registration", {
      method: "POST",
      body: JSON.stringify({ email, code, password, full_name }),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const forgotPassword = async (email: string) => {
    return await request<{ status: string; message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const verifyResetOtp = async (email: string, code: string) => {
    const res = await request<{ access_token: string; user: AuthUser }>("/api/v1/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const setMandatoryPassword = async (newPassword: string) => {
    const res = await request<{ status: string; user: AuthUser }>("/api/v1/auth/set-mandatory-password", {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    });
    if (res.user) {
      setUser(res.user);
    } else {
      setUser((prev) => (prev ? { ...prev, must_reset_password: false } : null));
    }
  };

  const getGoogleAuthUrl = async () => {
    const callbackUrl = window.location.origin + "/auth/google/callback";
    try {
      const res = await request<{ url: string }>(
        `/api/v1/auth/google/url?redirect_uri=${encodeURIComponent(callbackUrl)}`
      );
      if (res?.url) return res.url;
    } catch (e) {
      console.warn("Backend /auth/google/url request failed, using client OAuth fallback", e);
    }

    const clientId =
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      "810637569983-c6evh2ce0evjkgdmsgcicghl4lmnvfer.apps.googleusercontent.com";
    const state = Math.random().toString(36).substring(2);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(
      callbackUrl
    )}&state=${state}&access_type=offline&prompt=consent`;
  };

  const logout = async () => {
    try {
      await request("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
      setUser(null);
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
        verifyRegistration,
        forgotPassword,
        verifyResetOtp,
        setMandatoryPassword,
        getGoogleAuthUrl,
        logout,
        refresh,
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
