"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast.success("Reset link sent! Check your inbox.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-md">
        <CardHeader className="text-center p-0 mb-6">
          <CardTitle className="text-2xl font-bold text-brand-dark">
            Reset your password
          </CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-text-muted">
                We&apos;ve sent a password reset link to <span className="font-medium text-text">{email}</span>.
                Check your inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="w-full border-border"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Send another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-text">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-brand hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
