import "../../styles/public-responsive.css";
import { useState, useEffect } from "react";
import { 
  Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, User, Building2,
  Loader2, ShieldCheck, Zap
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";

import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";

const PENDING_REGISTRATION_KEY = "creo_pending_registration";

interface PendingRegistration {
  email: string;
  fullName: string;
  expiresAt: number;
}

function readPendingRegistration(): PendingRegistration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingRegistration;
    if (!pending.email || pending.expiresAt <= Date.now()) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function writePendingRegistration(email: string, fullName: string): void {
  sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
    email,
    fullName,
    expiresAt: Date.now() + 10 * 60_000,
  } satisfies PendingRegistration));
}

function clearPendingRegistration(): void {
  sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
}

export function AuthPage({ defaultView = "signin" }: { defaultView?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithPassword, registerIntent, resendRegistration, verifyRegistration, getGoogleAuthUrl } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const initialMode = location.pathname === "/signup" || defaultView === "signup" ? "signup" : "signin";
  const initialPending = initialMode === "signup" ? readPendingRegistration() : null;
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [rememberMe, setRememberMe] = useState(initialMode === "signin");

  // Controlled form state
  const queryEmail = new URLSearchParams(location.search).get("email") || "";
  const [email, setEmail] = useState(queryEmail || initialPending?.email || "");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  useEffect(() => {
    const qEmail = new URLSearchParams(location.search).get("email");
    if (qEmail) setEmail(qEmail);
  }, [location.search]);
  const [fullName, setFullName] = useState(initialPending?.fullName || "");
  const [registrationPending, setRegistrationPending] = useState(Boolean(initialPending));
  const [otpCode, setOtpCode] = useState("");

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  useEffect(() => {
    if (location.pathname === "/signup") {
      setMode("signup");
      setRememberMe(false);
    } else if (location.pathname === "/login" || location.pathname === "/signin") {
      setMode("signin");
      setRememberMe(true);
    }
  }, [location.pathname]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanPass) {
      setError("Please enter your email and password.");
      return;
    }
    
    if (mode === "signup" && !cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (mode === "signup" && !termsAccepted) {
      setError("Please accept the Terms & Privacy Policy to create an account.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (mode === "signin") {
        const loggedInUser = await loginWithPassword(cleanEmail, cleanPass);
        const { getRoleHome } = await import("../../components/auth/ProtectedRoute");
        const roleHome = getRoleHome(loggedInUser.role);

        // Strict role routing: admins go to /admin, clients go to /portal
        const r = (loggedInUser.role || "").toLowerCase();
        if (r === "admin" || r === "super_admin" || r.includes("admin")) {
          navigate("/admin", { replace: true });
        } else if (r === "client" || r === "client_owner" || r.includes("client")) {
          navigate("/portal", { replace: true });
        } else {
          navigate(roleHome, { replace: true });
        }
      } else {
        await registerIntent(cleanEmail, cleanPass, cleanName);
        writePendingRegistration(cleanEmail, cleanName);
        setRegistrationPending(true);
      }
    } catch (err: any) {
      console.error(err);
      if (mode === "signup") {
        setRegistrationPending(false);
        clearPendingRegistration();
      }
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyRegistration(email.trim(), otpCode, password.trim() || undefined, fullName.trim());
      clearPendingRegistration();
      navigate("/portal", { replace: true });
    } catch (err: any) {
      setError(err.message || "The verification code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendRegistrationCode() {
    try {
      setLoading(true);
      setError(null);
      if (password.trim()) {
        await registerIntent(email.trim(), password.trim(), fullName.trim());
      } else {
        await resendRegistration(email.trim());
      }
      writePendingRegistration(email.trim(), fullName.trim());
      setOtpCode("");
    } catch (err: any) {
      setError(err.message || "Unable to resend the verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page relative min-h-[100svh] w-full overflow-x-clip flex flex-col justify-between bg-[#050810] text-[#F8FAFC] font-sans selection:bg-[#7FA0D6]/30">
      
      {/* Background Ambient Glow & Grid Matrix */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#7FA0D6]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[300px] bg-[#BCCCE6]/5 rounded-full blur-[100px]" />
        <svg className="absolute w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7FA0D6" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
      </div>

      {/* ── Top Header Bar (Compact: 52px) ── */}
      <header className="relative z-20 h-13 shrink-0 flex items-center justify-between px-6 sm:px-10 border-b border-[#222F44]/40 bg-[#050810]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center text-xl font-black tracking-tight text-[#F8FAFC] hover:opacity-90 transition">
            <span>creo</span>
            <span className="text-[#7FA0D6] text-2xl leading-none">.</span>
          </Link>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#121926] border border-[#222F44] text-[10px] font-semibold text-[#7FA0D6] uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Client & team portal
          </div>
        </div>

        <div className="flex items-center gap-3">

          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#222F44] bg-[#0A0F18] text-[11px] font-semibold text-[#F8FAFC] hover:bg-[#121926] hover:border-[#7FA0D6]/40 transition shadow-xs"
          >
            <ArrowLeft className="size-3 text-[#97A0B3]" /> 
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* ── Main Fit-to-Screen Centerfold ── */}
      <main className="relative z-10 flex-1 min-w-0 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Agency OS Telemetry Feature Deck (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-4 pr-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#121926] border border-[#222F44] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#7FA0D6] w-fit shadow-xs">
              <Zap className="size-3 text-[#7FA0D6]" />
              CREATIVE WORKSPACE
            </div>

            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.1] text-[#F8FAFC]">
              One operating layer for high-velocity <span className="text-[#7FA0D6]">creative agencies.</span>
            </h1>

            <p className="text-xs text-[#97A0B3] leading-relaxed max-w-md">
              Replace WhatsApp silos and blind billing with live capacity meters, client approval gates, and unit margin telemetry in real time.
            </p>

            <div className="space-y-3 text-sm text-[#97A0B3]">
              <p>View your subscription and content calendar.</p>
              <p>Review uploaded assets and send revision feedback.</p>
              <p>Connect with your assigned creative team.</p>
            </div>
          </div>

          {/* Right Column: Auth Console Bento Card (Fits cleanly in vertical space) */}
          <div className="min-w-0 lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[410px] bg-[#121926]/90 backdrop-blur-xl border border-[#222F44] rounded-2xl p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
              
              {/* Keep verification focused: account switching is unavailable until OTP succeeds. */}
              {!registrationPending && <div className="bg-[#0A0F18] border border-[#222F44] p-1 rounded-full flex mb-4">
                <button 
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setRegistrationPending(false);
                    clearPendingRegistration();
                    setRememberMe(true);
                    setError(null);
                    navigate("/login", { replace: true });
                  }}
                  className={`text-xs py-1.5 px-4 rounded-full flex-1 text-center transition font-semibold cursor-pointer ${
                    mode === "signin" 
                      ? "bg-[#161F2D] border border-[#7FA0D6]/40 text-[#F8FAFC] shadow-xs" 
                      : "text-[#97A0B3] hover:text-[#F8FAFC]"
                  }`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setRememberMe(false);
                    setError(null);
                    navigate("/signup", { replace: true });
                  }}
                  className={`text-xs py-1.5 px-4 rounded-full flex-1 text-center transition font-semibold cursor-pointer ${
                    mode === "signup" 
                      ? "bg-[#161F2D] border border-[#7FA0D6]/40 text-[#F8FAFC] shadow-xs" 
                      : "text-[#97A0B3] hover:text-[#F8FAFC]"
                  }`}
                >
                  Create Account
                </button>
              </div>}

              {/* Title & Subtitle */}
              <div className="mb-3 text-left">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
                  {registrationPending
                    ? "Verify your email"
                    : mode === "signin" ? "Welcome back to CREO" : "Start operating your studio"}
                </h2>
                <p className="text-[11px] text-[#97A0B3] mt-0.5">
                  {registrationPending
                    ? `Enter the 6-digit code sent to ${email.trim()}.`
                    : mode === "signin"
                    ? "Enter your credentials to access your agency pods." 
                    : "Deploy CREO across your team and client accounts."}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-3 bg-red-950/40 border border-red-800/60 rounded-xl px-3.5 py-2 text-left">
                  <p className="text-[11px] text-red-300 font-semibold">{error}</p>
                </div>
              )}

              {/* Form */}
              {registrationPending ? (
                <form onSubmit={handleVerifyRegistration} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1 block text-left">
                      Verification Code
                    </label>
                    <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-2.5 focus-within:border-[#7FA0D6] focus-within:ring-1 focus-within:ring-[#7FA0D6]/30 transition-all">
                      <ShieldCheck className="text-[#97A0B3] size-4 mr-2.5 shrink-0" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        aria-label="Six-digit verification code"
                        className="bg-transparent text-center text-lg font-mono tracking-[0.35em] text-[#F8FAFC] placeholder-[#97A0B3]/40 focus:outline-none w-full"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading && <Loader2 className="size-3.5 animate-spin" />}
                    <span>{loading ? "Verifying..." : "Verify and Continue"}</span>
                    {!loading && <ArrowRight className="size-3.5" />}
                  </button>

                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setRegistrationPending(false);
                        setOtpCode("");
                        setError(null);
                        clearPendingRegistration();
                      }}
                      className="text-[#97A0B3] hover:text-white transition-colors disabled:opacity-50"
                    >
                      Change details
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendRegistrationCode}
                      className="text-[#7FA0D6] hover:text-white transition-colors disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* Full Name & Business Name (Sign Up only) */}
                {mode === "signup" && (
                  <>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1 block text-left">
                        Full Name
                      </label>
                      <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-2.5 focus-within:border-[#7FA0D6] focus-within:ring-1 focus-within:ring-[#7FA0D6]/30 transition-all">
                        <User className="text-[#97A0B3] size-4 mr-2.5 shrink-0" />
                        <input 
                          type="text" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name" 
                          className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full"
                          required={mode === "signup"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1 block text-left">
                        Business / Agency Name
                      </label>
                      <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-2.5 focus-within:border-[#7FA0D6] focus-within:ring-1 focus-within:ring-[#7FA0D6]/30 transition-all">
                        <Building2 className="text-[#97A0B3] size-4 mr-2.5 shrink-0" />
                        <input 
                          type="text" 
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Your Business / Studio Name" 
                          className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1 block text-left">
                    {mode === "signin" ? "Business Email" : "Agency / Work Email"}
                  </label>
                  <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-2.5 focus-within:border-[#7FA0D6] focus-within:ring-1 focus-within:ring-[#7FA0D6]/30 transition-all">
                    <Mail className="text-[#97A0B3] size-4 mr-2.5 shrink-0" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === "signin" ? "admin@creo.agency" : "founder@agency.com"} 
                      className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full rounded-md"
                      style={{ colorScheme: "dark" }}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1 block text-left">
                    {mode === "signin" ? "Password" : "Create Password"}
                  </label>
                  <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-2.5 focus-within:border-[#7FA0D6] focus-within:ring-1 focus-within:ring-[#7FA0D6]/30 transition-all">
                    <Lock className="text-[#97A0B3] size-4 mr-2.5 shrink-0" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signin" ? "••••••••" : "Min. 8 chars"} 
                      className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full rounded-md"
                      style={{ colorScheme: "dark" }}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#97A0B3] hover:text-[#F8FAFC] shrink-0 ml-2 transition-colors focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  {mode === "signup" ? (
                    <label 
                      className="flex items-center gap-2 cursor-pointer group select-none" 
                      onClick={() => setTermsAccepted(!termsAccepted)}
                    >
                      <div className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${termsAccepted ? 'bg-[#7FA0D6]' : 'bg-[#0A0F18] border border-[#222F44]'}`}>
                        {termsAccepted && <Check className="size-2.5 text-[#050810]" strokeWidth={3.5} />}
                      </div>
                      <span className="text-[#97A0B3] group-hover:text-[#F8FAFC] transition-colors">I accept the Terms & Privacy Policy</span>
                    </label>
                  ) : (
                    <label 
                      className="flex items-center gap-2 cursor-pointer group select-none" 
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      <div className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${rememberMe ? 'bg-[#7FA0D6]' : 'bg-[#0A0F18] border border-[#222F44]'}`}>
                        {rememberMe && <Check className="size-2.5 text-[#050810]" strokeWidth={3.5} />}
                      </div>
                      <span className="text-[#97A0B3] group-hover:text-[#F8FAFC] transition-colors">Remember me</span>
                    </label>
                  )}
                  
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(true);

                      }}
                      className="text-[#7FA0D6] hover:text-white transition focus:outline-none text-[11px] cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {/* Primary Submit CTA */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs py-2.5 rounded-xl transition shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  <span>
                    {mode === "signin" 
                      ? (loading ? "Authenticating..." : "Sign In to Command Center") 
                      : (loading ? "Creating Account..." : "Launch Agency Account")}
                  </span>
                  {!loading && <ArrowRight className="size-3.5" />}
                </button>
              </form>
              )}

              {/* Alternative Auth / Google Workspace (Sign In Mode) */}
              {!registrationPending && mode === "signin" ? (
                <div className="mt-3">
                  <div className="flex items-center my-2.5">
                    <div className="flex-1 border-t border-[#222F44]/60"></div>
                    <span className="px-2 text-[9px] text-[#97A0B3] uppercase tracking-wider font-semibold">
                      OR
                    </span>
                    <div className="flex-1 border-t border-[#222F44]/60"></div>
                  </div>

                  <button 
                    type="button"
                    className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#0B111C] hover:border-[#7FA0D6]/40 text-[#F8FAFC] text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer" 
                    onClick={async () => { 
                      try { 
                        setLoading(true); 
                        const url = await getGoogleAuthUrl(); 
                        if (url) {
                          window.location.href = url; 
                        } else {
                          navigate("/auth/callback/google");
                        }
                      } catch { 
                        setLoading(false); 
                      } 
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#7FA0D6"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#7FA0D6"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#D8BF9B"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#D8BF9B"/>
                    </svg>
                    <span>Google Workspace</span>
                  </button>
                </div>
              ) : !registrationPending ? (
                <div className="mt-3 pt-2 text-[10px] text-[#97A0B3] text-center border-t border-[#222F44]/50 leading-relaxed">
                  By joining, you agree to CREO's{" "}
                  <Link to="/terms" className="text-[#7FA0D6] hover:underline">Terms</Link> and{" "}
                  <Link to="/privacy" className="text-[#7FA0D6] hover:underline">Privacy Protocol</Link>.
                </div>
              ) : null}

              {/* Bottom security micro badge */}
              <div className="pt-2 text-center text-[10px] text-[#97A0B3]/50 flex items-center justify-center gap-1.5">
                <ShieldCheck className="size-3 text-[#7FA0D6]" />
                <span>Sign in to access your workspace</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Slim Bottom Bar (Compact: 36px) ── */}
      <footer className="relative z-20 min-h-12 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-10 py-4 border-t border-[#222F44]/40 bg-[#050810]/70 text-[10px] text-[#97A0B3]/60">
        <div>
          &copy; {new Date().getFullYear()} CREO Technologies Inc. All rights reserved.
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Client and team access</span>
          </div>
          <Link to="/privacy" className="hover:text-[#F8FAFC] transition">Privacy</Link>
          <Link to="/terms" className="hover:text-[#F8FAFC] transition">Terms</Link>
        </div>
      </footer>

      {/* ── Forgot Password Modal ── */}
      {forgotOpen && <PasswordRecoveryModal initialEmail={email} onClose={() => setForgotOpen(false)} />}

    </div>
  );
}
