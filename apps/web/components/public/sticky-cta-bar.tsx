"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StickyCTABar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      const footer = document.querySelector("[data-footer]");
      if (!footer) {
        setHidden(false);
        return;
      }
      const footerRect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      setHidden(footerRect.top <= viewportHeight);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "hidden md:flex fixed bottom-0 left-0 right-0 z-30 h-12 items-center justify-center gap-3 text-sm text-white transition-transform duration-300",
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
