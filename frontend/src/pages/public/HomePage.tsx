import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { CheckCircle2, AlertCircle, ArrowRight, Layers, User, BarChart2, Database, ChevronDown, Zap } from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
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
    <TiltCard max={9} lift={30} glow="transparent" className={`relative ${aspect} rounded-2xl border border-nebula-steel overflow-hidden bg-nebula-surface shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover block transition-transform duration-[900ms] ease-out group-hover/tilt:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-nebula-void/55 via-transparent to-transparent" />
      {label && (
        <div className="absolute bottom-3 left-3 z-[2] bg-nebula-void/70 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium text-white [transform:translateZ(30px)]">
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
    question: "How does CREO replace our existing stack of WhatsApp, Drive, and spreadsheets?",
    icon: Layers,
    answer: "CREO doesn't just store files; it connects them directly to team capacity and client sign-offs. Your briefs connect to Figma/Adobe, client feedback triggers automated SLA revision tickets to motion leads, and retainer hours calculate contribution margins automatically—eliminating the 7 fragmented silos.",
    extra: (
      <div className="text-nebula-glow bg-nebula-navy border border-nebula-steel rounded-md px-3 py-1 text-xs inline-flex items-center gap-1.5 mt-3">
        <Zap className="size-3.5 fill-current" />
        Typical agency migration completed in under 48 hours.
      </div>
    )
  },
  {
    category: "Client Portals & Approvals",
    tag: "CLIENT PORTALS",
    question: "Do our clients need to create a CREO account to review and approve deliverables?",
    icon: User,
    answer: "No. Clients receive a secure, 1-click magic link. They can view the asset, leave timestamped comments, and approve directly from their browser without ever logging in."
  },
  {
    category: "Capacity & Workflows",
    tag: "CAPACITY & WORKLOAD",
    question: "How are team capacity meters and burnout alerts calculated?",
    icon: BarChart2,
    answer: "CREO monitors active projects, assigned revision tickets, and typical turnaround times. If a designer exceeds 85% capacity based on their historical velocity, the system automatically flags them and pauses new assignments."
  },
  {
    category: "Retainer Margins & Billing",
    tag: "RETAINER ECONOMICS",
    question: "How does the real-time contribution margin calculation work?",
    icon: Database,
    answer: "As your team logs hours or completes deliverables, CREO deducts their blended rate from the retainer's value in real-time, giving you an exact profit margin percentage before the month ends."
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const [sampleEmail, setSampleEmail] = useState("");
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

  const handleRequestSample = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (localStorage.getItem('creo_auth') === 'true') {
      navigate("/portal");
    } else {
      const trimmed = sampleEmail.trim();
      const targetUrl = trimmed
        ? `/login?email=${encodeURIComponent(trimmed)}`
        : "/login";
      navigate(targetUrl);
    }
  };

  return (
    <div className="w-full bg-nebula-void text-slate-50 min-h-screen font-sans selection:bg-nebula-glow/30">
      
      {/* 1. Hero Section + Collage */}
      <section className="relative isolate overflow-hidden creo-grain">
        {/* Animated particle wave behind the hero */}
        {showScene && (
        <Suspense fallback={null}>
          <HeroWaveScene className="absolute inset-x-0 bottom-0 h-[70%] -z-10 opacity-80 [mask-image:linear-gradient(to_top,#000_40%,transparent)] animate-page-in" />
        </Suspense>
        )}

        <div className="max-w-[1240px] mx-auto px-6 pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pt-14 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">

            {/* Left Hero Column */}
            <div className="pr-4 lg:pr-12 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                className="text-[11px] tracking-widest uppercase font-bold text-nebula-mist mb-5 flex items-center"
              >
                <span className="relative mr-2 flex size-2">
                  <span className="absolute inset-0 rounded-full bg-nebula-glow animate-ping opacity-50" />
                  <span className="relative size-2 rounded-full bg-nebula-glow" />
                </span>
                A CREATIVE POD FOR D2C BRANDS
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98] sm:leading-[1.0] text-slate-50">
                <SplitText text="Content that" animateOnMount className="block" />
                <SplitText text="ships every week." animateOnMount delay={0.12} className="block" />
                <SplitText
                  text="Proof you can"
                  animateOnMount
                  delay={0.24}
                  className="block italic font-serif font-light pr-2"
                />
                <SplitText text="check." animateOnMount delay={0.36} className="block" wordClassName="text-nebula-periwinkle" />
              </h1>

              <Reveal delay={0.45} blur>
                <p className="text-sm sm:text-base text-nebula-mist leading-relaxed max-w-md mt-6 mb-7">
                  A dedicated lead, editor and designer learn your brand, then deliver reels, carousels and stories to a portal where you approve them in one click.
                </p>
              </Reveal>

              <Reveal delay={0.55}>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Magnetic className="w-full sm:w-auto">
                    <Link
                      to="/signup?intent=sample"
                      className="group relative overflow-hidden bg-nebula-periwinkle text-nebula-void font-bold text-sm px-7 py-3.5 rounded-full hover:bg-white transition-colors w-full sm:w-auto text-center shadow-md inline-flex items-center justify-center gap-2"
                    >
                      Get a free sample batch
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/portal"
                    className="bg-nebula-surface/80 backdrop-blur border border-nebula-steel text-slate-50 text-sm px-7 py-3.5 rounded-full hover:border-nebula-glow/60 hover:bg-nebula-navy transition-colors w-full sm:w-auto text-center"
                  >
                    Explore the portal first
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.65}>
                <div className="text-xs font-semibold text-nebula-mist mt-8 border-t border-nebula-steel pt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span>30 days' notice</span>
                  <span className="w-1 h-1 rounded-full bg-nebula-mist/50"></span>
                  <span>First batch in 7 days</span>
                  <span className="w-1 h-1 rounded-full bg-nebula-mist/50"></span>
                  <span>Late batch? Next cycle credited</span>
                </div>
              </Reveal>
            </div>

            {/* Right 3-Column Asymmetric Media Collage — columns drift at different speeds */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, rotateX: 8 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 1.1, delay: 0.2, ease: EASE_OUT_EXPO }}
              className="grid grid-cols-3 gap-4 lg:h-[600px] [perspective:1200px]"
            >
              <Parallax offset={30} className="flex flex-col gap-4">
                <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Athlete" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[16/11]" alt="Sourdough" src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" />
              </Parallax>

              <Parallax offset={-45} className="flex flex-col gap-4 pt-8">
                <CollageTile aspect="aspect-[16/11]" alt="Interior" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[9/16]" label="Reel · 9:16" alt="Reel" src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80" />
              </Parallax>

              <Parallax offset={55} className="flex flex-col gap-4">
                <CollageTile aspect="aspect-[9/14]" alt="Model" src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" />
                <CollageTile aspect="aspect-[4/5]" label="Carousel" alt="Serum" src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80" />
              </Parallax>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1.5 What we ship — infinite marquee */}
      <section aria-label="What we produce" className="border-y border-nebula-steel bg-nebula-navy/80 py-5">
        <Marquee speed={42}>
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-10 whitespace-nowrap text-sm sm:text-base font-semibold tracking-tight text-nebula-mist">
              {item}
              <span className="size-1.5 rotate-45 bg-nebula-sand/70" />
            </span>
          ))}
        </Marquee>
      </section>


      {/* 3. Horizontal 5-Step Process Rail — the connecting line draws as you scroll */}
      <section className="max-w-[1240px] mx-auto px-6 pt-12 sm:pt-16">
        <div ref={processRef} className="relative py-8 border-b border-nebula-steel/40">
          <div className="absolute left-3.5 right-3.5 top-[3.05rem] hidden md:block h-px bg-nebula-steel" />
          <ScrollDrawLine
            progress={processProgress}
            className="absolute left-3.5 right-3.5 top-[3.05rem] hidden md:block h-px bg-gradient-to-r from-nebula-glow via-nebula-periwinkle to-nebula-sand"
          />
          <Stagger className="relative grid grid-cols-1 md:grid-cols-5 gap-6" gap={0.12}>
            {[
              { step: "01", time: "Day 1: Brand DNA", desc: "Upload your assets, fonts, and guidelines." },
              { step: "02", time: "Days 2-3: Blueprint", desc: "We map out the content pillars and shot lists." },
              { step: "03", time: "Days 4-6: Production", desc: "Our pod designs and edits your deliverables." },
              { step: "04", time: "Day 7: Batch 01", desc: "You receive a secure link to approve or request changes." },
              { step: "05", time: "Weekly: Publish & repeat", desc: "Consistent output that scales with your growth." }
            ].map((item) => (
              <StaggerItem key={item.step} className="flex flex-col group">
                <div className="relative w-7 h-7 rounded-full border border-nebula-steel bg-nebula-void text-nebula-glow flex items-center justify-center text-xs font-bold mb-3 transition-all duration-300 group-hover:border-nebula-glow group-hover:scale-110">
                  {item.step}
                </div>
                <h4 className="text-sm font-bold text-slate-50 mb-1">{item.time}</h4>
                <p className="text-[13px] text-nebula-mist leading-relaxed">{item.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 4. Interactive Approval Portal Layout */}
      <section className="max-w-[1240px] mx-auto px-6 pb-12 sm:pb-16 pt-10">
        <Reveal blur className="relative">
          <div className="absolute -top-4 left-6 bg-nebula-navy border border-nebula-glow/50 text-nebula-glow text-[11px] font-bold px-4 py-1.5 rounded-full z-10 shadow-lg tracking-wider">
            TRY IT — THIS PANEL WORKS
          </div>
          
          <div className="backdrop-blur-md bg-nebula-surface/70 border border-nebula-steel/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-nebula-steel">
              <div className="font-black text-slate-50 text-lg">Batch 04</div>
              <div className="text-xs font-bold text-nebula-mist flex items-center gap-3">
                <span className="hidden sm:block w-24 h-1.5 rounded-full bg-nebula-steel overflow-hidden">
                  <motion.span
                    className="block h-full rounded-full bg-nebula-glow"
                    animate={{ width: `${(approvedCount / 3) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </span>
                <span>
                  <motion.span key={approvedCount} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                    {approvedCount}
                  </motion.span>{" "}
                  of 3 approved &bull; <span className="text-nebula-glow">On track: 2 days early</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  layout
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={`group bg-nebula-navy border rounded-xl overflow-hidden flex flex-col transition-colors duration-300 ${
                    asset.status === "approved"
                      ? "border-nebula-glow/60 shadow-md"
                      : asset.status === "revision"
                        ? "border-nebula-sand/50"
                        : "border-nebula-steel"
                  }`}
                >
                  {/* Thumbnail */}
                  <img 
                    src={idx === 0 ? "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" : idx === 1 ? "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" : "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80"}
                    alt={asset.name}
                    loading="lazy"
                    className="h-44 object-cover w-full transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[11px] font-bold text-nebula-mist uppercase tracking-wider mb-1">
                      {asset.type.replace(' ', ' • ')}
                    </div>
                    <div className="text-sm font-bold text-slate-50 mb-4 flex-1">{asset.name}</div>
                    
                    <div className="flex items-center justify-between mt-auto min-h-[34px]">
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
                        <div className="flex items-center gap-2 w-full">
                          <button 
                            onClick={() => updateStatus(asset.id, "approved")}
                            className="flex-1 bg-nebula-periwinkle text-nebula-void hover:bg-nebula-periwinkle font-semibold transition-all shadow-sm text-xs py-2 rounded-full flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="size-3.5" /> Approve
                          </button>
                          <button 
                            onClick={() => updateStatus(asset.id, "revision")}
                            className="flex-1 bg-transparent border border-nebula-steel hover:bg-[#222F44] text-slate-50 font-bold text-xs py-2 rounded-full transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      )}
                      
                      {asset.status === "approved" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-nebula-glow text-[10px] font-bold">
                            <CheckCircle2 className="size-3.5" /> Approved (queued)
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-nebula-surface border border-nebula-steel hover:bg-[#222F44] text-slate-50 text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors"
                          >
                            Undo
                          </button>
                        </div>
                      )}

                      {asset.status === "revision" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-nebula-sand text-[10px] font-bold">
                            <AlertCircle className="size-3.5" /> Revision requested
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-nebula-surface border border-nebula-steel hover:bg-[#222F44] text-slate-50 text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors"
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
      <section className="bg-nebula-void py-12 sm:py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <Reveal>
              <div className="inline-flex items-center justify-center bg-nebula-surface border border-nebula-steel text-nebula-glow text-[11px] font-bold px-3 py-1 rounded-full mb-4">
                ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
              </div>
            </Reveal>
            <SplitText
              as="h2"
              text="Simple, transparent pricing that scales with your agency."
              accent={["scales", "with", "your", "agency"]}
              className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-4"
            />
            <Reveal delay={0.15}>
              <p className="text-sm sm:text-base text-nebula-mist leading-relaxed">
                No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
              </p>
            </Reveal>
          </div>
          
          <PricingCards />
        </div>
      </section>

      
      {/* 5.5 FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <SplitText
            as="h2"
            text="Common Questions"
            accent={["Questions"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-4"
          />
        </div>
        <Stagger className="space-y-4" gap={0.09}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const Icon = faq.icon;
            return (
              <StaggerItem
                key={idx}
                className={`backdrop-blur-md bg-nebula-surface/70 border ${isOpen ? 'border-nebula-glow shadow-sm' : 'border-nebula-steel/60 hover:border-nebula-steel'} rounded-2xl p-5 sm:p-6 transition-all`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="flex items-center justify-between w-full cursor-pointer text-left"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-4 pr-4">
                    <div className="w-12 h-12 rounded-xl bg-nebula-navy border border-nebula-steel flex items-center justify-center shrink-0 text-nebula-glow">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-slate-50 leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex border border-nebula-steel text-nebula-glow text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {faq.tag}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className={`w-8 h-8 rounded-full border border-nebula-steel flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-nebula-navy text-slate-50' : 'text-nebula-mist hover:bg-nebula-navy'}`}
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
                      <div className="pl-0 sm:pl-16 pt-4">
                        <p className="text-sm text-nebula-mist leading-relaxed">
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
      <section className="relative isolate overflow-hidden bg-nebula-navy py-16 sm:py-24 border-y border-nebula-steel creo-grain">
        <Reveal className="max-w-3xl mx-auto px-6 text-center">
          <SplitText
            as="h2"
            text="Try us before you pay us."
            accent={["pay"]}
            accentClassName="italic font-serif font-light text-nebula-periwinkle"
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-5"
          />
          <p className="text-sm sm:text-base text-nebula-mist leading-relaxed mb-10 max-w-xl mx-auto">
            Drop your Instagram handle and email below. We'll send you a custom sample batch of reels and carousels for your brand, completely free. No credit card required.
          </p>
          
          <form 
            onSubmit={handleRequestSample}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto backdrop-blur-md bg-nebula-surface/30 p-2 rounded-2xl border border-nebula-steel/40"
          >
            <input 
              type="email" 
              value={sampleEmail}
              onChange={(e) => setSampleEmail(e.target.value)}
              placeholder="Enter work email for a sample deliverable..." 
              className="bg-nebula-navy border border-nebula-steel text-slate-50 rounded-xl px-4 py-3 text-sm focus:border-nebula-glow focus:outline-none w-full sm:w-80 transition-colors" 
            />
            <button 
              type="submit"
              className="w-full sm:w-auto bg-nebula-periwinkle text-nebula-void hover:bg-white font-semibold transition-all shadow-sm text-sm px-6 py-3 rounded-xl shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              Request Sample Batch <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="text-xs font-semibold text-nebula-mist mt-6">
            No commitment. 48-hour pilot turnaround for qualified creative agencies.
          </div>
        </Reveal>
      </section>

    </div>
  );
}
