import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Edit2,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { OtpPinInput } from "../../components/ui/OtpPinInput";

type AuthView = "login" | "signup" | "otp";

export function AuthPage({ defaultView = "login" }: { defaultView?: "login" | "signup" }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithPassword, register, sendOtp, verifyOtp, getGoogleAuthUrl } = useAuth();

  const [view, setView] = useState<AuthView>(defaultView);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(searchParams.get("name") || "");
  const [otpCode, setOtpCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(60);

  // Auto decrement OTP countdown timer
  useEffect(() => {
    if (view !== "otp" || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [view, otpCountdown]);

  const selectedPlan = searchParams.get("plan");
  const redirectedFrom = searchParams.get("redirectedFrom");

  const routeByRole = (role: string) => {
    if (redirectedFrom) {
      const decoded = decodeURIComponent(redirectedFrom);
      const isTeam = role === "team_member" || role === "team_lead";
      const isAdminOnly =
        decoded === "/admin" ||
        decoded === "/admin/" ||
        decoded === "/admin/dashboard" ||
        decoded === "/admin/clients" ||
        decoded === "/admin/reports" ||
        decoded === "/admin/kpi" ||
        decoded === "/admin/sales" ||
        decoded === "/admin/settings" ||
        decoded === "/admin/escalations" ||
        decoded === "/admin/addons";

      if (isTeam && isAdminOnly) {
        navigate("/dashboard");
        return;
      }

      navigate(decoded);
      return;
    }

    if (role === "admin" || role === "super_admin") {
      navigate("/admin");
    } else if (role === "team_member" || role === "team_lead") {
      navigate("/dashboard");
    } else {
      if (selectedPlan) {
        navigate(`/onboarding/terms?plan=${selectedPlan}`);
      } else {
        navigate("/portal");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithPassword(email, password);
      routeByRole(user.role);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Please fill in all fields (Full Name, Email, and Password).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await register(email, password, fullName);
      routeByRole(user.role);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(email, fullName);
      setView("otp");
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, explicitCode?: string) => {
    if (e) e.preventDefault();
    const codeToVerify = explicitCode || otpCode;
    if (!codeToVerify || codeToVerify.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const user = await verifyOtp(email, codeToVerify, fullName);
      routeByRole(user.role);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setError("Failed to initialize Google authentication.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white text-[#0D2137]">
      {/* ── LEFT HALF: Full-height Branded Showcase ───────────────────── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-[#0D2137] p-12 text-white">
        {/* Glow meshes */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#2B7BC4]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-24 size-96 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        {/* Header / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] shadow-md">
              <span className="font-mono text-xl font-black text-white">C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white">Creo</span>
              <span className="text-[10px] font-semibold tracking-wider text-[#6BAED6] uppercase">
                Digital Agency Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[#6BAED6]">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Client Hub
          </div>
        </div>

        {/* Showcase Content */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#2B7BC4]/20 border border-[#2B7BC4]/30 px-3 py-1 text-xs font-semibold text-[#6BAED6] uppercase">
              <Sparkles className="size-3.5 text-[#0EA5E9]" />
              Creative Growth Engine
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white">
              {view === "login" ? "Grow your brand with Creo" : "Start growing your brand with Creo"}
            </h1>
            <p className="max-w-md text-base text-[#6BAED6]/90 leading-relaxed">
              Supercharge your social presence, on-demand creative deliverables, and content operations in one unified workspace.
            </p>
          </div>

          {/* Performance Card */}
          <div className="relative max-w-lg rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#2B7BC4] text-white">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-[#6BAED6]">Monthly Reach & Engagement</p>
                  <p className="text-lg font-bold text-white">+342.8% YoY</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                Accelerating
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-[#0EA5E9]" />
                    Reels & Video Production
                  </span>
                  <span className="font-mono text-[#6BAED6]">100% Scheduled</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#2B7BC4] to-[#0EA5E9]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="size-3.5 text-[#6BAED6]" />
                    Studio Posters & Ad Collateral
                  </span>
                  <span className="font-mono text-[#6BAED6]">On-time Delivery</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#2B7BC4] to-[#6BAED6]" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-xs text-[#6BAED6] border border-white/5">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                Dedicated Creative Team & SLA Guarantee
              </span>
              <span className="font-bold text-white">4.9/5 ★</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Creo Marketing Technologies. High-converting creative execution.
        </div>
      </div>

      {/* ── RIGHT HALF: Auth Interaction Form ─────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* View Switcher Tabs (Sign In vs Create Account) */}
          {view !== "otp" && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  view === "login"
                    ? "bg-white text-[#0D2137] shadow-sm"
                    : "text-slate-500 hover:text-[#0D2137]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("signup");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  view === "signup"
                    ? "bg-white text-[#0D2137] shadow-sm"
                    : "text-slate-500 hover:text-[#0D2137]"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-[#0D2137] placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-[#0D2137] placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 py-3 text-sm font-bold text-white shadow-md shadow-[#2B7BC4]/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : (redirectedFrom?.includes("admin") ? "Sign In to Admin Operations" : "Sign In to Creo")}
                {!loading && <ArrowRight className="size-4" />}
              </button>

              {/* Quick Demo Credentials */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-center">
                  Quick Demo Access (1-Click Fill)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@creo.agency");
                      setPassword("CreoAdmin2026!");
                    }}
                    className="flex flex-col items-center py-1.5 px-2 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                  >
                    <span className="text-[11px]">🛡️ Admin</span>
                    <span className="text-[9px] text-indigo-500 font-normal">Super Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("lead@creo.agency");
                      setPassword("CreoLead2026!");
                    }}
                    className="flex flex-col items-center py-1.5 px-2 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
                  >
                    <span className="text-[11px]">⚡ Lead</span>
                    <span className="text-[9px] text-amber-500 font-normal">Team Lead</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("client5@stage5.com");
                      setPassword("Client123!");
                    }}
                    className="flex flex-col items-center py-1.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                  >
                    <span className="text-[11px]">👤 Client</span>
                    <span className="text-[9px] text-emerald-500 font-normal">Brand Portal</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 2. SIGNUP FORM */}
          {view === "signup" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name / Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-[#0D2137] placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@urbanbakes.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-[#0D2137] placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min. 6 characters)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-[#0D2137] placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Must be at least 6 characters. Saved securely with encryption.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 py-3 text-sm font-bold text-white shadow-md shadow-[#2B7BC4]/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                {!loading && <ArrowRight className="size-4" />}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!email || loading}
                  className="text-xs text-[#2B7BC4] hover:underline disabled:text-slate-400 disabled:no-underline font-medium transition-colors"
                >
                  Prefer email verification code without password? Send OTP
                </button>
              </div>
            </form>
          )}

          {/* 3. OTP VERIFICATION FORM */}
          {view === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-2 pb-1">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#E8F4FD] border border-[#C9DFF0] flex items-center justify-center text-[#2B7BC4] shadow-xs">
                  <KeyRound className="size-6 text-[#2B7BC4]" />
                </div>
                <h3 className="text-lg font-bold text-[#0D2137]">Check Your Email</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  We sent a 6-digit verification code to
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/80 text-xs font-semibold text-[#0D2137]">
                  <Mail className="size-3 text-[#2B7BC4]" />
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => setView("signup")}
                    className="ml-1 text-slate-400 hover:text-[#2B7BC4] transition-colors"
                    title="Change email"
                  >
                    <Edit2 className="size-3" />
                  </button>
                </div>
              </div>

              {/* Enhanced 6-Digit Segmented PIN Input */}
              <div className="py-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 text-center">
                  Enter 6-Digit Security Code
                </label>
                <OtpPinInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => handleVerifyOtp(undefined, code)}
                  disabled={loading}
                  hasError={Boolean(error)}
                  showDemoFill={true}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 4}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 py-3 text-sm font-bold text-white shadow-md shadow-[#2B7BC4]/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify & Continue"}
                {!loading && <CheckCircle2 className="size-4" />}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => setView("signup")}
                  className="text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
                >
                  <Edit2 className="size-3" />
                  <span>Change Email</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpCountdown > 0 || loading}
                  className="font-semibold text-[#2B7BC4] hover:underline disabled:text-slate-400 disabled:no-underline transition-colors"
                >
                  {otpCountdown > 0 ? (
                    <span className="tabular-nums">Resend code in {otpCountdown}s</span>
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400 pt-1">
                Can't find the email? Please check your Spam or Promotions folder.
              </p>
            </form>
          )}

          {/* Social Divider & Google OAuth */}
          {view !== "otp" && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-3 text-xs uppercase text-slate-400">or</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
              >
                <svg className="size-4" viewBox="0 0 24 24">
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
                Continue with Google
              </button>
            </>
          )}

          <p className="text-center text-xs text-slate-400">
            By continuing, you agree to Creo’s{" "}
            <Link to="/terms" className="text-[#2B7BC4] hover:underline">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-[#2B7BC4] hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
