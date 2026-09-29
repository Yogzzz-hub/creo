import re

with open("src/pages/public/HomePage.tsx", "r") as f:
    content = f.read()

# 1. Update lucide-react imports
content = content.replace(
    'import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";',
    'import { CheckCircle2, AlertCircle, ArrowRight, Layers, User, BarChart2, Database, Globe, ShieldCheck, ChevronUp, ChevronDown, Zap } from "lucide-react";\nimport { useNavigate } from "react-router";'
)

# 2. Add FAQs data
faqs_data = """
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
  }
];

"""
content = content.replace("export function HomePage() {", faqs_data + "export function HomePage() {\n  const navigate = useNavigate();\n  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);")

# 3. Replace Greens
content = content.replace("bg-[#10B981] hover:bg-[#059669] text-[#050810] font-bold text-xs py-2 rounded-full transition-colors", "bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-xs py-2 rounded-full")
content = content.replace("text-[#10B981]", "text-[#7FA0D6]")
content = content.replace("border-[#10B981]/50 text-[#10B981]", "border-[#7FA0D6]/50 text-[#7FA0D6]")
# 4. Spacing updates - replace py-16 lg:py-24 to py-28 lg:py-36
content = content.replace("py-16 lg:py-24", "py-28 lg:py-36")
content = content.replace("py-20 lg:py-24", "py-28 lg:py-36")

# 5. Glassmorphism cards
content = content.replace('bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 shadow-2xl relative overflow-hidden', 'backdrop-blur-md bg-[#161F2D]/70 border border-[#2A3446]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden')
content = content.replace('bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden shadow-2xl', 'backdrop-blur-md bg-[#161F2D]/70 border border-[#2A3446]/60 rounded-2xl overflow-hidden shadow-2xl')

# 6. Contact button gating
old_form = '''          <form 
            onSubmit={(e) => {
              e.preventDefault();
              alert("Sample batch request submitted!");
            }} 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
          >
            <input 
              type="text" 
              required
              placeholder="Instagram handle (@yourbrand)" 
              className="w-full sm:w-auto flex-1 bg-[#0A0F18] border border-[#2A3446] rounded-xl px-5 py-3.5 text-sm text-[#F8FAFC] placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
            />
            <input 
              type="email" 
              required
              placeholder="Work email (you@brand.com)" 
              className="w-full sm:w-auto flex-1 bg-[#0A0F18] border border-[#2A3446] rounded-xl px-5 py-3.5 text-sm text-[#F8FAFC] placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
            />
            <button 
              type="submit" 
              className="w-full sm:w-auto bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-sm px-6 py-3.5 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2"
            >
              Send me a sample batch <ArrowRight className="size-4" />
            </button>
          </form>'''

new_form = '''          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            <button 
              onClick={(e) => {
                if (localStorage.getItem('creo_auth') !== 'true') {
                  e.preventDefault();
                  alert("Please sign in to message the team.");
                  navigate("/login?redirect=contact");
                } else {
                  alert("Contact Modal Triggered");
                }
              }}
              className="w-full sm:w-auto bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-sm px-8 py-4 rounded-xl shrink-0 flex items-center justify-center gap-2"
            >
              Contact via Mail <ArrowRight className="size-4" />
            </button>
          </div>'''
content = content.replace(old_form, new_form)

# Add FAQ Section before Section 6
faq_section = """
      {/* 5.5 FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-28 lg:py-36">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4">
            Common <span className="text-[#7FA0D6]">Questions</span>
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const Icon = faq.icon;
            return (
              <div 
                key={idx} 
                className={`backdrop-blur-md bg-[#161F2D]/70 border ${isOpen ? 'border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.05)]' : 'border-[#2A3446]/60 hover:border-[#2A3446]'} rounded-2xl p-5 sm:p-6 transition-all`}
              >
                <div 
                  className="flex items-center justify-between w-full cursor-pointer"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
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
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
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
          })}
        </div>
      </section>

"""

content = content.replace("{/* 6. \"Try Us Before You Pay Us\" Lead Capture Section */}", faq_section + "      {/* 6. \"Try Us Before You Pay Us\" Lead Capture Section */}")

# Add glowing subtle svg in Hero
svg_bg = '''          {/* Left Hero Column */}
          <div className="pr-4 lg:pr-12 relative z-10">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#7FA0D6]/5 rounded-full blur-[100px] pointer-events-none"></div>'''
content = content.replace('          {/* Left Hero Column */}\n          <div className="pr-4 lg:pr-12">', svg_bg)

with open("src/pages/public/HomePage.tsx", "w") as f:
    f.write(content)
print("Updated HomePage.tsx")
