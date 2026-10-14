import { AnimatePresence, motion } from "motion/react";
import { Suspense } from "react";
import { useLocation, useOutlet } from "react-router";
import { useReducedMotion } from "../../lib/useReducedMotion";
import { ScrollProgressBar } from "../motion";
import { SmoothScroll } from "../motion/SmoothScroll";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import "../../styles/public-responsive.css";

export function PublicLayout() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const landing = pathname === "/";
  const outlet = useOutlet();

  return (
    <div className="public-site flex min-h-[100svh] flex-col bg-[#050810] text-[#F8FAFC]">
      <a href="#main-content" className="public-skip-link">Skip to content</a>
      <SmoothScroll />
      <ScrollProgressBar />
      <Navbar landing={landing} />
      <main id="main-content" className="min-w-0 flex-1">
        <Suspense fallback={<CreoInlineLoader className="min-h-[70vh]" />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1, y: 0 } : {
                opacity: 0,
                y: -8,
                transition: { duration: 0.18 },
              }}
              transition={{ duration: reduce ? 0 : landing ? 0.55 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer landing={landing} />
    </div>
  );
}
