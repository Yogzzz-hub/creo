"use client";

import { useEffect, useRef } from "react";
import { HeroSection } from "@/components/public/sections/hero";
import { MetricsSection } from "@/components/public/sections/metrics";
import { HowItWorksSection } from "@/components/public/sections/how-it-works";
import { LeadMagnetSection } from "@/components/public/sections/lead-magnet";

const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Creo",
  description:
    "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
  url: "https://www.getcreo.in",
  telephone: "+91-9999999999",
  email: "hello@getcreo.in",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/getcreo",
    "https://www.linkedin.com/company/getcreo",
    "https://twitter.com/getcreo",
  ],
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "50",
  },
};

export default function HomePage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 1. Reveal on scroll IntersectionObserver
    const revealElements = document.querySelectorAll(".reveal-element");
    
    observerRef.current = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.15
    });

    revealElements.forEach(el => observerRef.current?.observe(el));

    // 2. Animated Number Counter for Stats Section
    const statsSection = document.getElementById("stats");
    const counters = document.querySelectorAll(".counter-number");
    let hasCounted = false;

    const runCounters = () => {
      counters.forEach(counter => {
        const targetAttr = counter.getAttribute("data-target");
        if (!targetAttr) return;
        
        const target = parseInt(targetAttr, 10);
        const suffix = counter.getAttribute("data-suffix") || "";
        const useComma = counter.getAttribute("data-comma") === "true";
        const duration = 1600; // ms
        const startTime = performance.now();

        const updateCount = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(easeOut * target);

          let formattedNumber = current.toString();
          if (useComma && current >= 1000) {
            formattedNumber = current.toLocaleString("en-US");
          }

          counter.textContent = formattedNumber + suffix;

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            let finalNumber = target.toString();
            if (useComma && target >= 1000) {
              finalNumber = target.toLocaleString("en-US");
            }
            counter.textContent = finalNumber + suffix;
          }
        };

        requestAnimationFrame(updateCount);
      });
    };

    if (statsSection && counters.length > 0) {
      const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasCounted) {
            hasCounted = true;
            runCounters();
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.2
      });

      statsObserver.observe(statsSection);
      
      return () => {
        statsObserver.disconnect();
      };
    }
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA),
        }}
      />
      
      <HeroSection />
      <MetricsSection />
      <HowItWorksSection />
      <LeadMagnetSection />
    </>
  );
}
