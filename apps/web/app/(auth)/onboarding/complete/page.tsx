"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";

const MESSAGES = [
  "Analyzing brand profile...",
  "Generating content themes...",
  "Finalizing strategy...",
];

export default function CompletePage() {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<"loading" | "success" | "error">("loading");
  const [messageIndex, setMessageIndex] = useState(0);
  const [summaryLine, setSummaryLine] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Handle the cycling text animation during loading
  useEffect(() => {
    if (phase !== "loading") return;

    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2500); // Slower cycle so they can read it while AI processes

    return () => clearInterval(msgInterval);
  }, [phase]);

  // 2. Poll the API for the actual task status
  const pollStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setPhase("error");
        setErrorMessage("Authentication error. Please log in again.");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/questionnaire/status`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (!res.ok) {
        // If it's a 404, it means the questionnaire isn't in the DB yet, just keep polling
        if (res.status !== 404) {
          throw new Error("Failed to fetch status");
        }
        return;
      }

      const data = await res.json();

      // Check if the backend worker has finished
      if (data.status === "completed" || data.summary_line) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSummaryLine(data.summary_line || "Your brand profile has been optimized.");
        setPhase("success");
      }
    } catch (error) {
      console.error("Polling error:", error);
      // We don't immediately fail on one network blip, but you could add a retry counter here
    }
  }, [supabase.auth]);

  // 3. Start polling on mount
  useEffect(() => {
    // Poll every 3 seconds
    intervalRef.current = setInterval(pollStatus, 3000);

    // Do an immediate first check
    pollStatus();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollStatus]);

  // --- UI RENDER STATES --- //

  if (phase === "error") {
    return (
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-error/10">
            <AlertCircle className="size-8 text-error" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark">Something went wrong</h2>
          <p className="text-sm text-text-muted max-w-sm">{errorMessage}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-brand hover:bg-brand/90 text-white"
          >
            Try Again
          </Button>
        </div>
      </CardContent>
    );
  }

  if (phase === "loading") {
    return (
      <CardContent className="py-2">
        <div className="flex flex-col items-center text-center min-h-[320px] justify-center py-6">
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand/10">
              <Loader2 className="size-8 text-brand animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-brand-dark transition-opacity duration-500">
                {MESSAGES[messageIndex]}
              </p>
              <p className="text-sm text-text-muted">
                Our AI is currently analyzing your responses.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    );
  }

  // SUCCESS STATE
  return (
    <CardContent className="py-2">
      <div className="flex flex-col gap-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">
            You&apos;re All Set!
          </h2>
          <p className="text-sm text-text-muted">
            Your brand analysis is complete. Here&apos;s what we found:
          </p>
        </div>

        {/* AI Summary Section */}
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-brand-dark mb-1">
            Brand Summary
          </p>
          <p className="text-sm leading-relaxed text-text">
            {summaryLine || "Your profile is ready for our creative team."}
          </p>
        </div>

        {/* What happens next section */}
        <div className="rounded-lg bg-brand/5 p-5">
          <p className="text-sm text-brand-dark font-medium mb-3">
            What happens next?
          </p>
          <ul className="space-y-2.5 text-sm text-text">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand font-bold">&#8226;</span>
              Your dedicated team will start preparing your content calendar
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand font-bold">&#8226;</span>
              You&apos;ll receive your first deliverables within 3-5 business days
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand font-bold">&#8226;</span>
              Review, approve, or request revisions directly from your portal
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => router.push("/portal")}
          className="w-full mt-2 bg-brand hover:bg-brand/90 text-white h-12 text-base font-semibold"
        >
          Go to Your Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  );
}