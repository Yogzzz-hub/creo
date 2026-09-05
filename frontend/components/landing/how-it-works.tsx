import { FileText, CheckCircle2, CreditCard, Zap, Rocket } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Tell Us About Your Brand",
    description: "Fill out a quick questionnaire so we understand your voice, audience, and goals.",
    icon: FileText,
  },
  {
    number: "02",
    title: "We Build Your Growth Plan",
    description: "Our team crafts a tailored content and marketing strategy based on your brand DNA.",
    icon: CheckCircle2,
  },
  {
    number: "03",
    title: "Choose Your Plan & Pay",
    description: "Pick the plan that fits your budget. Upgrade or downgrade anytime.",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Content Delivered in 7 Days",
    description: "Your first batch of professionally designed content lands in your portal within a week.",
    icon: Zap,
  },
  {
    number: "05",
    title: "Approve, Publish, Grow",
    description: "Review deliverables, approve with one click, and watch your brand grow week after week.",
    icon: Rocket,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 lg:py-32 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 reveal-element">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 font-normal">
            Five simple steps from sign-up to your first content drop.
          </p>
        </div>
        
        {/* 5 Steps Horizontal Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="reveal-element group p-5 rounded-2xl transition-all duration-300 hover:bg-slate-50/90 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 border border-transparent hover:border-blue-100 cursor-pointer flex flex-col items-center text-center"
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <div
                  className={`w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 ${
                    idx % 2 === 0 ? "group-hover:rotate-6" : "group-hover:-rotate-6"
                  }`}
                >
                  <Icon className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 transition-colors group-hover:text-blue-700">
                  Step {step.number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5 group-hover:text-blue-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
