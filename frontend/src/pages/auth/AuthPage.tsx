import { useState, useEffect } from "react";
import { Mail, Lock, Eye, ArrowLeft, ArrowRight, Check, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";

export function AuthPage({ defaultView = "signin" }: { defaultView?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(
    location.pathname === "/signup" ? "signup" : (defaultView as "signin" | "signup")
  );
  const [rememberMe, setRememberMe] = useState(mode === "signin");

  useEffect(() => {
    if (location.pathname === "/signup") {
      setMode("signup");
      setRememberMe(false);
    } else if (location.pathname === "/login" || location.pathname === "/signin") {
      setMode("signin");
      setRememberMe(true);
    }
  }, [location.pathname]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement | null;
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();

    if (!email || !password) {
      return;
    }

    localStorage.setItem("creo_auth", "true");
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#050810] flex flex-col font-sans">
      
      {/* Top Layout Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#222F44]/40">
        <div className="flex items-center">
          <span className="text-2xl font-black tracking-tighter text-[#F8FAFC]">creo</span>
          <span className="text-2xl font-black text-[#7FA0D6]">.</span>
        </div>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#222F44] bg-[#0A0F18] text-xs font-medium text-[#F8FAFC] hover:bg-[#121926] transition"
        >
          <ArrowLeft className="size-3.5" /> Back to Home
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* Auth Bento Container */}
        <div className="max-w-md w-full mx-auto bg-[#121926] border border-[#222F44] rounded-2xl p-8 shadow-2xl">
          
          {/* Toggle Pill at top */}
          <div className="bg-[#0A0F18] border border-[#222F44] p-1 rounded-full flex mb-6">
            <button 
              type="button"
              onClick={() => {
                setMode("signin");
                setRememberMe(true);
                navigate("/login", { replace: true });
              }}
              className={`text-xs py-2 px-6 rounded-full flex-1 text-center transition ${
                mode === "signin" 
                  ? "bg-[#1C2638] border border-[#7FA0D6]/40 text-[#F8FAFC] font-semibold" 
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
                navigate("/signup", { replace: true });
              }}
              className={`text-xs py-2 px-6 rounded-full flex-1 text-center transition ${
                mode === "signup" 
                  ? "bg-[#1C2638] border border-[#7FA0D6]/40 text-[#F8FAFC] font-semibold" 
                  : "text-[#97A0B3] hover:text-[#F8FAFC]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Welcome Header */}
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] text-left">
            {mode === "signin" ? "Welcome back to CREO" : "Start operating your agency"}
          </h2>
          <p className="text-xs sm:text-sm text-[#97A0B3] mt-1.5 mb-6 text-left">
            {mode === "signin" 
              ? "Enter your agency credentials to access your live pods." 
              : "Deploy CREO across your creative team and client pods."}
          </p>

          <form onSubmit={handleSubmit}>
            
            {/* Full Name (Sign Up Only) */}
            {mode === "signup" && (
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2 block text-left">
                  Full Name
                </label>
                <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3.5 py-3 focus-within:border-[#7FA0D6] transition-colors">
                  <User className="text-[#97A0B3] w-4 h-4 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Sarah Jenkins" 
                    className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0A0F18_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#F8FAFC]"
                  />
                </div>
              </div>
            )}

            {/* Business Email */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2 block text-left">
                {mode === "signin" ? "Business Email" : "Agency / Business Email"}
              </label>
              <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3.5 py-3 focus-within:border-[#7FA0D6] transition-colors">
                <Mail className="text-[#97A0B3] w-4 h-4 mr-3 shrink-0" />
                <input 
                  type="email" 
                  placeholder={mode === "signin" ? "founder@agency.com" : "sarah@hyperdrive.studio"} 
                  className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0A0F18_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#F8FAFC]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2 block text-left">
                {mode === "signin" ? "Password" : "Create Password"}
              </label>
              <div className="relative flex items-center bg-[#0A0F18] border border-[#222F44] rounded-xl px-3.5 py-3 focus-within:border-[#7FA0D6] transition-colors">
                <Lock className="text-[#97A0B3] w-4 h-4 mr-3 shrink-0" />
                <input 
                  type="password" 
                  placeholder={mode === "signin" ? "••••••••" : "Min. 8 characters + 1 symbol"} 
                  className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none w-full [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0A0F18_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#F8FAFC]"
                />
                <button type="button" className="text-[#97A0B3] hover:text-[#F8FAFC] shrink-0 ml-2 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checkbox & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs my-4">
              <label 
                className="flex items-center gap-2 cursor-pointer group" 
                onClick={(e) => {
                  e.preventDefault();
                  setRememberMe(!rememberMe);
                }}
              >
                <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${rememberMe ? 'bg-[#7FA0D6]' : 'bg-[#0A0F18] border border-[#222F44]'}`}>
                  {rememberMe && <Check className="size-3 text-[#050810]" strokeWidth={3} />}
                </div>
                <span className="text-[#97A0B3] group-hover:text-[#F8FAFC] transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-[#7FA0D6] hover:underline transition">
                Forgot password?
              </a>
            </div>

            {/* Primary CTA */}
            <button className="w-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs py-3.5 rounded-xl transition mt-2 flex items-center justify-center gap-2">
              {mode === "signin" ? "Sign In to Command Center" : "Create Agency Account"} <ArrowRight className="size-4" />
            </button>
          </form>

          {mode === "signin" ? (
            <>
              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-[#222F44]"></div>
                <span className="px-3 text-[10px] text-[#97A0B3] uppercase tracking-wider font-semibold">
                  OR CONTINUE WITH
                </span>
                <div className="flex-1 border-t border-[#222F44]"></div>
              </div>

              {/* Google Workspace Button */}
              <button className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#1A2333] text-[#F8FAFC] text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition" onClick={() => navigate("/auth/callback/google")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google Workspace
              </button>

              {/* Sub-footer Note */}
              <span className="text-center text-[11px] text-[#97A0B3]/60 mt-6 block">
                Demo preview - no credentials are stored
              </span>
            </>
          ) : (
            <div className="mt-8 border-t border-[#222F44] pt-6">
              <span className="text-[11px] text-[#97A0B3] text-center block leading-relaxed">
                By continuing, you agree to CREO's <a href="#" className="text-[#7FA0D6] hover:underline">Terms of Service</a> and <a href="#" className="text-[#7FA0D6] hover:underline">Privacy Protocol</a>.
              </span>
              <span className="text-[10px] text-[#97A0B3]/60 text-center mt-2 block">
                SOC-2 Type II Certified &amp; Encrypted &bull; &copy; 2026 CREO Technologies Inc.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
