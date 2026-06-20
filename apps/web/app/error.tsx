"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Segment Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#E8F4FD]">
              <AlertTriangle className="size-8 text-[#2B7BC4]" />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-[#0D2137]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              An unexpected error occurred while loading this page. Our team has
              been notified and is looking into it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={reset}
                className="h-11 rounded-lg bg-[#2B7BC4] px-6 text-sm font-semibold text-white hover:bg-[#2B7BC4]/90"
              >
                <RefreshCw className="mr-2 size-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                render={<Link href="/" />}
                className="h-11 rounded-lg border-gray-200 px-6 text-sm font-semibold text-[#0D2137] hover:bg-gray-50"
              >
                <Home className="mr-2 size-4" />
                Return Home
              </Button>
            </div>

            {error.digest && (
              <p className="mt-6 font-mono text-xs text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
