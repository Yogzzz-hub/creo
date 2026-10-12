import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, ArrowRight, ArrowUpRight, Layers, User, Database, ChevronDown, Zap, Loader2, Instagram, Mail, Check, Layout, Clock } from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
import { request } from "../../lib/http";
import {
  CursorSpotlight,
  EASE_OUT_EXPO,
  HighlightSweep,
  Magnetic,
  Marquee,
  MaskReveal,
  MaskedTextZoom,
  Parallax,
  Reveal,
  ScrollDrawLine,
  ScrollMask,
  SplitText,
  Stagger,
  StaggerItem,
  TiltCard,
} from "../../components/motion";
import { whenIdle } from "../../app/lazy-pages";

// three.js only loads on the landing page, after the hero text is on screen
const HeroWaveScene = lazy(() => import("../../components/motion/HeroWaveScene"));

const MARQUEE_ITEMS = [
  "Reels 9:16",
  "Carousels",
  "Stories",
  "Product shoots",
  "Launch teasers",
  "UGC edits",
  "Brand DNA",
  "Weekly batches",
  "Skincare",
  "Food & beverage",
  "Activewear",
  "Home & living",
];

function CollageTile({
  src,
  alt,
  aspect,
  label,
}: {
  src: string;
  alt: string;
  aspect: string;
  label?: string;
}) {
  return (
    <TiltCard max={9} lift={30} glow="rgba(125,162,255,0.18)" className={`relative ${aspect} rounded-2xl border border-white/10 overflow-hidden bg-[#0D1530] shadow-[0_24px_50px_-20px_rgba(1,4,16,0.9)]`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover block transition-transform duration-[900ms] ease-out group-hover/tilt:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050A1A]/70 via-[#050A1A]/5 to-transparent" />
      {label && (
        <div className="creo-glass absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-[2] px-2.5 py-1 rounded-full text-[11px] font-semibold text-white [transform:translateZ(30px)]">
          {label}
        </div>
      )}
    </TiltCard>
  );
}

/** Eyebrow + masked headline + intro copy used by every homepage section */
function SectionHeading({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
      <Reveal>
        <span className="creo-eyebrow">{eyebrow}</span>
      </Reveal>
      <SplitText
        as="h2"
        text={title}
        accent={accent}
        className="block mt-6 text-[2rem] sm:text-5xl lg:text-[3.75rem] font-black tracking-[-0.035em] leading-[1.04] text-[#F4F7FF] mb-5"
      />
      {children && (
        <Reveal delay={0.15}>
          <p className="text-base sm:text-lg text-[#93A0BF] leading-relaxed max-w-2xl mx-auto">{children}</p>
        </Reveal>
      )}
    </div>
  );
}

const faqs = [
  {
    category: "Migration & Tools",
    tag: "MIGRATION & WORKFLOW",
    question: "How does CREO streamline content creation for D2C brands?",
    icon: Layers,
    answer: "CREO connects content briefs directly to creative leads and client sign-offs. Your briefs trigger automated SLA revision tickets and real-time deliverables tracking—eliminating delays and fragmented communication.",
    extra: (
      <div className="text-[#DCE8FF] bg-[#4F7BFF]/10 border border-[#4F7BFF]/30 rounded-full px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 mt-4">
        <Zap className="size-3.5 fill-current text-[#7DA2FF]" />
        Typical D2C brand onboarding completed in under 48 hours.
      </div>
    ),
  },
  {
    category: "Deliverables & Formats",
    tag: "CONTENT FORMATS",
    question: "What content deliverables are included in our monthly pod retainer?",
    icon: Layout,
    answer: "Depending on your plan tier (Starter, Growth, or Scale), your pod delivers a fixed monthly volume of high-converting 9:16 reels, static/carousel brand posts, and interactive story sets."
  },
  {
    category: "Turnaround & SLAs",
    tag: "PRODUCTION SLAs",
    question: "What are the guaranteed turnaround times for content batches?",
    icon: Clock,
    answer: "Every deliverable batch is produced under strict SLA timelines: 3 business days for Starter, 2 business days for Growth, and 24-hour priority turnaround for Scale."
  },
  {
    category: "Revisions & Approvals",
    tag: "ONE-CLICK REVIEW",
    question: "How do revisions work inside the client portal?",
    icon: User,
    answer: "You review draft assets in your portal. If revisions are needed, click Decline, enter your feedback, and your pod will revise and resubmit within your plan's revision quota."
  },
  {
    category: "Flexibility & Terms",
    tag: "MONTH-TO-MONTH",
    question: "Can we upgrade, pause, or cancel our retainer anytime?",
    icon: Database,
    answer: "Yes. All Creo retainers operate on a month-to-month basis with no long-term lock-in. You can upgrade, pause renewal, or cancel anytime."
  }
];

const PROCESS_STEPS = [
  { step: "01", time: "Day 1: Brand DNA", desc: "Upload your assets, fonts, and guidelines." },
  { step: "02", time: "Days 2-3: Blueprint", desc: "We map out content pillars and shot lists." },
  { step: "03", time: "Days 4-6: Production", desc: "Our pod designs and edits your deliverables." },
  { step: "04", time: "Day 7: Batch 01", desc: "Review and approve in your one-click portal." },
  { step: "05", time: "Weekly: Scale & Repeat", desc: "Consistent high-impact output on autopilot." }
];

export function HomePage() {
  const [sampleEmail, setSampleEmail] = useState("");
  const [sampleHandle, setSampleHandle] = useState("");
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const { data: ledgerData } = useQuery<{ has_enough: boolean; items: any[] }>({
    queryKey: ["public-ledger"],
    queryFn: () => request<any>("/api/v1/public/ledger"),
    staleTime: 60_000,
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [assets, setAssets] = useState([
    { id: 1, name: "Brand Launch Teaser", type: "Reel 9:16", status: "awaiting" },
    { id: 2, name: "Product Feature Breakdown", type: "Carousel 4 slides", status: "awaiting" },
    { id: 3, name: "Serum launch countdown", type: "Story 3 frames", status: "approved" },
  ]);

  const updateStatus = (id: number, status: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const approvedCount = assets.filter(a => a.status === "approved").length;
  // Fetch the WebGL scene only once the page is idle so it never delays first paint
  const [showScene, setShowScene] = useState(false);
  useEffect(() => whenIdle(() => setShowScene(true)), []);
  const processRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: processProgress } = useScroll({
    target: processRef,
    offset: ["start 85%", "end 55%"],
  });

  const handleRequestSample = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sampleEmail || !sampleEmail.includes("@")) {
      setSampleError("Please enter a valid work email address.");
      return;
    }
    if (!sampleHandle.trim()) {
      setSampleError("Please enter your Instagram handle.");
      return;
    }
    setSampleSubmitting(true);
    setSampleError(null);
    try {
      await request("/api/v1/public/sample", {
        method: "POST",
        body: JSON.stringify({
          email: sampleEmail.trim(),
          instagram_handle: sampleHandle.trim(),
        }),
      });
      setSampleSuccess(true);
    } catch (err: unknown) {
      setSampleError(err instanceof Error ? err.message : "Failed to submit sample request.");
    } finally {
      setSampleSubmitting(false);
    }
  };

  return (
    <div className="w-full text-[#F4F7FF] min-h-screen font-sans">

      {/* 1. Hero — masked headline, collage unveiled tile by tile */}
      <section className="relative isolate overflow-hidden creo-grain -mt-[76px] sm:-mt-[84px] pt-[76px] sm:pt-[84px]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 creo-grid-bg [mask-image:radial-gradient(80%_70%_at_70%_20%,#000_10%,transparent_75%)] opacity-60" />
        <CursorSpotlight className="-z-10" />
        <div aria-hidden="true" className="absolute -top-40 right-[-10%] -z-10 size-[640px] rounded-full bg-[#3B6BFF]/20 blur-[140px]" />
        <div aria-hidden="true" className="absolute top-1/3 -left-40 -z-10 size-[420px] rounded-full bg-[#7DD3FC]/[0.07] blur-[120px]" />
        {/* Animated particle wave behind the hero */}
        {showScene && (
        <Suspense fallback={null}>
          <HeroWaveScene className="absolute inset-x-0 bottom-0 h-[70%] -z-10 opacity-70 [mask-image:linear-gradient(to_top,#000_40%,transparent)] animate-page-in" />
        </Suspense>
        )}

        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">

            {/* Left Hero Column */}
            <div className="lg:col-span-7 pr-0 lg:pr-8 relative z-10">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
                className="mb-7"
              >
                <span className="creo-eyebrow">A creative pod for D2C brands</span>
              </motion.div>

              <h1 className="text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.6rem] font-black tracking-[-0.045em] leading-[0.98] text-[#F4F7FF]">
                <SplitText text="Content that" animateOnMount delay={0.1} className="block" />
                <SplitText text="ships every week." animateOnMount delay={0.22} className="block" />
                <SplitText
                  text="Proof you can"
                  animateOnMount
                  delay={0.34}
                  className="block italic font-serif font-normal tracking-[-0.02em] text-[#DCE8FF] pr-2"
                />
                <HighlightSweep delay={1.05}>
                  <SplitText text="check." animateOnMount delay={0.46} className="block" wordClassName="creo-text-gradient pr-1" />
                </HighlightSweep>
              </h1>

              <Reveal delay={0.55} blur>
                <p className="text-base sm:text-lg lg:text-xl text-[#93A0BF] leading-relaxed max-w-xl mt-8 mb-10 font-normal">
                  A dedicated lead, editor and designer learn your brand, then deliver reels, carousels and stories to a portal where you approve them in one click.
                </p>
              </Reveal>

              <Reveal delay={0.65}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Magnetic className="w-full sm:w-auto">
                    <Link
                      to="/signup?intent=sample"
                      className="creo-btn-primary group font-semibold text-base px-8 py-4 rounded-full w-full sm:w-auto text-center inline-flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <span>Get a free sample batch</span>
                      <ArrowRight className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/portal"
                    className="creo-btn-ghost group font-semibold text-base px-8 py-4 rounded-full w-full sm:w-auto text-center inline-flex items-center justify-center gap-2"
                  >
                    Explore the portal first
                    <ArrowUpRight className="size-4 text-[#7DA2FF] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.75}>
                <div className="text-sm font-medium text-[#93A0BF] mt-12 pt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.07]">
                  {["Month-to-month", "First batch in 7 days", "Late batch? Next cycle credited"].map((item) => (
                    <span key={item} className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-[#4F7BFF]/15 ring-1 ring-inset ring-[#4F7BFF]/40">
                        <Check className="size-3 text-[#7DA2FF]" />
                      </span>
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right 3-column collage — each tile is unveiled through a mask, columns drift at different speeds */}
            <div className="lg:col-span-5 relative">
              <div className="hero-collage grid grid-cols-3 gap-3 sm:gap-4.5 lg:h-[660px]">
                <Parallax offset={30} className="flex min-w-0 flex-col gap-3 sm:gap-4.5">
                  <MaskReveal animateOnMount from="bottom" delay={0.3}>
                    <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Athlete" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                  <MaskReveal animateOnMount from="bottom" delay={0.55}>
                    <CollageTile aspect="aspect-[16/11]" alt="Sourdough" src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                </Parallax>

                <Parallax offset={-45} className="flex min-w-0 flex-col gap-3 sm:gap-4.5 pt-4 sm:pt-8">
                  <MaskReveal animateOnMount from="top" delay={0.42}>
                    <CollageTile aspect="aspect-[16/11]" alt="Interior" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                  <MaskReveal animateOnMount from="top" delay={0.66}>
                    <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Reel" src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                </Parallax>

                <Parallax offset={55} className="flex min-w-0 flex-col gap-3 sm:gap-4.5">
                  <MaskReveal animateOnMount from="bottom" delay={0.36}>
                    <CollageTile aspect="aspect-[9/14]" alt="Model" src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                  <MaskReveal animateOnMount from="bottom" delay={0.6}>
                    <CollageTile aspect="aspect-[4/5]" label="Carousel" alt="Serum" src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80" />
                  </MaskReveal>
                </Parallax>
              </div>

              {/* Floating glass status chip */}
              <motion.div
                initial={reduce ? false : { opacity: 0, x: -24, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: 1.3, ease: EASE_OUT_EXPO }}
                className="absolute -left-4 bottom-[18%] z-20 hidden sm:block lg:-left-10"
              >
                <motion.div
                  animate={reduce ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="creo-glass-strong flex items-center gap-3 rounded-2xl py-3 pl-3 pr-5"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5A85FF] to-[#3B6BFF] shadow-[0_8px_20px_-6px_rgba(59,107,255,0.9)]">
                    <CheckCircle2 className="size-4.5 text-white" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-[#F4F7FF]">Batch 04 approved</span>
                    <span className="text-xs text-[#93A0BF]">Delivered 2 days early</span>
                  </span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5 What we ship — infinite marquee */}
      <section aria-label="What we produce" className="relative py-6 sm:py-7 bg-white/[0.02] backdrop-blur-sm">
        <div aria-hidden="true" className="creo-seam absolute inset-x-0 top-0" />
        <Marquee speed={42}>
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-12 sm:gap-16 whitespace-nowrap text-base sm:text-lg font-semibold tracking-[-0.01em] text-[#B4BFDA]">
              {item}
              <span className="size-1.5 rotate-45 bg-[#4F7BFF] shadow-[0_0_10px_2px_rgba(79,123,255,0.7)]" />
            </span>
          ))}
        </Marquee>
        <div aria-hidden="true" className="creo-seam absolute inset-x-0 bottom-0" />
      </section>

      {/* 1.8 Signature masking scene — the word is a stencil over the studio */}
      <MaskedTextZoom
        text="creo."
        image="/assets/workflow/studio_master.jpg"
        imageAlt="The Creo studio: a lead and an editor reviewing footage at an editing desk"
        eyebrow="Scroll to step inside"
      >
        <div className="max-w-3xl">
          <span className="creo-eyebrow">Inside the pod</span>
          <h2 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[1.0] text-white">
            One pod. One portal.{" "}
            <span className="italic font-serif font-normal tracking-[-0.02em] text-[#DCE8FF]">Every week.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#C9D3EA]">
            Your lead, editor and designer work from your Brand DNA, so every reel, carousel and story ships on-brand and on schedule.
          </p>
          <Link
            to="/work"
            className="creo-btn-ghost group mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
          >
            See the work
            <ArrowUpRight className="size-4 text-[#7DA2FF] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </MaskedTextZoom>

      {/* 2. The Studio Ledger — band opens out of a rounded mask as it arrives */}
      <ScrollMask inset={5} radius={48} endRadius={0} className="relative bg-gradient-to-b from-[#081130] to-[#060C24]">
        <section className="relative py-20 sm:py-28">
          <div aria-hidden="true" className="absolute inset-0 creo-grid-bg [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)] opacity-70" />
          <div className="relative max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
            <SectionHeading eyebrow="The studio ledger" title="No star ratings. Just the clock." accent={["Just", "the", "clock."]}>
              Every batch we ship is timestamped from the SLA service. Brands stay anonymous, the turnaround doesn't.
            </SectionHeading>

            <MaskReveal from="bottom" zoom={1.04} className="max-w-5xl mx-auto">
              <div className="creo-glass rounded-3xl overflow-hidden">
                <div className="grid grid-cols-4 bg-white/[0.03] border-b border-white/[0.08] p-5 sm:p-6 items-center">
                  <div className="text-[11px] sm:text-xs font-bold text-[#B4BFDA] uppercase tracking-[0.16em]">Asset / Batch</div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#B4BFDA] uppercase tracking-[0.16em]">Milestone</div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#B4BFDA] uppercase tracking-[0.16em]">SLA Time</div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#B4BFDA] uppercase tracking-[0.16em] text-right">Status</div>
                </div>

                {ledgerData?.has_enough ? (
                  <Stagger className="divide-y divide-white/[0.06]" gap={0.07}>
                    {(ledgerData.items || []).map((row: any, i: number) => (
                      <StaggerItem key={row.id || i} className="grid grid-cols-4 items-center p-5 sm:p-6 hover:bg-white/[0.03] transition-colors">
                        <div className="text-base font-bold text-[#F4F7FF]">{row.file_type || "Content Batch"}</div>
                        <div className="text-sm sm:text-base text-[#93A0BF]">Batch {i + 1}</div>
                        <div className="text-sm sm:text-base font-mono text-[#F4F7FF]">SLA Verified</div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#4F7BFF]/10 border border-[#4F7BFF]/40 text-[#9DB8FF]">
                            <span className="size-1.5 rounded-full bg-[#7DA2FF] shadow-[0_0_8px_1px_rgba(79,123,255,0.9)]" />
                            {row.status}
                          </span>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                ) : (
                  <div className="p-12 text-center font-mono text-2xl text-[#93A0BF]">
                    —
                  </div>
                )}
              </div>
            </MaskReveal>
          </div>
        </section>
      </ScrollMask>

      {/* 3. Horizontal 5-Step Process Rail — the connecting line draws as you scroll */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHeading eyebrow="How the pod operates" title="From Brand DNA to Weekly Delivery." accent={["Weekly", "Delivery."]}>
          A systematic, transparent cadence engineered to eliminate production bottlenecks.
        </SectionHeading>

        <div ref={processRef} className="relative py-10">
          <div className="absolute left-5 right-5 top-[3.75rem] hidden md:block h-px bg-white/[0.08]" />
          <ScrollDrawLine
            progress={processProgress}
            className="absolute left-5 right-5 top-[3.75rem] hidden md:block h-px bg-gradient-to-r from-[#3B6BFF] via-[#DCE8FF] to-[#7DD3FC] shadow-[0_0_12px_1px_rgba(79,123,255,0.6)]"
          />
          <Stagger className="relative grid grid-cols-1 md:grid-cols-5 gap-8" gap={0.12}>
            {PROCESS_STEPS.map((item) => (
              <StaggerItem key={item.step} className="flex flex-col group">
                <div className="relative w-10 h-10 rounded-full border border-[#4F7BFF]/40 bg-[#050A1A] text-[#9DB8FF] flex items-center justify-center text-sm font-black mb-5 transition-all duration-500 group-hover:border-[#7DA2FF] group-hover:scale-110 group-hover:shadow-[0_0_24px_2px_rgba(79,123,255,0.55)]">
                  {item.step}
                </div>
                <h4 className="text-base sm:text-lg font-bold tracking-[-0.01em] text-[#F4F7FF] mb-2">{item.time}</h4>
                <p className="text-sm sm:text-base text-[#93A0BF] leading-relaxed">{item.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 4. Interactive Approval Portal Layout */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 pb-20 sm:pb-28">
        <SectionHeading eyebrow="Interactive client portal" title="Review and approve in one click." accent={["one", "click."]}>
          No cluttered email threads or lost Slack files. Everything arrives organized for rapid sign-off.
        </SectionHeading>

        <div className="relative max-w-5xl mx-auto">
          <div aria-hidden="true" className="absolute inset-x-10 -top-10 -bottom-10 -z-10 rounded-[48px] bg-[#3B6BFF]/[0.12] blur-[90px]" />
          <Reveal delay={0.2} className="absolute -top-4 left-8 z-10">
            <div className="creo-glass-strong text-[#DCE8FF] text-[11px] font-bold px-4 py-1.5 rounded-full tracking-[0.14em]">
              TRY IT — THIS PANEL WORKS
            </div>
          </Reveal>

          <MaskReveal from="center" zoom={1.06} duration={1.3}>
          <div className="creo-glass rounded-3xl p-6 sm:p-10 relative overflow-hidden">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/[0.08]">
              <div className="font-black tracking-[-0.02em] text-[#F4F7FF] text-xl sm:text-2xl">Batch 04 · Active Review</div>
              <div className="text-sm font-semibold text-[#93A0BF] flex items-center gap-4">
                <span className="hidden sm:block w-32 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.span
                    className="block h-full rounded-full bg-gradient-to-r from-[#3B6BFF] to-[#7DD3FC]"
                    animate={{ width: `${(approvedCount / 3) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </span>
                <span>
                  <motion.span key={approvedCount} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-[#F4F7FF] font-black">
                    {approvedCount}
                  </motion.span>{" "}
                  of 3 approved &bull; <span className="text-[#9DB8FF]">On track: 2 days early</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-8">
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  layout
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={`group bg-[#081028]/80 border rounded-2xl overflow-hidden flex flex-col transition-[border-color,box-shadow] duration-500 ${
                    asset.status === "approved"
                      ? "border-[#4F7BFF]/70 shadow-[0_18px_40px_-18px_rgba(59,107,255,0.7)]"
                      : asset.status === "revision"
                        ? "border-[#FBBF77]/50"
                        : "border-white/[0.08]"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden">
                    <img
                      src={idx === 0 ? "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" : idx === 1 ? "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" : "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80"}
                      alt={asset.name}
                      loading="lazy"
                      className="h-52 sm:h-60 object-cover w-full transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#081028] via-transparent to-transparent" />
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="text-[11px] font-bold text-[#93A0BF] uppercase tracking-[0.14em] mb-1.5">
                      {asset.type.replace(' ', ' • ')}
                    </div>
                    <div className="text-base font-bold text-[#F4F7FF] mb-5 flex-1">{asset.name}</div>

                    <div className="flex items-center justify-between mt-auto min-h-[40px]">
                      <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={asset.status}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                        className="w-full"
                      >
                      {asset.status === "awaiting" && (
                        <div className="flex items-center gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={() => updateStatus(asset.id, "approved")}
                            className="creo-btn-primary flex-1 font-semibold text-xs sm:text-sm py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="size-4" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(asset.id, "revision")}
                            className="creo-btn-ghost flex-1 font-semibold text-xs sm:text-sm py-2.5 rounded-full cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      {asset.status === "approved" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#9DB8FF] text-xs font-bold">
                            <CheckCircle2 className="size-4 text-[#7DA2FF]" /> Approved (queued)
                          </div>
                          <button
                            type="button"
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="creo-btn-ghost text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer"
                          >
                            Undo
                          </button>
                        </div>
                      )}

                      {asset.status === "revision" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#FBBF77] text-xs font-bold">
                            <AlertCircle className="size-4" /> Revision requested
                          </div>
                          <button
                            type="button"
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="creo-btn-ghost text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer"
                          >
                            Undo
                          </button>
                        </div>
                      )}
                      </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          </MaskReveal>
        </div>
      </section>

      {/* 5. Pricing Cards (Synchronized with Pricing Page) */}
      <ScrollMask inset={5} radius={48} endRadius={0} className="relative bg-gradient-to-b from-[#060C24] via-[#081130] to-[#050A1A]">
        <section className="relative py-20 sm:py-28">
          <div aria-hidden="true" className="absolute left-1/2 top-0 h-[420px] w-[min(900px,100vw)] -translate-x-1/2 rounded-full bg-[#3B6BFF]/[0.12] blur-[120px]" />
          <div className="relative max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
            <SectionHeading
              eyebrow="Predictable agency infrastructure"
              title="Simple, transparent pricing that scales with your agency."
              accent={["scales", "with", "your", "agency."]}
            >
              No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
            </SectionHeading>

            <PricingCards />
          </div>
        </section>
      </ScrollMask>

      {/* 5.5 FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-20 sm:py-28">
        <SectionHeading eyebrow="FAQ" title="Common Questions" accent={["Questions"]}>
          Everything you need to know about creative pods, turnaround SLAs, and deliverables.
        </SectionHeading>
        <Stagger className="space-y-3.5" gap={0.09}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const Icon = faq.icon;
            return (
              <StaggerItem
                key={idx}
                className={`rounded-2xl p-5 sm:p-7 transition-[box-shadow,background-color] duration-500 ${isOpen ? "creo-glass-strong creo-glow-ring" : "creo-glass hover:bg-white/[0.03]"}`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="flex items-center justify-between w-full cursor-pointer text-left"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-4 pr-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 ${isOpen ? "bg-gradient-to-br from-[#5A85FF] to-[#3B6BFF] text-white shadow-[0_8px_20px_-6px_rgba(59,107,255,0.9)]" : "bg-white/[0.04] ring-1 ring-inset ring-white/10 text-[#7DA2FF]"}`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-[#F4F7FF] leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex border border-white/10 text-[#9DB8FF] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.14em]">
                      {faq.tag}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isOpen ? "border-[#4F7BFF]/60 bg-[#4F7BFF]/15 text-[#F4F7FF]" : "border-white/10 text-[#93A0BF]"}`}
                    >
                      <ChevronDown className="size-4" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0 sm:pl-15 pt-5">
                        <p className="text-base text-[#93A0BF] leading-relaxed">
                          {faq.answer}
                        </p>
                        {faq.extra && faq.extra}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* 6. "Try Us Before You Pay Us" Lead Capture Section */}
      <ScrollMask inset={6} radius={56} endRadius={0} className="relative">
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#0F2063] via-[#0A1642] to-[#060C26] py-24 sm:py-32 creo-grain">
          <div aria-hidden="true" className="absolute inset-0 -z-10 creo-grid-bg [mask-image:radial-gradient(60%_60%_at_50%_40%,#000,transparent)]" />
          <div aria-hidden="true" className="absolute -top-32 left-1/2 -z-10 size-[620px] -translate-x-1/2 rounded-full bg-[#4F7BFF]/25 blur-[130px]" />
          <Reveal className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
            <span className="creo-eyebrow">Free sample batch</span>
            <SplitText
              as="h2"
              text="Try us before you pay us."
              accent={["pay"]}
              accentClassName="italic font-serif font-normal text-[#DCE8FF]"
              className="block mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] text-[#F4F7FF] mb-6"
            />
            <p className="text-base sm:text-lg text-[#B4BFDA] leading-relaxed mb-12 max-w-2xl mx-auto">
              Drop your Instagram handle and email below. We'll send you a custom sample batch of reels and carousels for your brand, completely free. No credit card required.
            </p>

            {sampleSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                className="creo-glass-strong p-6 sm:p-8 rounded-3xl text-center max-w-lg mx-auto"
              >
                <div className="size-14 rounded-full bg-gradient-to-br from-[#5A85FF] to-[#3B6BFF] text-white flex items-center justify-center mx-auto mb-4 shadow-[0_12px_30px_-8px_rgba(59,107,255,0.9)]">
                  <Check className="size-7 stroke-[3]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sample Batch Requested!</h3>
                <p className="text-sm text-[#B4BFDA] leading-relaxed">
                  We received your Instagram handle ({sampleHandle}) and email ({sampleEmail}). Our creative team will prepare your custom sample batch within 48 hours.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleRequestSample}
                className="creo-glass-strong flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-3xl mx-auto p-3 rounded-[28px]"
              >
                <div className="relative flex-1">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-[#7DA2FF]" />
                  <input
                    type="text"
                    value={sampleHandle}
                    onChange={(e) => setSampleHandle(e.target.value)}
                    placeholder="@yourbrand"
                    aria-label="Instagram handle"
                    required
                    className="bg-[#050A1A]/60 border border-white/10 text-[#F4F7FF] placeholder:text-[#6F7C9C] rounded-2xl pl-11 pr-4 py-3.5 text-base focus:border-[#4F7BFF] focus:ring-4 focus:ring-[#4F7BFF]/15 focus:outline-none w-full transition-[border-color,box-shadow] font-medium"
                  />
                </div>
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-[#7DA2FF]" />
                  <input
                    type="email"
                    value={sampleEmail}
                    onChange={(e) => setSampleEmail(e.target.value)}
                    placeholder="name@brand.com"
                    aria-label="Work email"
                    required
                    className="bg-[#050A1A]/60 border border-white/10 text-[#F4F7FF] placeholder:text-[#6F7C9C] rounded-2xl pl-11 pr-4 py-3.5 text-base focus:border-[#4F7BFF] focus:ring-4 focus:ring-[#4F7BFF]/15 focus:outline-none w-full transition-[border-color,box-shadow] font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sampleSubmitting}
                  className="creo-btn-primary font-semibold text-base px-8 py-3.5 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sampleSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Request Sample"}
                  <ArrowRight className="size-4.5" />
                </button>
              </form>
            )}

            {sampleError && (
              <p role="alert" className="text-sm text-[#FDA4AF] font-semibold mt-4">{sampleError}</p>
            )}

            <div className="text-sm font-medium text-[#93A0BF] mt-8">
              No commitment required. 48-hour sample turnaround for qualified D2C brands.
            </div>
          </Reveal>
        </section>
      </ScrollMask>

    </div>
  );
}
