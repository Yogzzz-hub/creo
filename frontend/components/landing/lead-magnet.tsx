import { LeadMagnetForm } from "@/components/public/lead-magnet-form";

export function LeadMagnetSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-blue-50/70 to-blue-100/40 border-t border-blue-100/60" id="lead-magnet">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          Download a Free Content Calendar Template
        </h2>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          A ready-to-use social media content calendar built specifically for local businesses. Plan 30 days of posts in under an hour.
        </p>

        <LeadMagnetForm />

        <p className="text-xs text-slate-400 mt-4">
          No spam ever. Unsubscribe with a single click anytime.
        </p>
      </div>
    </section>
  );
}
