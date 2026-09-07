import { Link } from "react-router";
import { Lock, Zap, CheckCircle2, ArrowRight, ShieldAlert } from "lucide-react";

interface SubscriptionLockedStateProps {
  title?: string;
  description?: string;
}

export function SubscriptionLockedState({
  title = "Production Workspace Locked",
  description = "An active creative retainer is required to access production deliverables and scheduling. Subscribe to a plan to activate your dedicated creative team.",
}: SubscriptionLockedStateProps) {
  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-blue-50/30 p-8 sm:p-12 text-center shadow-sm">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Lock Icon Badge */}
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20">
          <Lock className="size-9" />
          <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-sm">
            <ShieldAlert className="size-4" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 max-w-lg">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0D2137]">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
              <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
              <span>Dedicated Squad</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Experienced art directors, editors, and copywriters assigned to your brand.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
              <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
              <span>Monthly Quotas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Guaranteed cadence of static posters, 9:16 mobile reels, and story sets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
              <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
              <span>Approval Workflow</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Instant sign-offs, fast revision cycles, and auto-publishing schedule.
            </p>
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/portal/payments"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-7 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-[#246bb0] hover:to-[#174e7e] transition-all cursor-pointer"
          >
            <Zap className="size-4" />
            Choose Production Plan
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/portal/support"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Need assistance? Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
