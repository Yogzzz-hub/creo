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
    <section className="py-24 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            From signup to your first high-performing content drop in five simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all duration-200 flex flex-col items-center text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">
                  Step {step.number}
                </span>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
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
