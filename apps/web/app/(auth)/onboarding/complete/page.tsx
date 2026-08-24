"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

type BrandSummary = {
  ai_summary_line?: string;
  brand_tone?: string[];
  content_themes?: string[];
  audience_persona?: string;
  goal_alignment?: string;
};

type ProfileSummary = {
  industry?: string;
  primary_goal?: string;
  brand_tone?: string[];
  target_audience?: Record<string, unknown>;
};

export default function CompletePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<"loading" | "success" | "error" | "timeout">("loading");
  const [messageIndex, setMessageIndex] = useState(0);
  const [summaryLine, setSummaryLine] = useState<string | null>(null);
  const [brandSummary, setBrandSummary] = useState<BrandSummary | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  // 1. Handle the cycling text animation during loading
  useEffect(() => {
    if (phase !== "loading") return;

    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2500);

    return () => clearInterval(msgInterval);
  }, [phase]);

  // 2. Poll the API for the actual task status
  const pollStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (mountedRef.current) {
          setPhase("error");
          setErrorMessage("Authentication error. Please log in again.");
        }
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/questionnaire/status`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (!res.ok) {
        if (res.status !== 404) {
          throw new Error("Failed to fetch status");
        }
        return;
      }

      const data = await res.json();

      if (data.brand_summary && typeof data.brand_summary === "object") {
        setBrandSummary(data.brand_summary as BrandSummary);
      }
      if (data.profile && typeof data.profile === "object") {
        setProfile(data.profile as ProfileSummary);
      }

      if (data.status === "completed" || data.summary_line) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (mountedRef.current) {
          setSummaryLine(data.summary_line || "Your brand profile has been optimized.");
          setPhase("success");
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [supabase.auth]);

  // 3. Start polling on mount — retriesRef persists across renders
  useEffect(() => {
    mountedRef.current = true;
    const MAX_RETRIES = 60; // 3 minutes maximum

    // Reset counter on fresh mount
    retriesRef.current = 0;

    // Do an immediate first check without synchronously cascading from the effect.
    const initialCheckId = window.setTimeout(() => {
      void pollStatus();
    }, 0);

    // Poll every 3 seconds
    intervalRef.current = setInterval(() => {
      retriesRef.current++;
      if (retriesRef.current > MAX_RETRIES) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (mountedRef.current) {
          setPhase("timeout");
        }
        return;
      }
      pollStatus();
    }, 3000);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialCheckId);
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

  if (phase === "timeout") {
    return (
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="size-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark">
            {brandSummary || summaryLine ? "Your profile is partially ready" : "Analysis is taking a while"}
          </h2>
          <p className="text-sm text-text-muted max-w-sm">
            {brandSummary || summaryLine
              ? "Some brand insights are ready now. Your dashboard will continue processing the remaining analysis."
              : "The AI analysis is still processing. You can continue to your dashboard and view your generated profile there."}
          </p>
          {(brandSummary || summaryLine || profile) && <BrandSummaryCard summaryLine={summaryLine} brandSummary={brandSummary} profile={profile} partial />}
          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <Button
              onClick={() => router.push("/portal")}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-border text-text"
            >
              Check Again
            </Button>
          </div>
        </div>
      </CardContent>
    );
  }

  if (phase === "loading") {
    return (
      <CardContent className="py-2">
        <div className="flex flex-col items-center text-center min-h-80 justify-center py-6">
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

        <BrandSummaryCard summaryLine={summaryLine} brandSummary={brandSummary} profile={profile} />

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

function BrandSummaryCard({
  summaryLine,
  brandSummary,
  profile,
  partial = false,
}: {
  summaryLine: string | null;
  brandSummary: BrandSummary | null;
  profile: ProfileSummary | null;
  partial?: boolean;
}) {
  const tone = brandSummary?.brand_tone?.join(", ") || profile?.brand_tone?.join(", ");
  const themes = brandSummary?.content_themes?.join(", ");

  return (
    <div className="w-full rounded-lg border border-border bg-surface p-5 text-left shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-dark">{partial ? "Brand Summary (partial)" : "Brand Summary"}</p>
        {profile?.industry && <span className="text-xs text-text-muted">{profile.industry}</span>}
      </div>
      <div className="space-y-4 text-sm text-text">
        {(summaryLine || brandSummary?.ai_summary_line) && (
          <p className="leading-relaxed">{summaryLine || brandSummary?.ai_summary_line}</p>
        )}
        {brandSummary?.audience_persona && (
          <div>
            <p className="font-medium text-brand-dark">Target audience</p>
            <p className="mt-1 leading-relaxed">{brandSummary.audience_persona}</p>
          </div>
        )}
        {brandSummary?.goal_alignment && (
          <div>
            <p className="font-medium text-brand-dark">Core strategy</p>
            <p className="mt-1 leading-relaxed">{brandSummary.goal_alignment}</p>
          </div>
        )}
        {themes && (
          <div>
            <p className="font-medium text-brand-dark">Content themes</p>
            <p className="mt-1 leading-relaxed">{themes}</p>
          </div>
        )}
        {tone && (
          <div>
            <p className="font-medium text-brand-dark">Brand voice</p>
            <p className="mt-1 leading-relaxed">{tone}</p>
          </div>
        )}
        {!summaryLine && !brandSummary && !profile && (
          <p>Your profile is ready for our creative team.</p>
        )}
      </div>
    </div>
  );
}