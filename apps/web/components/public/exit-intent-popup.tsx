"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSION_KEY = "creo_exit_intent_shown";
const TIMER_TRIGGER_MS = 40_000;

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    let triggered = false;

    function trigger() {
      if (triggered) return;
      triggered = true;
      setOpen(true);
      window.removeEventListener("mousemove", onMouseMove);
      clearTimeout(timerId);
    }

    let lastY = 0;
    let lastTime = Date.now();

    function onMouseMove(e: MouseEvent) {
      const now = Date.now();
      const dy = e.clientY - lastY;
      const dt = now - lastTime;

      lastY = e.clientY;
      lastTime = now;

      if (dt > 500) return;

      const isDesktop = window.innerWidth >= 1024;
      const movingUpward = dy < -60;
      const nearTop = e.clientY < 80;

      if (isDesktop && movingUpward && nearTop) {
        trigger();
      }
    }

    const timerId = setTimeout(trigger, TIMER_TRIGGER_MS);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      clearTimeout(timerId);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Exit intent popup"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
      />

      <div
        className={cn(
          "relative z-10 mx-4 w-full max-w-lg rounded-2xl bg-white p-8 shadow-modal",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 rounded-lg p-1 text-neutral/40 hover:bg-neutral-light hover:text-neutral transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <h2 className="pr-8 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
          Before you go — see what we&apos;ve done for businesses like yours.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-neutral/60">
          Explore real case studies from brands that grew with Creo. From local
          businesses to national campaigns — we deliver results every week.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/portfolio"
            onClick={dismiss}
            className={buttonVariants({
              className:
                "flex-1 bg-brand text-white hover:bg-brand/90 rounded-lg h-11 px-6",
            })}
          >
            View Our Work
          </Link>
          <Link
            href="/pricing"
            onClick={dismiss}
            className={buttonVariants({
              variant: "ghost",
              className:
                "flex-1 rounded-lg h-11 px-6 text-brand border border-border hover:bg-brand-light",
            })}
          >
            See Our Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
