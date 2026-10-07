import "../../styles/public-responsive.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Check, AlertCircle, ArrowRight, Lock, Loader2 } from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { setAuthToken } from "../../lib/auth-token";
import type { AuthUser } from "../../lib/auth-context";
import { getRoleHome } from "../../components/auth/ProtectedRoute";
import { getPostLoginRedirect } from "../../lib/useRouteMemory";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  // Handshake step indicator
  const [step, setStep] = useState<number>(1);

  // Prevent duplicate execution from StrictMode or re-renders
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(2), 600);
    const t2 = setTimeout(() => setStep(3), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setAuthToken(token);
      refresh()
        .then(() => {
          setStatus("success");
          setTimeout(() => {
            const destination = getPostLoginRedirect("client", null, "/portal");
            navigate(destination);
          }, 900);
        })
        .catch(() => {
          setStatus("success");
          setTimeout(() => {
            navigate("/portal");
          }, 900);
        });
      return;
    }

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
          localStorage.setItem("creo_auth_user", JSON.stringify(res.user));
          await refresh();
          setStatus("success");
          setTimeout(() => {
            const defaultHome = getRoleHome(res.user.role);
            const destination = getPostLoginRedirect(res.user.role, null, defaultHome);
            navigate(destination);
          }, 900);
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
    <div className="auth-page min-h-[100svh] w-full bg-[#050810] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Subtle Night Navy depth backdrop (admin screens style) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,#0B111C_0%,#050810_100%)] pointer-events-none -z-10"
      />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-[760px] mx-auto rounded-[22px] border border-[#2A3446] bg-[#161F2D] py-8 sm:py-12 px-4 sm:px-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
        {/* Authentication Connection Row: Google → Lock → CREO */}
        <div className="relative flex items-center justify-between w-full max-w-[320px] mx-auto h-14">
          {/* Connector Line Exactly Through Centers */}
          <div className="absolute inset-x-7 top-1/2 -translate-y-1/2 h-px bg-[#2A3446]" />
          <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-[#7FA0D6]/40 to-transparent" />

          {/* 1. Google Icon: dark Surface container, Steel Line border */}
          <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-[#0B111C] border border-[#2A3446] shadow-sm shrink-0">
            <svg className="size-6" viewBox="0 0 24 24">
              <path
                fill="#7FA0D6"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#7FA0D6"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#D8BF9B"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#D8BF9B"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          {/* 2. Lock: compact circular Night Navy/Surface control, periwinkle lock icon, subtle #7FA0D6 active ring */}
          <div className="relative z-10 flex size-9 items-center justify-center rounded-full bg-[#0B111C] border border-[#2A3446] ring-1 ring-[#7FA0D6]/30 shadow-xs shrink-0">
            <Lock className="size-3.5 text-[#BCCCE6]" />
          </div>

          {/* 3. CREO Icon: Periwinkle #BCCCE6 button-like tile, dark #050810 "C", subtle Glow Blue edge */}
          <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-[#BCCCE6] border border-[#7FA0D6]/40 shadow-sm shrink-0">
            <span className="font-mono font-black text-2xl text-[#050810] leading-none select-none">
              C
            </span>
          </div>
        </div>

        {/* Status Content */}
        <div className="mt-8 flex flex-col items-center w-full">
          {/* Status: Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center w-full">
              <div className="relative flex items-center justify-center size-12 rounded-full bg-[#0B111C] border border-[#2A3446] mb-6 shadow-xs">
                <Loader2 className="size-5 text-[#7FA0D6] animate-spin" />
              </div>

              <h1 className="text-[30px] sm:text-[32px] font-semibold text-[#F8FAFC] tracking-tight leading-tight">
                Signing in with Google
              </h1>
              <p className="text-[14px] sm:text-[15px] font-normal text-[#97A0B3] mt-2.5 sm:mt-3 leading-relaxed max-w-lg">
                {step === 1 && "Verifying secure cryptographic signature…"}
                {step === 2 && "Synchronizing workspace credentials & profile…"}
                {step >= 3 && "Configuring authenticated session…"}
              </p>

              <div className="inline-flex items-center gap-2.5 h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-[#0B111C] border border-[#2A3446] mt-6 shadow-xs">
                <Loader2 className="size-4 animate-spin text-[#7FA0D6]" />
                <span className="text-[13px] sm:text-[14px] font-semibold text-[#BCCCE6]">
                  Authenticating session…
                </span>
              </div>
            </div>
          )}

          {/* Status: Success */}
          {status === "success" && (
            <div className="flex flex-col items-center w-full">
              {/* Success Indicator: dark circular base, Periwinkle/Glow Blue check mark, thin concentric ring, subtle pulse */}
              <div className="relative flex items-center justify-center size-14 mb-6">
                <div className="absolute inset-0 rounded-full border border-[#7FA0D6]/35 animate-ping opacity-30" />
                <div className="size-12 rounded-full bg-[#0B111C] border border-[#2A3446] flex items-center justify-center shadow-xs relative z-10">
                  <Check className="size-5 text-[#BCCCE6]" strokeWidth={2.5} />
                </div>
              </div>

              <h1 className="text-[30px] sm:text-[32px] font-semibold text-[#F8FAFC] tracking-tight leading-tight">
                Welcome, {authenticatedUser?.full_name?.split(" ")[0] || "Jai"}!
              </h1>
              <p className="text-[14px] sm:text-[15px] font-normal text-[#97A0B3] mt-2.5 sm:mt-3 leading-relaxed max-w-lg">
                Authentication confirmed. Launching your production workspace…
              </p>

              {/* Redirect State: Nebula-style control */}
              <div className="inline-flex items-center gap-2.5 h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-[#0B111C] border border-[#2A3446] mt-6 shadow-xs">
                <Loader2 className="size-4 animate-spin text-[#7FA0D6]" />
                <span className="text-[13px] sm:text-[14px] font-semibold text-[#BCCCE6]">
                  Redirecting automatically
                </span>
              </div>
            </div>
          )}

          {/* Status: Error */}
          {status === "error" && (
            <div className="flex flex-col items-center w-full">
              <div className="size-12 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#D8BF9B] flex items-center justify-center mb-6 shadow-xs">
                <AlertCircle className="size-6 text-[#D8BF9B]" />
              </div>

              <h1 className="text-[30px] sm:text-[32px] font-semibold text-[#F8FAFC] tracking-tight leading-tight">
                Authentication Failed
              </h1>
              <p className="text-[14px] sm:text-[15px] font-normal text-[#97A0B3] bg-[#0B111C] p-4 rounded-xl border border-[#2A3446] mt-4 leading-relaxed max-w-md text-center">
                {errorMessage}
              </p>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#BCCCE6] px-6 py-2.5 text-[13px] font-semibold text-[#050810] hover:bg-white transition-colors"
                >
                  Back to Sign In <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Message: Card → footer spacing 48–56px */}
      <div className="flex items-center justify-center gap-3 w-full max-w-[540px] mx-auto mt-12 sm:mt-14 text-[12px] sm:text-[13px] text-[#97A0B3]">
        <div className="h-px bg-[#2A3446] flex-1 hidden sm:block" />
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
          <span>Protected by Creo Zero-Trust Infrastructure</span>
          <span className="text-[#2A3446]">&middot;</span>
          <a
            href="https://wa.me/919941999415"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#BCCCE6] font-medium hover:underline hover:text-white transition-colors"
          >
            Need Support?
          </a>
        </div>
        <div className="h-px bg-[#2A3446] flex-1 hidden sm:block" />
      </div>
    </div>
  );
}
