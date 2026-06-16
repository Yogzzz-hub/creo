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

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Step A: Create Supabase auth user
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

    // Step B: Extract auth_id (Supabase user.id)
    const authId = authData.user.id;

    // Step C: Register user in FastAPI backend
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

    // Step D: Redirect to plan selection, preserving any existing search params
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
              disabled
              className="border-border text-text-muted cursor-not-allowed opacity-50"
            >
              <Phone className="mr-2 h-4 w-4" />
              Phone
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
