"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { MailCheck, Loader2, RefreshCw } from "lucide-react";

const RESEND_COOLDOWN = 60;

export default function VerifyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;

    setIsResending(true);
    setCanResend(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resend({
          type: "signup",
          email: user.email,
        });
      }
      setResendSent(true);
    } catch {
      // Silent fail — cooldown still resets
    } finally {
      setIsResending(false);
      setCooldown(RESEND_COOLDOWN);
    }
  }, [canResend, supabase]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <CardContent className="text-center py-6">
      <div className="mb-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand/10 mb-4">
          <MailCheck className="size-8 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-brand-dark">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          We&apos;ve sent a verification link to your email address.
          Click the link in the email to verify your account and continue
          setting up your brand.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="ghost"
          className="w-full text-brand hover:bg-brand/5"
          onClick={handleResend}
          disabled={!canResend || isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Sending...
            </>
          ) : canResend ? (
            <>
              <RefreshCw className="mr-2 size-4" />
              {resendSent ? "Resend Again" : "Resend Email"}
            </>
          ) : (
            `Resend in ${formatCooldown(cooldown)}`
          )}
        </Button>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-text-muted mb-3">
            Having trouble? Check your spam folder.
          </p>
          <Button
            variant="link"
            className="text-xs text-text-muted hover:text-text"
            onClick={() => router.push("/login")}
          >
            Back to login
          </Button>
        </div>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 pt-4 border-t border-dashed border-border">
          <Button
            variant="outline"
            className="w-full text-text-muted border-dashed hover:bg-bg-internal"
            onClick={() => router.push("/onboarding/terms")}
          >
            [DEV] Simulate Verification
          </Button>
        </div>
      )}
    </CardContent>
  );
}
