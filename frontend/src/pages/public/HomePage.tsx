import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, ArrowRight, Layers, User, Database, ChevronDown, Zap, Loader2, Instagram, Mail, Check, Layout, Clock } from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
import { request } from "../../lib/http";
import {
  EASE_OUT_EXPO,
  Magnetic,
  Marquee,
  Parallax,
  Reveal,
  ScrollDrawLine,
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
    <TiltCard max={9} lift={30} glow="transparent" className={`relative ${aspect} rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover block transition-transform duration-[900ms] ease-out group-hover/tilt:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050810]/55 via-transparent to-transparent" />
      {label && (
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-[2] bg-[#050810]/70 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium text-white [transform:translateZ(30px)]">
          {label}
        </div>
      )}
    </TiltCard>
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
      <div className="text-[#7FA0D6] bg-[#0A0F18] border border-[#2A3446] rounded-md px-3 py-1 text-xs inline-flex items-center gap-1.5 mt-3">
        <Zap className="size-3.5 fill-current" />
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

export function HomePage() {
  const [sampleEmail, setSampleEmail] = useState("");
  const [sampleHandle, setSampleHandle] = useState("");
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

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
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen font-sans selection:bg-[#7FA0D6]/30">
      
      {/* 1. Hero Section + Collage */}
      <section className="relative isolate overflow-hidden creo-grain">
        {/* Animated particle wave behind the hero */}
        {showScene && (
        <Suspense fallback={null}>
          <HeroWaveScene className="absolute inset-x-0 bottom-0 h-[70%] -z-10 opacity-80 [mask-image:linear-gradient(to_top,#000_40%,transparent)] animate-page-in" />
        </Suspense>
        )}

        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 pt-10 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">

            {/* Left Hero Column */}
            <div className="lg:col-span-7 pr-0 lg:pr-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#121926]/90 border border-[#2A3446] text-xs font-bold tracking-[0.2em] text-[#97A0B3] mb-6 shadow-sm"
              >
                <span className="relative flex size-2">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-60" />
                  <span className="relative size-2 rounded-full bg-[#7FA0D6]" />
                </span>
                <span>A CREATIVE POD FOR D2C BRANDS</span>
              </motion.div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-black tracking-tight leading-[1.03] text-[#F8FAFC]">
                <SplitText text="Content that" animateOnMount className="block" />
                <SplitText text="ships every week." animateOnMount delay={0.12} className="block" />
                <SplitText
                  text="Proof you can"
                  animateOnMount
                  delay={0.24}
                  className="block italic font-serif font-light pr-2"
                />
                <SplitText text="check." animateOnMount delay={0.36} className="block" wordClassName="text-[#BCCCE6]" />
              </h1>

              <Reveal delay={0.45} blur>
                <p className="text-base sm:text-lg lg:text-xl text-[#97A0B3] leading-relaxed max-w-xl mt-7 mb-9 font-normal">
                  A dedicated lead, editor and designer learn your brand, then deliver reels, carousels and stories to a portal where you approve them in one click.
                </p>
              </Reveal>

              <Reveal delay={0.55}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
                  <Magnetic className="w-full sm:w-auto">
                    <Link
                      to="/signup?intent=sample"
                      className="group relative overflow-hidden bg-[#BCCCE6] text-[#050810] font-bold text-base px-8 py-4 rounded-full hover:bg-white transition-all w-full sm:w-auto text-center shadow-xl hover:shadow-2xl inline-flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <span>Get a free sample batch</span>
                      <ArrowRight className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/portal"
                    className="bg-[#121926]/90 backdrop-blur-md border border-[#2A3446] text-[#F8FAFC] font-semibold text-base px-8 py-4 rounded-full hover:border-[#7FA0D6]/80 hover:bg-[#161F2D] transition-all w-full sm:w-auto text-center"
                  >
                    Explore the portal first
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.65}>
                <div className="text-sm font-semibold text-[#97A0B3] mt-10 border-t border-[#222F44]/80 pt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <span className="flex items-center gap-2">
                    <Check className="size-4 text-[#7FA0D6]" /> Month-to-month
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A3446]" />
                  <span className="flex items-center gap-2">
                    <Check className="size-4 text-[#7FA0D6]" /> First batch in 7 days
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A3446]" />
                  <span className="flex items-center gap-2">
                    <Check className="size-4 text-[#7FA0D6]" /> Late batch? Next cycle credited
                  </span>
                </div>
              </Reveal>
            </div>

            {/* Right 3-Column Asymmetric Media Collage — columns drift at different speeds */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, rotateX: 8 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 1.1, delay: 0.2, ease: EASE_OUT_EXPO }}
              className="lg:col-span-5 hero-collage grid grid-cols-3 gap-3 sm:gap-4.5 lg:h-[660px] [perspective:1200px]"
            >
              <Parallax offset={30} className="flex min-w-0 flex-col gap-3 sm:gap-4.5">
                <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Athlete" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[16/11]" alt="Sourdough" src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" />
              </Parallax>

              <Parallax offset={-45} className="flex min-w-0 flex-col gap-3 sm:gap-4.5 pt-4 sm:pt-8">
                <CollageTile aspect="aspect-[16/11]" alt="Interior" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Reel" src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80" />
              </Parallax>

              <Parallax offset={55} className="flex min-w-0 flex-col gap-3 sm:gap-4.5">
                <CollageTile aspect="aspect-[9/14]" alt="Model" src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[4/5]" label="Carousel" alt="Serum" src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80" />
              </Parallax>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1.5 What we ship — infinite marquee */}
      <section aria-label="What we produce" className="border-y border-[#222F44] bg-[#0B111C]/90 py-6 sm:py-7">
        <Marquee speed={42}>
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-12 sm:gap-16 whitespace-nowrap text-base sm:text-lg font-bold tracking-tight text-[#97A0B3]">
              {item}
              <span className="size-2 rotate-45 bg-[#7FA0D6]" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* 2. The Studio Ledger Section */}
      <section className="bg-[#0B111C] py-16 sm:py-24 border-y border-[#222F44]">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Reveal>
              <div className="text-xs sm:text-sm tracking-[0.2em] uppercase font-bold text-[#7FA0D6] mb-4">
                THE STUDIO LEDGER
              </div>
            </Reveal>
            <SplitText
              as="h2"
              text="No star ratings. Just the clock."
              accent={["Just", "the", "clock"]}
              className="block text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-5"
            />
            <Reveal delay={0.15}>
              <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed">
                Every batch we ship is timestamped from the SLA service. Brands stay anonymous, the turnaround doesn't.
              </p>
            </Reveal>
          </div>

          <Reveal direction="up" blur className="max-w-5xl mx-auto">
          <div className="backdrop-blur-md bg-[#161F2D]/80 border border-[#2A3446]/80 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-4 bg-[#0A0F18] border-b border-[#2A3446] p-5 sm:p-6 items-center">
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">Asset / Batch</div>
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">Milestone</div>
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">SLA Time</div>
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider text-right">Status</div>
            </div>
            
            {ledgerData?.has_enough ? (
              <Stagger className="divide-y divide-[#2A3446]" gap={0.07}>
                {(ledgerData.items || []).map((row: any, i: number) => (
                  <StaggerItem key={row.id || i} className="grid grid-cols-4 items-center p-5 sm:p-6 hover:bg-[#121926] transition-colors">
                    <div className="text-base font-bold text-[#F8FAFC]">{row.file_type || "Content Batch"}</div>
                    <div className="text-sm sm:text-base text-[#97A0B3]">Batch {i + 1}</div>
                    <div className="text-sm sm:text-base font-mono text-[#F8FAFC]">SLA Verified</div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#050810] border border-[#7FA0D6]/50 text-[#7FA0D6]">
                        {row.status}
                      </span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <div className="p-12 text-center font-mono text-2xl text-[#97A0B3]">
                —
              </div>
            )}
          </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Horizontal 5-Step Process Rail — the connecting line draws as you scroll */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Reveal>
            <div className="text-xs sm:text-sm tracking-[0.2em] uppercase font-bold text-[#7FA0D6] mb-4">
              HOW THE POD OPERATES
            </div>
          </Reveal>
          <SplitText
            as="h2"
            text="From Brand DNA to Weekly Delivery."
            accent={["Weekly", "Delivery"]}
            className="block text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-5"
          />
          <Reveal delay={0.15}>
            <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed">
              A systematic, transparent cadence engineered to eliminate production bottlenecks.
            </p>
          </Reveal>
        </div>

        <div ref={processRef} className="relative py-10 border-b border-[#2A3446]/40">
          <div className="absolute left-5 right-5 top-[3.75rem] hidden md:block h-px bg-[#2A3446]" />
          <ScrollDrawLine
            progress={processProgress}
            className="absolute left-5 right-5 top-[3.75rem] hidden md:block h-px bg-gradient-to-r from-[#7FA0D6] via-[#BCCCE6] to-[#D8BF9B]"
          />
          <Stagger className="relative grid grid-cols-1 md:grid-cols-5 gap-8" gap={0.12}>
            {[
              { step: "01", time: "Day 1: Brand DNA", desc: "Upload your assets, fonts, and guidelines." },
              { step: "02", time: "Days 2-3: Blueprint", desc: "We map out content pillars and shot lists." },
              { step: "03", time: "Days 4-6: Production", desc: "Our pod designs and edits your deliverables." },
              { step: "04", time: "Day 7: Batch 01", desc: "Review and approve in your one-click portal." },
              { step: "05", time: "Weekly: Scale & Repeat", desc: "Consistent high-impact output on autopilot." }
            ].map((item) => (
              <StaggerItem key={item.step} className="flex flex-col group">
                <div className="relative w-10 h-10 rounded-full border border-[#2A3446] bg-[#050810] text-[#7FA0D6] flex items-center justify-center text-sm font-black mb-4 transition-all duration-300 group-hover:border-[#7FA0D6] group-hover:scale-110 shadow-md">
                  {item.step}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-[#F8FAFC] mb-2">{item.time}</h4>
                <p className="text-sm sm:text-base text-[#97A0B3] leading-relaxed">{item.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 4. Interactive Approval Portal Layout */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Reveal>
            <div className="text-xs sm:text-sm tracking-[0.2em] uppercase font-bold text-[#7FA0D6] mb-4">
              INTERACTIVE CLIENT PORTAL
            </div>
          </Reveal>
          <SplitText
            as="h2"
            text="Review and approve in one click."
            accent={["one", "click"]}
            className="block text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-5"
          />
          <Reveal delay={0.15}>
            <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed">
              No cluttered email threads or lost Slack files. Everything arrives organized for rapid sign-off.
            </p>
          </Reveal>
        </div>

        <Reveal blur className="relative max-w-5xl mx-auto">
          <div className="absolute -top-4 left-8 bg-[#0A0F18] border border-[#7FA0D6]/60 text-[#7FA0D6] text-xs font-bold px-4 py-1.5 rounded-full z-10 shadow-lg tracking-wider">
            TRY IT — THIS PANEL WORKS
          </div>
          
          <div className="backdrop-blur-md bg-[#161F2D]/85 border border-[#2A3446]/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#2A3446]">
              <div className="font-black text-[#F8FAFC] text-xl sm:text-2xl">Batch 04 · Active Review</div>
              <div className="text-sm font-bold text-[#97A0B3] flex items-center gap-4">
                <span className="hidden sm:block w-32 h-2 rounded-full bg-[#2A3446] overflow-hidden">
                  <motion.span
                    className="block h-full rounded-full bg-[#7FA0D6]"
                    animate={{ width: `${(approvedCount / 3) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </span>
                <span>
                  <motion.span key={approvedCount} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-[#F8FAFC] font-black">
                    {approvedCount}
                  </motion.span>{" "}
                  of 3 approved &bull; <span className="text-[#7FA0D6]">On track: 2 days early</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  layout
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={`group bg-[#0A0F18] border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                    asset.status === "approved"
                      ? "border-[#7FA0D6] shadow-lg shadow-[#7FA0D6]/10"
                      : asset.status === "revision"
                        ? "border-[#D8BF9B]/60"
                        : "border-[#2A3446]"
                  }`}
                >
                  {/* Thumbnail */}
                  <img 
                    src={idx === 0 ? "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" : idx === 1 ? "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" : "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80"}
                    alt={asset.name}
                    loading="lazy"
                    className="h-52 sm:h-60 object-cover w-full transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="text-xs font-bold text-[#97A0B3] uppercase tracking-wider mb-1.5">
                      {asset.type.replace(' ', ' • ')}
                    </div>
                    <div className="text-base font-bold text-[#F8FAFC] mb-5 flex-1">{asset.name}</div>
                    
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
                            onClick={() => updateStatus(asset.id, "approved")}
                            className="flex-1 bg-[#BCCCE6] text-[#050810] hover:bg-white font-bold transition-all shadow-sm text-xs sm:text-sm py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="size-4" /> Approve
                          </button>
                          <button 
                            onClick={() => updateStatus(asset.id, "revision")}
                            className="flex-1 bg-transparent border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] font-bold text-xs sm:text-sm py-2.5 rounded-full transition-colors cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      )}
                      
                      {asset.status === "approved" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#7FA0D6] text-xs font-bold">
                            <CheckCircle2 className="size-4 text-emerald-400" /> Approved (queued)
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-[#161F2D] border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                          >
                            Undo
                          </button>
                        </div>
                      )}

                      {asset.status === "revision" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#D8BF9B] text-xs font-bold">
                            <AlertCircle className="size-4 text-amber-400" /> Revision requested
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-[#161F2D] border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
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
        </Reveal>
      </section>

      {/* 5. Pricing Cards (Synchronized with Pricing Page) */}
      <section className="bg-[#050810] py-16 sm:py-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Reveal>
              <div className="inline-flex items-center justify-center bg-[#121926] border border-[#222F44] text-[#7FA0D6] text-xs font-bold px-4 py-1.5 rounded-full mb-4">
                ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
              </div>
            </Reveal>
            <SplitText
              as="h2"
              text="Simple, transparent pricing that scales with your agency."
              accent={["scales", "with", "your", "agency"]}
              className="block text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-5"
            />
            <Reveal delay={0.15}>
              <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed">
                No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
              </p>
            </Reveal>
          </div>
          
          <PricingCards />
        </div>
      </section>

      {/* 5.5 FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <SplitText
            as="h2"
            text="Common Questions"
            accent={["Questions"]}
            className="block text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-5"
          />
          <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed max-w-xl mx-auto">
            Everything you need to know about creative pods, turnaround SLAs, and deliverables.
          </p>
        </div>
        <Stagger className="space-y-4" gap={0.09}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const Icon = faq.icon;
            return (
              <StaggerItem
                key={idx}
                className={`backdrop-blur-md bg-[#161F2D]/80 border ${isOpen ? 'border-[#7FA0D6] shadow-md shadow-[#7FA0D6]/10' : 'border-[#2A3446]/70 hover:border-[#2A3446]'} rounded-2xl p-6 sm:p-7 transition-all`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="flex items-center justify-between w-full cursor-pointer text-left"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-4 pr-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center shrink-0 text-[#7FA0D6]">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-[#F8FAFC] leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {faq.tag}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className={`w-9 h-9 rounded-full border border-[#2A3446] flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0A0F18] text-[#F8FAFC]' : 'text-[#97A0B3] hover:bg-[#0A0F18]'}`}
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
                      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0 sm:pl-16 pt-5">
                        <p className="text-base text-[#97A0B3] leading-relaxed">
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
      <section className="relative isolate overflow-hidden bg-[#0B111C] py-20 sm:py-28 border-y border-[#222F44] creo-grain">
        <Reveal className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <SplitText
            as="h2"
            text="Try us before you pay us."
            accent={["pay"]}
            accentClassName="italic font-serif font-light text-[#BCCCE6]"
            className="block text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F8FAFC] mb-6"
          />
          <p className="text-base sm:text-lg text-[#97A0B3] leading-relaxed mb-12 max-w-2xl mx-auto">
            Drop your Instagram handle and email below. We'll send you a custom sample batch of reels and carousels for your brand, completely free. No credit card required.
          </p>
          
          {sampleSuccess ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-950/50 border border-emerald-800/80 text-center max-w-lg mx-auto shadow-2xl">
              <div className="size-14 rounded-full bg-emerald-500 text-[#0B111C] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Check className="size-7 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sample Batch Requested!</h3>
              <p className="text-sm text-emerald-300 leading-relaxed">
                We received your Instagram handle ({sampleHandle}) and email ({sampleEmail}). Our creative team will prepare your custom sample batch within 48 hours.
              </p>
            </div>
          ) : (
            <form 
              onSubmit={handleRequestSample}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 max-w-3xl mx-auto backdrop-blur-md bg-[#161F2D]/60 p-3 sm:p-4 rounded-3xl border border-[#2A3446] shadow-2xl"
            >
              <div className="relative flex-1">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-[#97A0B3]" />
                <input 
                  type="text" 
                  value={sampleHandle}
                  onChange={(e) => setSampleHandle(e.target.value)}
                  placeholder="@yourbrand" 
                  required
                  className="bg-[#0A0F18] border border-[#2A3446] text-[#F8FAFC] rounded-2xl pl-11 pr-4 py-3.5 text-base focus:border-[#7FA0D6] focus:outline-none w-full transition-colors font-medium" 
                />
              </div>
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-[#97A0B3]" />
                <input 
                  type="email" 
                  value={sampleEmail}
                  onChange={(e) => setSampleEmail(e.target.value)}
                  placeholder="name@brand.com" 
                  required
                  className="bg-[#0A0F18] border border-[#2A3446] text-[#F8FAFC] rounded-2xl pl-11 pr-4 py-3.5 text-base focus:border-[#7FA0D6] focus:outline-none w-full transition-colors font-medium" 
                />
              </div>
              <button 
                type="submit"
                disabled={sampleSubmitting}
                className="bg-[#BCCCE6] text-[#050810] hover:bg-white font-bold transition-all shadow-lg text-base px-8 py-3.5 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sampleSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Request Sample"}
                <ArrowRight className="size-4.5" />
              </button>
            </form>
          )}

          {sampleError && (
            <p className="text-sm text-rose-400 font-semibold mt-4">{sampleError}</p>
          )}

          <div className="text-sm font-semibold text-[#97A0B3] mt-8">
            No commitment required. 48-hour sample turnaround for qualified D2C brands.
          </div>
        </Reveal>
      </section>

    </div>
  );
}
