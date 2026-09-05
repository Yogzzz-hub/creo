"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export function LeadMagnetForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/lead-magnet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 inline-flex items-center gap-2 rounded-lg bg-success-light px-6 py-3 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" />
        Check your inbox! Your 30-day content calendar template is on its way.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@business.com"
        className="h-12 flex-1 sm:max-w-xs rounded-lg border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-brand/50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 rounded-lg bg-brand px-6 text-white hover:bg-brand/90 inline-flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Get the Template
            <ArrowRight className="ml-1 size-4" />
          </>
        )}
      </button>
      {status === "error" && (
        <p className="sm:col-span-2 text-sm text-error">{errorMessage}</p>
      )}
    </form>
  );
}
