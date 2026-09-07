import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { setAuthToken } from "../../lib/auth-token";
import type { AuthUser } from "../../lib/auth-context";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  // Prevent duplicate execution from StrictMode or re-renders
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received from Google.");
      return;
    }

    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const res = await request<{ access_token: string; user: AuthUser }>(
          "/api/v1/auth/google/callback",
          {
            method: "POST",
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          },
        );

        if (res.access_token) {
          setAuthToken(res.access_token);
          setAuthenticatedUser(res.user);
          await refresh();
          setStatus("success");
          setTimeout(() => {
            if (res.user.role === "admin" || res.user.role === "super_admin") {
              navigate("/admin");
            } else if (res.user.role === "team_member" || res.user.role === "team_lead") {
              navigate("/dashboard");
            } else {
              navigate("/portal");
            }
          }, 1000);
        }
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to exchange authorization code with Google.",
        );
      }
    };

    exchangeCode();
  }, [searchParams, navigate, refresh]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E8F4FD] via-[#DBEDF9] to-[#F0F8FF] px-4 overflow-hidden">
      {/* Background Ambient Lighting */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-page-in">
        {/* Dual Brand Icon: Google + Creo */}
        <div className="flex items-center justify-center gap-3">
          {/* Google Icon */}
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <svg className="size-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <span className="text-slate-300 font-light text-xl">×</span>

          {/* Creo Logo */}
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2B7BC4] to-[#1E609A] text-white font-black text-xl shadow-md shadow-blue-500/25">
            C
          </div>
        </div>

        {/* Status: Loading */}
        {status === "loading" && (
          <div className="space-y-4 pt-2">
            <div className="relative mx-auto size-12">
              <div className="absolute inset-0 rounded-full border-3 border-blue-100 animate-pulse" />
              <div className="size-12 rounded-full border-3 border-transparent border-t-[#2B7BC4] animate-spin" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#0D2137] tracking-tight">
                Signing in with Google
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                Securely verifying your credentials and synchronizing your Creo workspace...
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700">
              <ShieldCheck className="size-3.5 text-blue-600" />
              <span>OAuth 2.0 Encrypted Handshake</span>
            </div>
          </div>
        )}

        {/* Status: Success */}
        {status === "success" && (
          <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="size-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="size-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#0D2137]">
                Welcome, {authenticatedUser?.full_name?.split(" ")[0] || "there"}!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Authentication verified. Launching your production portal...
              </p>
            </div>
          </div>
        )}

        {/* Status: Error */}
        {status === "error" && (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div className="size-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#0D2137]">Authentication Failed</h2>
              <p className="text-xs text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100 mt-2 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-[#246bb0] hover:to-[#174e7e] transition-all"
              >
                Back to Sign In <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
