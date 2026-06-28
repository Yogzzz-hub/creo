"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Phone, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  businessName: z.string().min(1, "Business name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine(isValidPhoneNumber, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character"),
});

const phoneSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  businessName: z.string().min(1, "Business name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => isValidPhoneNumber(val),
      "Please enter a valid phone number."
    ),
});

type SignupFormData = z.infer<typeof signupSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

type AuthMode = "email" | "phone";

function getPasswordStrength(password: string): { level: "weak" | "medium" | "strong"; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: "weak", color: "text-error" };
  if (score <= 4) return { level: "medium", color: "text-amber-600" };
  return { level: "strong", color: "text-green-600" };
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={met ? "text-green-600" : "text-text-muted"}>
        {met ? "✓" : "○"}
      </span>
      <span className={met ? "text-green-600" : "text-text-muted"}>{label}</span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);

  async function handleGoogleSignUp() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  // Phone OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneData, setPhoneData] = useState<PhoneFormData | null>(null);
  const [phoneValue, setPhoneValue] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password", "");
  const passwordStrength = getPasswordStrength(passwordValue);

  async function onSubmit(data: SignupFormData) {
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: "client",
        },
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("__ALREADY_REGISTERED__");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account. Please try again.");
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setEmailConfirmationPending(true);
      setLoading(false);
      return;
    }

    const authId = authData.user.id;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_id: authId,
            email: data.email,
            phone: data.phone || null,
            full_name: data.fullName,
            business_name: data.businessName || null,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        setError(result.detail || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Failed to connect to server. Please try again.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const redirectUrl = planParam
      ? `/signup/plan?plan=${encodeURIComponent(planParam)}`
      : "/signup/plan";
    router.push(redirectUrl);
  }

  async function handleSendPhoneOtp(data: PhoneFormData) {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      phone: data.phone,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setPhoneData(data);
    setOtpSent(true);
    setLoading(false);
  }

  async function handleVerifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneData) return;

    setLoading(true);
    setError(null);

    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneData.phone,
      token: otp,
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Verification failed. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_id: authData.user.id,
            email: authData.user.email || null,
            phone: phoneData.phone,
            full_name: phoneData.fullName,
            business_name: phoneData.businessName || null,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        setError(result.detail || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Failed to connect to server. Please try again.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const redirectUrl = planParam
      ? `/signup/plan?plan=${encodeURIComponent(planParam)}`
      : "/signup/plan";
    router.push(redirectUrl);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-brand-dark">
            Create your account
          </CardTitle>
          <CardDescription>
            Start growing your brand with Creo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailConfirmationPending ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">Check your email</h3>
                <p className="text-sm text-text-muted mt-1">
                  We sent a verification link to your email address. Please click the link to verify your account before logging in.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEmailConfirmationPending(false);
                  reset();
                }}
              >
                Back to sign up
              </Button>
            </div>
          ) : mode === "email" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-text">
                  Full Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  {...register("fullName")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
                {errors.fullName && (
                  <p className="text-sm text-error">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-text">
                  Business Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="businessName"
                  placeholder="Your Business"
                  {...register("businessName")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
                {errors.businessName && (
                  <p className="text-sm text-error">{errors.businessName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-text">
                  Phone Number <span className="text-error">*</span>
                </Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="phone"
                      placeholder="Enter phone number"
                      defaultCountry="IN"
                      value={field.value || ""}
                      onChange={field.onChange}
                      international
                      countryCallingCodeEditable={false}
                      inputComponent={Input}
                      className="PhoneInput"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-error">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-text">
                  Email <span className="text-error">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
                {errors.email && (
                  <p className="text-sm text-error">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-text">
                  Password <span className="text-error">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    {...register("password")}
                    className="border-border focus:border-brand focus:ring-brand pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {passwordValue && (
                  <div className="space-y-1.5">
                    <p className={`text-xs font-medium ${passwordStrength.color}`}>
                      Password strength: {passwordStrength.level.charAt(0).toUpperCase() + passwordStrength.level.slice(1)}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <PasswordRequirement met={passwordValue.length >= 8} label="8+ characters" />
                      <PasswordRequirement met={/[A-Z]/.test(passwordValue)} label="1 uppercase letter" />
                      <PasswordRequirement met={/[a-z]/.test(passwordValue)} label="1 lowercase letter" />
                      <PasswordRequirement met={/[0-9]/.test(passwordValue)} label="1 number" />
                      <PasswordRequirement met={/[^A-Za-z0-9]/.test(passwordValue)} label="1 special character" />
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-error">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="text-sm text-error bg-error-light p-3 rounded-md">
                  {error === "__ALREADY_REGISTERED__" ? (
                    <>
                      This email is already registered.{" "}
                      <Link href="/login" className="font-medium underline">
                        Sign In
                      </Link>
                    </>
                  ) : (
                    error
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          ) : !otpSent ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const fullName = (form.elements.namedItem("fullNamePhone") as HTMLInputElement).value;
              const businessName = (form.elements.namedItem("businessNamePhone") as HTMLInputElement).value;
              handleSendPhoneOtp({ fullName, businessName: businessName || undefined, phone: phoneValue });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullNamePhone" className="text-text">
                  Full Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="fullNamePhone"
                  placeholder="John Doe"
                  required
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessNamePhone" className="text-text">
                  Business Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="businessNamePhone"
                  placeholder="Your Business"
                  required
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneSignup" className="text-text">
                  Phone Number <span className="text-error">*</span>
                </Label>
                <PhoneInput
                  id="phoneSignup"
                  placeholder="Enter phone number"
                  defaultCountry="IN"
                  value={phoneValue}
                  onChange={(val) => setPhoneValue(val ?? "")}
                  international
                  countryCallingCodeEditable={false}
                  inputComponent={Input}
                  className="PhoneInput"
                />
                <p className="text-xs text-text-muted">
                  We&apos;ll send a one-time password to verify your number.
                </p>
              </div>

              {error && (
                <div className="text-sm text-error bg-error-light p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-text">
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="border-border focus:border-brand focus:ring-brand"
                />
                <p className="text-xs text-text-muted">
                  OTP sent to {phoneData?.phone}
                </p>
              </div>

              {error && (
                <div className="text-sm text-error bg-error-light p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Create Account"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-text-muted"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setError(null);
                }}
              >
                Use a different number
              </Button>
            </form>
          )}

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-text-muted">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/80 focus-visible:ring-offset-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "email" ? "phone" : "email");
                setError(null);
                setOtpSent(false);
                setOtp("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/80 focus-visible:ring-offset-2"
            >
              <Phone className="h-4 w-4" />
              {mode === "email" ? "Phone" : "Email"}
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-text-muted">
            Already have an account?{" "}
            <a href="/login" className="text-brand hover:underline font-medium">
              Sign In
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
