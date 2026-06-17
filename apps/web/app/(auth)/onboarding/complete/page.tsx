"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";

const MESSAGES = [
  "Analyzing brand profile...",
  "Generating content themes...",
  "Finalizing strategy...",
];

export default function CompletePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "success">("loading");
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1500);

    const timeout = setTimeout(() => {
      clearInterval(msgInterval);
      setPhase("success");
    }, 4500);

    return () => {
      clearInterval(msgInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <CardContent className="py-2">
      <div className="flex flex-col items-center text-center min-h-[320px] justify-center">
        {phase === "loading" ? (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand/10">
              <Loader2 className="size-8 text-brand animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-brand-dark transition-opacity">
                {MESSAGES[messageIndex]}
              </p>
              <p className="text-sm text-text-muted">
                This may take a moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-full bg-success-light">
              <Check className="size-8 text-emerald-600" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-brand-dark">
                Profile Complete!
              </h2>
              <p className="text-sm text-text-muted max-w-sm">
                Your brand profile is ready — your team will be in touch within 7 days.
              </p>
            </div>
            <Button
              className="mt-2 bg-brand hover:bg-brand/90 text-white h-11 px-8"
              onClick={() => router.push("/portal")}
            >
              Go to your dashboard
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}
