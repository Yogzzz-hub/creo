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
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Edit2,
  Clipboard,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { OtpPinInput } from "../../components/ui/OtpPinInput";

type AuthView = "login" | "signup" | "otp" | "forgot" | "forgot_otp";

export function AuthPage({ defaultView = "login" }: { defaultView?: "login" | "signup" }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    loginWithPassword,
    registerIntent,
    verifyRegistration,
    forgotPassword,
    verifyResetOtp,
    sendOtp,
    verifyOtp,
    getGoogleAuthUrl,
  } = useAuth();

  const [view, setView] = useState<AuthView>(defaultView);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(searchParams.get("name") || "");
  const [otpCode, setOtpCode] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<{
    email: string;
    password: string;
    fullName: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(60);

  // Track whether branding panel is on the right (signup mode) or left (login mode)
  const isRightPanel = view === "signup" || view === "otp";

  // Auto decrement OTP countdown timer
  useEffect(() => {
    if ((view !== "otp" && view !== "forgot_otp") || otpCountdown <= 0) return;
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
      setError(err.message || "Invalid email or password. Please check your credentials.");
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
      // Step 1: Send OTP to email and transition to OTP screen
      await registerIntent(email, password, fullName);
      setPendingRegistration({ email, password, fullName });
      setOtpCode("");
      setView("otp");
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to initiate registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setOtpCode("");
      setView("forgot_otp");
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err.message || "Could not send reset code. Please check that this email exists.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (view === "forgot_otp") {
        await forgotPassword(email);
      } else if (pendingRegistration) {
        await registerIntent(pendingRegistration.email, pendingRegistration.password, pendingRegistration.fullName);
      } else {
        await sendOtp(email, fullName);
      }
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
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
      if (view === "forgot_otp") {
        const user = await verifyResetOtp(email, codeToVerify);
        routeByRole(user.role);
        return;
      }

      if (pendingRegistration) {
        const user = await verifyRegistration(
          pendingRegistration.email,
          codeToVerify,
          pendingRegistration.password,
          pendingRegistration.fullName
        );
        routeByRole(user.role);
        return;
      }

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

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
  };

  // ── Branding Panel Content ──
  const renderBrandingPanel = () => (
    <div className="relative h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 overflow-hidden">
      {/* Ambient Light Meshes */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-sky-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-64 rounded-full bg-blue-200/20 blur-2xl" />

      {/* Top Pill / Status */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200/70 px-3 py-1 text-xs font-bold text-[#2B7BC4] uppercase tracking-wide shadow-2xs">
          <Sparkles className="size-3 text-[#0EA5E9]" />
          <span>On-Demand Content Retainer</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-white/80 border border-slate-200/80 rounded-full px-2.5 py-0.5">
          Enterprise Ready
        </span>
      </div>

      {/* Core Content */}
      <div className="relative z-10 my-auto py-2 space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-[#0D2137] leading-tight">
            {isRightPanel ? "Scale your brand with dedicated creative talent" : "Welcome to your creative workspace"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            High-converting social deliverables, viral video reels, and studio designs produced with predictable turnaround times.
          </p>
        </div>

        {/* Value Highlights */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-2xs hover:border-[#2B7BC4]/40 hover:shadow-xs transition-all group">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2B7BC4] group-hover:scale-105 transition-transform">
              <Zap className="size-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0D2137]">Dedicated Creative Squad</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Experienced art directors, editors, and copywriters assigned to your brand.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-2xs hover:border-[#2B7BC4]/40 hover:shadow-xs transition-all group">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#0EA5E9] group-hover:scale-105 transition-transform">
              <TrendingUp className="size-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0D2137]">Guaranteed SLAs & Cadence</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Strict 48-hour revision turnarounds with calendar auto-publishing.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-2xs hover:border-[#2B7BC4]/40 hover:shadow-xs transition-all group">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0D2137]">Zero-Trust Enterprise Security</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">End-to-end cryptographic JWT authentication with protected asset isolation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Trust Note */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-3 mt-3 border-t border-slate-200/70">
        <span>© {new Date().getFullYear()} Creo Technologies Inc.</span>
        <span className="font-semibold text-slate-700 flex items-center gap-1">
          <span className="text-amber-500">★</span> 4.9/5 Rating from Top Brands
        </span>
      </div>
    </div>
  );

  // ── Form Panel Content ──
  const renderFormPanel = () => (
    <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10 bg-white h-full">
      <div className="w-full max-w-sm mx-auto space-y-4">

        {/* View Switcher Tabs (Sign In vs Create Account) — only on login/signup */}
        {view !== "otp" && view !== "forgot_otp" && view !== "forgot" && (
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => switchView("login")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                view === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchView("signup")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                view === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-medium text-rose-700 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
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
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError(null);
                  }}
                  className="text-xs font-semibold text-[#2B7BC4] hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : (redirectedFrom?.includes("admin") ? "Sign In to Admin Operations" : "Sign In to Creo")}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>
        )}

        {/* 2. SIGNUP FORM */}
        {view === "signup" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
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
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
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
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters (letters & numbers)"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Minimum 8 characters with at least one letter and number. A 6-digit OTP will verify your email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account & Send OTP"}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD REQUEST FORM */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div className="space-y-1 pb-1">
              <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500">
                Enter your registered account email and we'll send a 6-digit reset code to your inbox.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B7BC4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2B7BC4]/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Code"}
              {!loading && <ArrowRight className="size-4" />}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 4. OTP VERIFICATION FORM */}
        {(view === "otp" || view === "forgot_otp") && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1.5 pb-1">
              <div className="mx-auto size-11 rounded-2xl bg-sky-50 border border-sky-200/70 flex items-center justify-center text-[#2B7BC4] shadow-xs">
                <KeyRound className="size-5 text-[#2B7BC4]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {view === "forgot_otp" ? "Reset Code Verification" : "Verify Your Email"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {view === "forgot_otp"
                  ? "Enter the 6-digit reset code sent to your email:"
                  : "We sent a 6-digit verification code to complete your setup:"}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-slate-100 rounded-full border border-slate-200 text-xs font-semibold text-slate-800">
                <Mail className="size-3 text-[#2B7BC4]" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => setView(view === "forgot_otp" ? "forgot" : "signup")}
                  className="ml-1 text-slate-400 hover:text-[#2B7BC4] transition-colors cursor-pointer"
                  title="Change email"
                >
                  <Edit2 className="size-3" />
                </button>
              </div>
            </div>

            {/* 6-Digit Segmented PIN Input */}
            <div className="py-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 text-center">
                Enter 6-Digit Security Code
              </label>
              <OtpPinInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => handleVerifyOtp(undefined, code)}
                disabled={loading}
                hasError={Boolean(error)}
                showDemoFill={false}
              />
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/\D/g, "").slice(0, 6);
                      if (digits) {
                        setOtpCode(digits);
                        if (digits.length === 6) {
                          handleVerifyOtp(undefined, digits);
                        }
                      }
                    } catch (err) {
                      // User denied clipboard permission or not supported
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B7BC4] hover:text-[#174e82] transition-colors py-1 px-2.5 rounded-lg hover:bg-sky-50 cursor-pointer"
                  title="Paste verification code from clipboard"
                >
                  <Clipboard className="size-3.5" />
                  <span>Paste code from clipboard</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : view === "forgot_otp" ? (
                "Verify Code & Reset Password"
              ) : (
                "Verify & Complete Account"
              )}
              {!loading && <CheckCircle2 className="size-4" />}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={() => setView(view === "forgot_otp" ? "forgot" : "signup")}
                className="text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="size-3" />
                <span>Change Email</span>
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpCountdown > 0 || loading}
                className="font-semibold text-[#2B7BC4] hover:underline disabled:text-slate-400 disabled:no-underline transition-colors cursor-pointer"
              >
                {otpCountdown > 0 ? (
                  <span className="tabular-nums">Resend in {otpCountdown}s</span>
                ) : (
                  "Resend Code"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Social Divider & Google OAuth */}
        {view !== "otp" && view !== "forgot_otp" && (
          <>
            <div className="relative flex items-center justify-center pt-1">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-xs uppercase text-slate-400">or</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200/90 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
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

        <p className="text-center text-[11px] text-slate-400 pt-1">
          By continuing, you agree to Creo's{" "}
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
  );

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-y-auto lg:overflow-hidden bg-[#030914] flex flex-col justify-between p-3 sm:p-5 lg:p-6 text-slate-900 antialiased relative">
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
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-1 relative z-10 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform border border-white/20">
            <span className="font-mono text-lg font-black text-white">C</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">Creo</span>
            <span className="text-[9px] font-bold tracking-wider text-cyan-300 uppercase">
              Digital Agency Platform
            </span>
          </div>
        </Link>

      </header>

      {/* ── Main Sliding Dual-Panel Container ─────────────────────────── */}
      <div className="max-w-5xl w-full mx-auto my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-black/50 overflow-hidden relative z-10 shrink">
        {/* Desktop: Sliding Dual-Panel Layout */}
        <div className="hidden lg:grid grid-cols-2 relative" style={{ minHeight: 560 }}>
          <div className={`h-full overflow-y-auto ${isRightPanel ? "order-1" : "order-2"}`}>
            {renderFormPanel()}
          </div>
          <div
            className={`h-full bg-gradient-to-br from-white/95 via-slate-50/90 to-sky-50/70 border-slate-200/80 backdrop-blur-md transition-all duration-500 ease-in-out ${
              isRightPanel
                ? "order-2 border-l shadow-[-8px_0_30px_-5px_rgba(15,23,42,0.12)]"
                : "order-1 border-r shadow-[8px_0_30px_-5px_rgba(15,23,42,0.12)]"
            }`}
          >
            {renderBrandingPanel()}
          </div>
        </div>

        {/* Mobile: Stacked Layout (no sliding, just vertical stack) */}
        <div className="lg:hidden">
          <div className="bg-gradient-to-br from-white via-slate-50/70 to-sky-50/40 border-b border-slate-200/80">
            {renderBrandingPanel()}
          </div>
          {renderFormPanel()}
        </div>
      </div>

      {/* ── Bottom Footer Help Note ─────────────────────────────────────── */}
      <footer className="text-center text-xs text-white/70 py-1 relative z-10 shrink-0">
        <span>Need assistance with your account? </span>
        <a
          href="https://wa.me/919941999415"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 font-semibold hover:text-white hover:underline cursor-pointer transition-colors"
        >
          Contact Dedicated Support
        </a>
      </footer>
    </div>
  );
}
