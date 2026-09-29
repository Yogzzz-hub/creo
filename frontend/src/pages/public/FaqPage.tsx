import { useState } from "react";
import { 
  Search, Layers, User, BarChart2, Database, 
  Globe, ShieldCheck, ChevronDown, 
  Headset, ArrowRight, Zap 
} from "lucide-react";

const faqs = [
  {
    category: "Migration & Tools",
    tag: "MIGRATION & WORKFLOW",
    question: "How does CREO replace our existing stack of WhatsApp, Drive, and spreadsheets?",
    icon: Layers,
    answer: "CREO doesn't just store files; it connects them directly to team capacity and client sign-offs. Your briefs connect to Figma/Adobe, client feedback triggers automated SLA revision tickets to motion leads, and retainer hours calculate contribution margins automatically—eliminating the 7 fragmented silos.",
    extra: (
      <div className="text-[#7FA0D6] bg-[#0A0F18] border border-[#2A3446] rounded-md px-3 py-1 text-xs inline-flex items-center gap-1.5 mt-3">
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
  },
  {
    category: "Client Portals & Approvals",
    tag: "WHITE-LABELING",
    question: "Can we white-label the entire client experience with our own branding and custom CNAME?",
    icon: Globe,
    answer: "Yes. On the Growth and Network tiers, you can deploy CREO on your own domain (e.g., portal.youragency.com) with custom colors, logos, and email templates."
  },
  {
    category: "Security & Compliance",
    tag: "SECURITY & COMPLIANCE",
    question: "How does CREO handle enterprise data security and client media privacy?",
    icon: ShieldCheck,
    answer: "We are SOC-2 Type II certified. All media is encrypted at rest and in transit. You have granular control over who can download source files versus who can only view them."
  }
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Architecture');

  const filteredFaqs = faqs.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Architecture' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#050810] pt-24 pb-20">
      
      {/* Hero Header & Search */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-12">
        <div className="inline-flex items-center justify-center bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-6 gap-2">
          <div className="relative size-2 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-30"></span>
            <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
          </div>
          AGENCY OS KNOWLEDGE BASE
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-[#F8FAFC] tracking-tight max-w-2xl mx-auto mb-4">
          Frequently Asked <br />
          <span className="text-[#7FA0D6]">Questions</span>
        </h1>
        <p className="text-sm text-[#97A0B3] max-w-lg mx-auto text-center mt-4 mb-8 leading-relaxed">
          Everything you need to know about deploying CREO across your creative teams, client pods, and unit economics.
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto bg-[#0A0F18] border border-[#2A3446] rounded-full py-3.5 px-5 flex items-center gap-3 text-xs text-[#F8FAFC] focus-within:border-[#7FA0D6] transition-colors mb-8">
          <Search className="size-4 text-[#97A0B3]" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions on migration, client portals, capacity, or billing..." 
            className="bg-transparent border-none outline-none flex-1 text-[#F8FAFC] placeholder:text-[#97A0B3]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
          {["All Architecture", "Migration & Tools", "Client Portals & Approvals", "Capacity & Workflows", "Retainer Margins & Billing", "Security & Compliance"].map((tab) => (
            <button 
              key={tab}
              onClick={() => setSelectedCategory(tab)}
              className={
                selectedCategory === tab
                  ? "bg-[#BCCCE6] text-[#050810] font-bold text-xs px-4 py-1.5 rounded-full transition"
                  : "text-[#97A0B3] hover:text-[#F8FAFC] text-xs px-3 py-1.5 rounded-full bg-[#161F2D] border border-[#2A3446] transition-colors"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Bento Accordion Rows */}
      <div className="max-w-3xl mx-auto px-6 space-y-4 mt-10">
        
        {filteredFaqs.length === 0 ? (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-8 text-center text-[#97A0B3] text-sm font-medium">
            No questions matching your search.
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const Icon = faq.icon;
            return (
              <div 
                key={idx} 
                className={`bg-[#161F2D] border ${isOpen ? 'border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.05)] border-l-2 border-l-[#7FA0D6]' : 'border-[#2A3446] hover:border-[#2A3446]/80 border-l-2 border-l-transparent'} rounded-2xl p-5 sm:p-6 transition-all`}
              >
                <div 
                  className="flex items-center justify-between w-full cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-4 pr-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center shrink-0 text-[#7FA0D6]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex border border-[#2A3446] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {faq.tag}
                    </span>
                    <div className={`w-8 h-8 rounded-full border border-[#2A3446] flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0A0F18] text-[#F8FAFC]' : 'text-[#97A0B3] hover:bg-[#0A0F18]'}`}>
                      <ChevronDown className={`size-4 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
                
                {isOpen && (
                  <div className="pl-0 sm:pl-16 mt-4 animate-fade-in">
                    <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.extra && faq.extra}
                  </div>
                )}
              </div>
            );
          })
        )}

      </div>

      {/* Operational Support Card (Bottom Bento) */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 mt-12 shadow-sm">
          <div className="flex items-center gap-6 text-center sm:text-left w-full">
            <div className="px-4 h-14 rounded-2xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center gap-3 text-[#7FA0D6] shrink-0 mx-auto sm:mx-0 relative">
              <Headset className="size-6" />
              <svg className="w-5 h-5 opacity-60 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                Have specific operational questions about your agency setup?
              </h3>
              <p className="text-xs text-[#97A0B3] mt-1.5">
                Speak directly with an Agency Solutions Architect. Average response under 15 minutes.
              </p>
            </div>
          </div>
          <button className="bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-xs sm:text-sm px-6 py-3.5 rounded-full shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto">
            Speak with an OS Specialist <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
