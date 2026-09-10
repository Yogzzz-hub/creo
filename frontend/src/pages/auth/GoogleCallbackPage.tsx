import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Lock, Sparkles } from "lucide-react";
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

  // Handshake step indicator
  const [step, setStep] = useState<number>(1);

  // Prevent duplicate execution from StrictMode or re-renders
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    // Cycle through subtle handshake steps for visual polish
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
      refresh().then(() => {
        setStatus("success");
        setTimeout(() => {
          navigate("/dashboard");
        }, 600);
      }).catch(() => {
        setStatus("success");
        setTimeout(() => {
          navigate("/dashboard");
        }, 600);
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
          await refresh();
          setStatus("success");
          setTimeout(() => {
            if (res.user.role === "admin" || res.user.role === "super_admin") {
              navigate("/admin");
            } else if (
              res.user.role === "team_member" ||
              res.user.role === "team_lead" ||
              res.user.role === "editor" ||
              res.user.role === "designer"
            ) {
              navigate("/dashboard");
            } else {
              navigate("/portal");
            }
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
    <div className="h-screen w-screen fixed inset-0 overflow-hidden bg-[#030914] flex flex-col justify-between p-4 sm:p-6 select-none antialiased">
      {/* ── Animated AI Background Layer ─────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -inset-10 bg-cover bg-center animate-ai-bg-drift filter brightness-[0.70] contrast-[1.12]"
          style={{ backgroundImage: `url('/assets/auth_bg.jpg')` }}
        />
        {/* Atmospheric Cinematic Sapphire Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030A16]/85 via-[#07192F]/65 to-[#040D1A]/90 backdrop-blur-[2px]" />
        {/* Animated Ambient Light Pulses */}
        <div className="absolute -top-28 -left-28 w-[520px] h-[520px] bg-blue-500/20 rounded-full blur-[120px] animate-ai-orb-1" />
        <div className="absolute -bottom-28 -right-28 w-[580px] h-[580px] bg-cyan-400/15 rounded-full blur-[130px] animate-ai-orb-2" />
      </div>

      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-1 relative z-10 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform border border-white/20">
            <span className="font-mono text-base font-black text-white">C</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white drop-shadow-sm">Creo</span>
            <span className="text-[8px] font-bold tracking-wider text-cyan-300 uppercase">
              Identity Services
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-200/80 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
          <Lock className="size-3 text-cyan-300" />
          <span>TLS 1.3 / OAuth 2.0</span>
        </div>
      </header>

      {/* ── Main Handshake Card ─────────────────────────────────────────── */}
      <div className="relative w-full max-w-md mx-auto my-auto rounded-3xl border border-white/40 bg-white/95 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] text-center space-y-6 z-10 animate-page-in">
        {/* Dual Brand Handshake Bridge: Google <───> Creo */}
        <div className="relative flex items-center justify-center gap-4 py-2">
          {/* Connecting Handshake Line with Pulse */}
          <div className="absolute inset-x-20 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-blue-300 via-[#2B7BC4] to-cyan-300 opacity-60">
            <div className="size-2 rounded-full bg-cyan-400 absolute top-1/2 -translate-y-1/2 animate-[ping_1.6s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ left: "50%" }} />
          </div>

          {/* Google Icon Container */}
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white border border-slate-200/80 shadow-md shadow-slate-200/50 hover:scale-105 transition-transform z-10">
            <svg className="size-7" viewBox="0 0 24 24">
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

          {/* Central Animated Badge */}
          <div className="z-10 flex size-8 items-center justify-center rounded-full bg-slate-900 border-2 border-white shadow-md text-cyan-400 text-xs">
            <Sparkles className="size-3.5 animate-spin" style={{ animationDuration: "6s" }} />
          </div>

          {/* Creo Logo Container */}
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2B7BC4] to-[#1E609A] text-white font-black text-2xl shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform z-10 border border-blue-400/30">
            C
          </div>
        </div>

        {/* Status: Loading */}
        {status === "loading" && (
          <div className="space-y-4 pt-1">
            {/* Pulsing Concentric Ring Spinner */}
            <div className="relative mx-auto size-14">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100/80 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-3 border-blue-200/60" />
              <div className="size-14 rounded-full border-3 border-transparent border-t-[#2B7BC4] border-r-[#0EA5E9] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="size-5 text-[#2B7BC4]" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#0D2137] tracking-tight">
                Signing in with Google
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                {step === 1 && "Verifying secure cryptographic signature..."}
                {step === 2 && "Synchronizing workspace credentials & profile..."}
                {step >= 3 && "Configuring authenticated session..."}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/70 text-[11px] font-bold text-[#2B7BC4] shadow-2xs">
              <ShieldCheck className="size-3.5 text-[#0EA5E9]" />
              <span>OAuth 2.0 Encrypted Handshake</span>
            </div>
          </div>
        )}

        {/* Status: Success */}
        {status === "success" && (
          <div className="space-y-4 pt-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="size-14 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="size-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#0D2137] tracking-tight">
                Welcome, {authenticatedUser?.full_name?.split(" ")[0] || "there"}!
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Authentication confirmed. Launching your Creo production portal...
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Redirecting automatically</span>
            </div>
          </div>
        )}

        {/* Status: Error */}
        {status === "error" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            <div className="size-14 rounded-full bg-rose-50 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-md shadow-rose-500/10">
              <AlertCircle className="size-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#0D2137]">Authentication Failed</h2>
              <p className="text-xs text-rose-700 bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200/80 mt-2.5 leading-relaxed text-left">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:brightness-110 active:scale-95 transition-all"
              >
                Back to Sign In <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Footer Help Note ─────────────────────────────────────── */}
      <footer className="text-center text-xs text-white/70 py-1 relative z-10 shrink-0">
        <span>Protected by Creo Zero-Trust Infrastructure · </span>
        <a
          href="https://wa.me/919941999415"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 font-semibold hover:text-white hover:underline cursor-pointer transition-colors"
        >
          Need Support?
        </a>
      </footer>
    </div>
  );
}

