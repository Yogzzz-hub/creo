import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // milliseconds delay for stagger
  variant?: "up" | "scale" | "left" | "right";
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
  threshold = 0.15,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold]);

  const variantClass =
    variant === "scale"
      ? "scroll-reveal-scale"
      : variant === "left"
      ? "scroll-reveal-left"
      : variant === "right"
      ? "scroll-reveal-right"
      : "scroll-reveal";

  return (
    <div
      ref={ref}
      className={`${variantClass} ${isVisible ? "is-visible" : ""} ${className}`}
      style={{
        transitionDelay: delay > 0 ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;
