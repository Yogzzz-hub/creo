"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  CheckCircle2,
  BarChart3,
  Zap,
} from "lucide-react"
import { getBaseUrl } from "@/lib/utils"
import { getApiUrl } from "@/lib/api-url"
import { OtpVerificationForm } from "@/components/auth/otp-verification-form"

type AuthView = "login" | "signup" | "otp"

interface AuthSplitLayoutProps {
  initialView?: "login" | "signup" | "otp"
}

const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  sales: "/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
}

export function AuthSplitLayout({ initialView = "login" }: AuthSplitLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<AuthView>(initialView)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Signup form state
  const [fullName, setFullName] = useState(searchParams.get("name") || "")
  const [signupEmail, setSignupEmail] = useState(searchParams.get("email") || "")
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)

  // Transition handler between views with 350ms slide/fade
  const switchView = (targetView: AuthView) => {
    if (view === targetView || isTransitioning) return

    setDirection(
      (view === "login" && targetView === "signup") || targetView === "otp"
        ? "forward"
        : "backward"
    )
    setIsTransitioning(true)

    // Sync URL cleanly without full page refresh
    if (targetView === "login") {
      window.history.pushState(null, "", "/login")
    } else if (targetView === "signup") {
      window.history.pushState(null, "", "/signup")
    }

    setTimeout(() => {
      setView(targetView)
      setIsTransitioning(false)
    }, 200)
  }

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      if (errorParam === "google_auth_failed") {
        setLoginError("Google sign-in was canceled or failed. Please try again.")
      } else if (errorParam === "google_userinfo_failed") {
        setLoginError("Failed to retrieve Google profile. Please try again.")
      } else if (errorParam === "no_email_provided") {
        setLoginError("Your Google account did not share an email address.")
      } else {
        setLoginError(`Authentication error: ${errorParam}`)
      }
    }
  }, [searchParams])

  // Handle Google OAuth sign in (direct backend Google OAuth 2.0)
  const handleGoogleAuth = async () => {
    try {
      if (view === "login") setLoginLoading(true)
      else setSignupLoading(true)
      const res = await fetch(`${getApiUrl()}/api/v1/auth/google/url`)
      if (!res.ok) {
        throw new Error("Failed to initialize Google authentication")
      }
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error("No Google authorization URL returned")
      }
    } catch (err: any) {
      if (view === "login") {
        setLoginLoading(false)
        setLoginError(err.message || "Google sign in failed")
      } else {
        setSignupLoading(false)
        setSignupError(err.message || "Google sign in failed")
      }
    }
  }

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail.trim()) return

    setLoginLoading(true)
    setLoginError(null)

    // If no password entered, send one-time code via Google SMTP
    if (!loginPassword.trim()) {
      try {
        const res = await fetch(`${getApiUrl()}/api/v1/auth/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail.trim() }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || "Failed to send verification code")
        }
        setSignupEmail(loginEmail.trim())
        setFullName("")
        setLoginLoading(false)
        switchView("otp")
        return
      } catch (err: unknown) {
        setLoginError(err instanceof Error ? err.message : "Failed to send login code.")
        setLoginLoading(false)
        return
      }
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) {
        setLoginError(error.message)
        setLoginLoading(false)
        return
      }

      const redirectedFrom = searchParams.get("redirectedFrom")
      if (redirectedFrom && redirectedFrom.startsWith("/")) {
        router.push(redirectedFrom)
      } else {
        let role: string | null = null
        const accessToken = data.session?.access_token
        if (accessToken) {
          try {
            const apiUrl = getApiUrl()
            const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (res.ok) {
              const roleData = await res.json()
              role = roleData.role
            }
          } catch {
            // Fallback to metadata
          }
        }
        role = role || (data.user?.user_metadata?.role as string) || "client"
        const targetPath = ROLE_HOMES[role] ?? "/portal"
        router.push(targetPath)
      }
      router.refresh()
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Sign in failed")
      setLoginLoading(false)
    }
  }

  // Handle Signup submission: Send 6-digit OTP via Google SMTP backend (no Supabase email)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !signupEmail.trim()) return

    setSignupLoading(true)
    setSignupError(null)

    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail.trim(),
          full_name: fullName.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to send verification code")
      }

      setSignupLoading(false)
      switchView("otp")
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : "Failed to send code. Please try again.")
      setSignupLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white selection:bg-[#2B7BC4]/20 selection:text-[#0D2137]">
      {/* ========================================================================= */}
      {/* LEFT HALF: Full-height Branded Showcase Panel                              */}
      {/* ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-[#0D2137] p-12 text-white">
        {/* Subtle Ambient Gradient Meshes */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#2B7BC4]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-24 size-96 rounded-full bg-[#0EA5E9]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-[28rem] rounded-full bg-[#2B7BC4]/15 blur-3xl" />

        {/* Subtle geometric background grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top Header: Logo & Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] shadow-md shadow-[#2B7BC4]/30">
              <span className="font-mono text-xl font-black tracking-tighter text-white">C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white">Creo</span>
              <span className="text-[10px] font-semibold tracking-wider text-[#6BAED6] uppercase">
                Digital Agency Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[#6BAED6] backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Client Hub
          </div>
        </div>

        {/* Center: Growth / Marketing Graphic & Animated Tagline */}
        <div className="relative z-10 my-auto py-8">
          {/* Tagline that adapts seamlessly */}
          <div className="mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#2B7BC4]/20 border border-[#2B7BC4]/30 px-3 py-1 text-xs font-semibold text-[#6BAED6] tracking-wide uppercase">
              <Sparkles className="size-3.5 text-[#0EA5E9]" />
              Creative Growth Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl xl:text-5xl transition-all duration-300">
              {view === "login"
                ? "Grow your brand with Creo"
                : "Start growing your brand with Creo"}
            </h1>
            <p className="max-w-md text-base text-[#6BAED6]/90 leading-relaxed">
              Supercharge your social presence, on-demand creative deliverables, and content operations in one unified workspace.
            </p>
          </div>

          {/* Abstract Growth Marketing Visual Card */}
          <div className="relative max-w-lg rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:border-white/25">
            {/* Top row with mock metrics */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#2B7BC4] text-white shadow-sm">
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

            {/* Stylized Visual Growth Bars */}
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

            {/* Floating Trust Pill */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-xs text-[#6BAED6] border border-white/5">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                Dedicated Creative Team & SLA Guarantee
              </span>
              <span className="font-bold text-white">4.9/5 ★</span>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof Ticker */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-xs text-[#6BAED6] flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-[#0EA5E9]" />
            Trusted by 500+ ambitious brands and agencies worldwide.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT HALF: Form Viewport with Smooth Slide & Fade Transition             */}
      {/* ========================================================================= */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Mobile Header Logo */}
        <div className="mb-8 flex items-center justify-center lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9]">
              <span className="font-mono text-lg font-black text-white">C</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#0D2137]">Creo</span>
          </Link>
        </div>

        {/* Animated Form Stage Container */}
        <div className="mx-auto w-full max-w-[420px]">
          <div
            className={`transition-all duration-300 ease-out ${
              isTransitioning
                ? direction === "forward"
                  ? "opacity-0 translate-x-6 scale-[0.98]"
                  : "opacity-0 -translate-x-6 scale-[0.98]"
                : "opacity-100 translate-x-0 scale-100"
            }`}
          >
            {/* ----------------------------------------------------------------- */}
            {/* 1. LOGIN FORM                                                     */}
            {/* ----------------------------------------------------------------- */}
            {view === "login" && (
              <div>
                <div className="mb-6 text-center lg:text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-[#0D2137] sm:text-3xl">
                    Welcome back to Creo
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Sign in to your account to manage your deliverables.
                  </p>
                </div>

                {loginError && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-sm font-medium text-[#0D2137]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-4 text-base text-[#0D2137] placeholder:text-slate-400 shadow-2xs transition-all duration-200 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/25"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="text-sm font-medium text-[#0D2137]"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-[#2B7BC4] hover:text-[#0D2137] hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-base text-[#0D2137] placeholder:text-slate-400 shadow-2xs transition-all duration-200 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/25"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Solid Blue Sign In Button */}
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="h-12 w-full rounded-xl bg-[#2B7BC4] text-base font-semibold text-white shadow-md shadow-[#2B7BC4]/25 hover:bg-[#2264a2] active:scale-[0.99] transition-all duration-200 cursor-pointer"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin text-white" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs font-semibold tracking-wider uppercase">
                    <span className="bg-white px-3 text-slate-400">OR CONTINUE WITH</span>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleAuth}
                  disabled={loginLoading}
                  className="h-12 w-full rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-medium text-[#0D2137] shadow-2xs transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  <svg className="mr-2.5 size-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>

                {/* Footer Line: Don't have an account? Get Started */}
                <div className="mt-8 text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("signup")}
                    className="font-semibold text-[#2B7BC4] hover:text-[#0D2137] hover:underline transition-colors cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 2. SIGNUP FORM (Full Name + Email only)                           */}
            {/* ----------------------------------------------------------------- */}
            {view === "signup" && (
              <div>
                <div className="mb-6 text-center lg:text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-[#0D2137] sm:text-3xl">
                    Create your account
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Start growing your brand with our dedicated creative team.
                  </p>
                </div>

                {signupError && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700">
                    {signupError}
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Full Name Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-name" className="text-sm font-medium text-[#0D2137]">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Jane Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-4 text-base text-[#0D2137] placeholder:text-slate-400 shadow-2xs transition-all duration-200 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/25"
                      />
                    </div>
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-email" className="text-sm font-medium text-[#0D2137]">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="jane@company.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-4 text-base text-[#0D2137] placeholder:text-slate-400 shadow-2xs transition-all duration-200 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/25"
                      />
                    </div>
                  </div>

                  {/* Solid Blue Continue Button */}
                  <Button
                    type="submit"
                    disabled={signupLoading}
                    className="h-12 w-full rounded-xl bg-[#2B7BC4] text-base font-semibold text-white shadow-md shadow-[#2B7BC4]/25 hover:bg-[#2264a2] active:scale-[0.99] transition-all duration-200 cursor-pointer mt-2"
                  >
                    {signupLoading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin text-white" />
                        Setting up...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs font-semibold tracking-wider uppercase">
                    <span className="bg-white px-3 text-slate-400">OR SIGN UP WITH</span>
                  </div>
                </div>

                {/* Google Sign Up Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleAuth}
                  disabled={signupLoading}
                  className="h-12 w-full rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-medium text-[#0D2137] shadow-2xs transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  <svg className="mr-2.5 size-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>

                {/* Footer Line: Already have an account? Sign In */}
                <div className="mt-8 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="font-semibold text-[#2B7BC4] hover:text-[#0D2137] hover:underline transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 3. OTP VERIFICATION FORM                                          */}
            {/* ----------------------------------------------------------------- */}
            {view === "otp" && (
              <OtpVerificationForm
                email={signupEmail}
                fullName={fullName}
                onGoBack={() => switchView("signup")}
                onSuccess={() => {
                  router.push("/signup/plan")
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
