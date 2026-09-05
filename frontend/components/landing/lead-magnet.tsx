import { LeadMagnetForm } from "@/components/public/lead-magnet-form";

export function LeadMagnetSection() {
  return (
    <section className="bg-gradient-to-b from-[#eaf4fe] to-[#d8ecfc] py-24 sm:py-28 relative overflow-hidden" id="lead-magnet">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10 reveal-element">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Download a Free Content Calendar Template
        </h2>
        <p className="text-base sm:text-lg text-slate-600 font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
          A ready-to-use social media content calendar designed for local businesses. Plan 30 days of posts in under an hour.
        </p>
        
        <LeadMagnetForm />
        
        <p className="text-xs text-slate-500 mt-4 tracking-wide">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
