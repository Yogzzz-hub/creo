import { useState } from "react";
import { Link } from "react-router";
import { ScrollReveal } from "../../components/ui/ScrollReveal";
import {
  ChevronDown,
  Search,
  ArrowRight,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Clock,
  CreditCard,
  Palette,
  Settings,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: "Getting Started",
    question: "How quickly will I see results?",
    answer:
      "Most clients receive their first content within 7 days of joining. You'll see initial engagement improvements within the first 2–3 weeks as we ramp up your content cadence and optimize based on early performance data.",
  },
  {
    category: "Getting Started",
    question: "How does the onboarding process work?",
    answer:
      "After signing up, you'll fill out a short brand questionnaire. Our team builds your growth plan within 7 days, and your first batch of content is delivered right after. You'll have access to your client portal throughout the process.",
  },
  {
    category: "Content & Revisions",
    question: "What if I don't like the content?",
    answer:
      "Every plan includes 2 revision rounds so you can request changes before anything goes live. Our goal is to get it right — and with a 98% approval rate across our client base, we're confident you'll love what we create.",
  },
  {
    category: "Content & Revisions",
    question: "Who creates my content?",
    answer:
      "A dedicated team of designers, copywriters, and strategists works on your account. You'll have a consistent team that learns your brand voice over time — not a rotating pool of freelancers.",
  },
  {
    category: "Content & Revisions",
    question: "How do I review and approve content?",
    answer:
      "Everything goes through your client portal. You'll get a notification when new content is ready, can preview it, leave comments, approve, or request revisions — all in one place.",
  },
  {
    category: "Billing & Plans",
    question: "Is there a contract or lock-in?",
    answer:
      "No lock-in. Monthly subscription — cancel anytime. We earn your business every month through results, not contracts.",
  },
  {
    category: "Billing & Plans",
    question: "Can I get more content than my plan includes?",
    answer:
      "Yes — purchase extra posters, reels, or stories at any time through our add-on system directly from your client portal. No plan upgrade needed.",
  },
  {
    category: "Platforms & Integration",
    question: "What platforms do you create content for?",
    answer:
      "We create content optimized for Instagram, Facebook, LinkedIn, and Google Business Profile. All content is designed to perform across platforms, and we can tailor formats for specific channels as needed.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Questions", icon: HelpCircle },
  { id: "Getting Started", label: "Getting Started", icon: Sparkles },
  { id: "Content & Revisions", label: "Content & Revisions", icon: Palette },
  { id: "Billing & Plans", label: "Billing & Plans", icon: CreditCard },
  { id: "Platforms & Integration", label: "Platforms", icon: Settings },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full">
      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F0F7FD] to-white pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2B7BC4]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#2B7BC4] shadow-sm border border-[#C9DFF0] mb-4">
              <MessageSquare className="size-3.5" />
              Quick Answers to Common Questions
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0D2137] sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600">
              Everything you need to know about working with Creo.
            </p>

              {/* Search Bar */}
              <div className="mt-6 max-w-md mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOpenIndex(null);
                  }}
                  placeholder="Search questions..."
                  className="w-full rounded-2xl border border-[#C9DFF0] bg-white pl-11 pr-10 py-2.5 text-sm text-[#0D2137] shadow-sm focus:ring-2 focus:ring-[#2B7BC4]/30 focus:border-[#2B7BC4] outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setOpenIndex(null);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Category Filters + Accordion ────────────────────────────────── */}
        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Category Pills */}
            <ScrollReveal variant="up" className="flex flex-wrap justify-center gap-2 mb-8">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOpenIndex(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-[#E8F4FD] hover:text-[#2B7BC4]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </ScrollReveal>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="size-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">
                  No matching questions found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a different search term or category
                </p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <ScrollReveal
                    key={item.question}
                    variant="up"
                    delay={Math.min(index * 35, 200)}
                    className={`rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? "border-[#2B7BC4]/30 bg-[#E8F4FD]/20 shadow-md shadow-[#2B7BC4]/5"
                        : "border-[#C9DFF0] bg-white hover:border-[#2B7BC4]/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(index)}
                      className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3 flex-1 pr-4">
                        <div
                          className={`size-8 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                            isOpen
                              ? "bg-[#2B7BC4] text-white"
                              : "bg-[#E8F4FD] text-[#2B7BC4]"
                          }`}
                        >
                          <HelpCircle className="size-4" />
                        </div>
                        <div>
                          <span
                            className={`text-sm sm:text-base font-bold transition-colors ${
                              isOpen ? "text-[#2B7BC4]" : "text-[#0D2137]"
                            }`}
                          >
                            {item.question}
                          </span>
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className={`size-5 text-[#2B7BC4] transition-transform duration-300 shrink-0 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pl-16 sm:pl-[4.5rem]">
                        <p className="text-sm leading-relaxed text-slate-600">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })
            )}
          </div>

          {/* Still Have Questions Banner */}
          <ScrollReveal variant="scale" delay={100} className="mt-12 rounded-2xl border border-[#C9DFF0] bg-gradient-to-r from-[#E8F4FD] to-sky-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-10 rounded-xl bg-[#2B7BC4] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0D2137]">
                  Still have questions?
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Our team responds within 4 business hours during working days
                  (10:00 AM – 7:00 PM IST).
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/919941999415?text=Hi%2C%20I%20have%20a%20question%20about%20Creo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-95 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              Chat with Us
            </a>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#07192F] via-[#0B2545] to-[#123966] py-14 sm:py-18 text-white relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <ScrollReveal variant="scale" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Ready to start?
          </h2>
          <p className="mt-3 text-xs sm:text-base text-blue-100/80 max-w-xl mx-auto">
            Join 50+ brands growing with Creo every week.
          </p>
          <div className="mt-7">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-95 text-white rounded-xl h-12 px-8 text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              Explore Retainer Plans
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
