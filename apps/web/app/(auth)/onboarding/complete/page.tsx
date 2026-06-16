"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function CompletePage() {
  const router = useRouter();
  const [summaryLine, setSummaryLine] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ai_summary_line");
    if (stored) {
      setSummaryLine(stored);
      sessionStorage.removeItem("ai_summary_line");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl font-bold text-brand-dark">
            You&apos;re All Set!
          </CardTitle>
          <CardDescription>
            Your brand analysis is complete. Here&apos;s what we found:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryLine ? (
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm font-medium text-brand-dark mb-1">
                Brand Summary
              </p>
              <p className="text-sm leading-relaxed text-text">{summaryLine}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-5 text-center">
              <p className="text-sm text-text-muted">
                Your brand analysis has been generated. Head to your dashboard
                to see your personalized content strategy and upcoming calendar.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-brand-light p-4">
            <p className="text-sm text-brand-dark font-medium">
              What happens next?
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-text">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand">&#8226;</span>
                Your dedicated team will start preparing your content calendar
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand">&#8226;</span>
                You&apos;ll receive your first deliverables within 3-5 business
                days
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand">&#8226;</span>
                Review, approve, or request revisions directly from your portal
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => router.push("/portal")}
            className="w-full bg-brand hover:bg-brand/90 text-white h-11 text-base font-semibold"
          >
            Go to Your Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
