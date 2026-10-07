import { motion, useReducedMotion } from "motion/react";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { ScrollProgressBar } from "../motion";
import { SmoothScroll } from "../motion/SmoothScroll";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import "../../styles/public-responsive.css";

export function PublicLayout() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <div className="public-site flex min-h-[100svh] flex-col bg-[#050810] text-[#F8FAFC]">
      <a href="#main-content" className="public-skip-link">Skip to content</a>
      <SmoothScroll />
      <ScrollProgressBar />
      <Navbar />
      <main id="main-content" className="min-w-0 flex-1">
        <Suspense fallback={<CreoInlineLoader className="min-h-[70vh]" />}>
          {/* Soft cross-fade + rise between marketing pages */}
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
