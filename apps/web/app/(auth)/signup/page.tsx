"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Phone } from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  businessName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const phoneSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  businessName: z.string().optional(),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type SignupFormData = z.infer<typeof signupSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

type AuthMode = "email" | "phone";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneData, setPhoneData] = useState<PhoneFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

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
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account. Please try again.");
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
          {mode === "email" ? (
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
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  placeholder="Your Business (optional)"
                  {...register("businessName")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-text">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210 (optional)"
                  {...register("phone")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
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
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  {...register("password")}
                  className="border-border focus:border-brand focus:ring-brand"
                />
                {errors.password && (
                  <p className="text-sm text-error">{errors.password.message}</p>
                )}
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
              const phone = (form.elements.namedItem("phoneSignup") as HTMLInputElement).value;
              handleSendPhoneOtp({ fullName, businessName: businessName || undefined, phone });
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
                  Business Name
                </Label>
                <Input
                  id="businessNamePhone"
                  placeholder="Your Business (optional)"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneSignup" className="text-text">
                  Phone Number <span className="text-error">*</span>
                </Label>
                <Input
                  id="phoneSignup"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  className="border-border focus:border-brand focus:ring-brand"
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
            <Button
              variant="outline"
              disabled
              className="border-border text-text-muted cursor-not-allowed opacity-50"
            >
              <Mail className="mr-2 h-4 w-4" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMode(mode === "email" ? "phone" : "email");
                setError(null);
                setOtpSent(false);
                setOtp("");
              }}
              className="border-border"
            >
              <Phone className="mr-2 h-4 w-4" />
              {mode === "email" ? "Phone" : "Email"}
            </Button>
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
