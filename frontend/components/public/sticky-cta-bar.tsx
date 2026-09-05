"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StickyCTABar() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) return;
    setMounted(true);
  }, []);

  const checkFooter = useCallback(() => {
    const footer = footerRef.current;
    if (!footer) {
      setHidden(false);
      return;
    }
    const footerRect = footer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    setHidden(footerRect.top <= viewportHeight);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    footerRef.current = document.querySelector("footer");
    if (!footerRef.current) return;

    window.addEventListener("scroll", checkFooter, { passive: true });
    checkFooter();
    return () => window.removeEventListener("scroll", checkFooter);
  }, [mounted, checkFooter]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 h-12 items-center justify-center gap-3 text-sm text-white transition-transform duration-300 flex",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{
        background: "linear-gradient(135deg, #2B7BC4 0%, #E8F4FD 100%)",
      }}
    >
      <span className="font-medium">
        Creo — Start growing in 7 days.
      </span>
      <Link
        href="/signup"
        className="inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
      >
        Get Started <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
