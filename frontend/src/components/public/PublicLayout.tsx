import { motion, useReducedMotion } from "motion/react";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { ScrollProgressBar } from "../motion";
import { SmoothScroll } from "../motion/SmoothScroll";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function PublicLayout() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-nebula-void text-slate-50">
      <SmoothScroll />
      <ScrollProgressBar />
      <Navbar />
      <main className="flex-1">
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
