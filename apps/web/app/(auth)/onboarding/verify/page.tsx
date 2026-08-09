"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type PageStatus = "loading" | "sent" | "error" | "bypassed";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("user");

  const [status, setStatus] = useState<PageStatus>("loading");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendVerificationEmail = useCallback(
    async (isResend = false) => {
      if (!userId) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      if (isResend) {
        setResending(true);
      } else {
        setStatus("loading");
      }

      try {
        const response = await fetch(
          `${API_URL}/api/v1/auth/module-3-entry/${userId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Unable to send verification email."
          );
        }

        if (data.status === "bypassed") {
          setStatus("bypassed");
          setMessage(
            data.message ||
            "Your account is already verified. You can continue."
          );

          return;
        }

        if (data.status === "verification_sent") {
          setStatus("sent");

          setMessage(
            isResend
              ? "A new verification email has been sent."
              : "We've sent a verification email to your registered email address."
          );

          if (isResend) {
            setCountdown(60);
          }
        }
      } catch (error) {
        console.error("Verification email error:", error);

        setStatus("error");

        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
        );
      } finally {
        setResending(false);
      }
    },
    [userId]
  );

  // Send verification email when the page is opened.
  useEffect(() => {
    sendVerificationEmail();
  }, [sendVerificationEmail]);

  // Resend countdown.
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleResend = () => {
    if (countdown > 0 || resending) return;

    sendVerificationEmail(true);
  };

  const handleContinue = () => {
    router.push("/onboarding/payment");
  };

  // -----------------------------
  // Loading
  // -----------------------------

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#E8F4FD] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-[#C9DFF0] border-t-[#2B7BC4]" />

          <h1 className="text-2xl font-bold text-[#0D2137]">
            Sending verification email
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Please wait while we send a verification link to your email.
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------
  // Already verified / bypassed
  // -----------------------------

  if (status === "bypassed") {
    return (
      <main className="min-h-screen bg-[#E8F4FD] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-[#0D2137]">
            You're already verified
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {message}
          </p>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-7 w-full rounded-lg bg-[#2B7BC4] px-5 py-3 font-semibold text-white transition hover:bg-[#2369A8]"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  // -----------------------------
  // Verification email sent
  // -----------------------------

  return (
    <main className="min-h-screen bg-[#E8F4FD] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F4FD] text-3xl">
          ✉
        </div>

        <h1 className="text-2xl font-bold text-[#0D2137]">
          Check your email
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          We&apos;ve sent a verification link to your registered email
          address.
        </p>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Open the email and click <strong>Verify Email</strong> to complete
          your verification.
        </p>

        {message && (
          <div className="mt-6 rounded-lg bg-[#E8F4FD] px-4 py-3 text-sm text-[#0D2137]">
            {message}
          </div>
        )}

        <div className="mt-7">
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email?
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="mt-3 w-full rounded-lg border border-[#2B7BC4] px-5 py-3 font-semibold text-[#2B7BC4] transition hover:bg-[#E8F4FD] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend verification email"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-5 text-sm text-gray-500 underline hover:text-[#2B7BC4]"
        >
          Back to login
        </button>

        {status === "error" && (
          <button
            type="button"
            onClick={() => sendVerificationEmail()}
            className="mt-4 text-sm font-medium text-[#2B7BC4] underline"
          >
            Try again
          </button>
        )}
      </div>
    </main>
  );
}