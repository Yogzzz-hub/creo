import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useNearViewport } from "../../lib/useNearViewport";
interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  currency: string;
  reel_quota: number;
  poster_quota: number;
  story_quota: number;
  revision_rounds: number;
  highlights: string[];
  is_recommended: boolean;
}
export function PricingCards({
  className = "",
  onChoose,
}: { className?: string; showBillingToggle?: boolean; defaultCycle?: string; onChoose?: (plan: Plan) => void }) {
  const { ref, isNear } = useNearViewport<HTMLDivElement>();
  const query = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => request<Plan[]>("/api/v1/plans"),
    staleTime: 5 * 60_000,
    enabled: isNear,
  });
  return (
    <div ref={ref} className={className}>
      {query.isPending && (
        <p role="status" className="text-[#97A0B3]">
          Loading plans…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-amber-300">
          Plans could not be loaded.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {query.isSuccess && query.data.length === 0 && (
        <p className="text-[#97A0B3]">No subscription plans available.</p>
      )}
      <section className="grid lg:grid-cols-3 gap-8">
        {query.data?.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-3xl bg-[#121926]/90 border p-8 sm:p-9 space-y-6 flex flex-col text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-[#7FA0D6]/50 ${plan.is_recommended ? "border-[#7FA0D6] shadow-lg shadow-[#7FA0D6]/10 scale-[1.02]" : "border-[#222F44]"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white">{plan.display_name}</h2>
              {plan.is_recommended && (
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#7FA0D6]/20 border border-[#7FA0D6]/50 text-[#7FA0D6]">
                  Recommended
                </span>
              )}
            </div>

            <div>
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: plan.currency,
                  maximumFractionDigits: 0,
                }).format(plan.price_minor / 100)}
                <span className="text-base font-medium text-[#97A0B3]"> / month</span>
              </p>
              <p className="text-xs text-[#97A0B3] mt-1.5 font-medium">Billed monthly &bull; Cancel or pause anytime</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#0B111C]/80 rounded-2xl border border-[#222F44] text-center">
              <div className="p-1">
                <span className="block text-lg font-black text-white">{plan.reel_quota}</span>
                <span className="text-[11px] font-bold text-[#97A0B3] uppercase">Reels</span>
              </div>
              <div className="p-1 border-x border-[#222F44]">
                <span className="block text-lg font-black text-white">{plan.poster_quota}</span>
                <span className="text-[11px] font-bold text-[#97A0B3] uppercase">Posts</span>
              </div>
              <div className="p-1">
                <span className="block text-lg font-black text-white">{plan.story_quota}</span>
                <span className="text-[11px] font-bold text-[#97A0B3] uppercase">Stories</span>
              </div>
            </div>

            <div className="text-sm font-semibold text-[#7FA0D6]">
              ✓ {plan.revision_rounds} included revision rounds
            </div>

            {!!plan.highlights?.length && (
              <ul className="space-y-3 text-sm text-[#97A0B3] pt-2 border-t border-[#222F44]/60">
                {plan.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#7FA0D6] font-bold mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {onChoose ? (
              <button
                type="button"
                className="mt-auto w-full rounded-2xl bg-[#BCCCE6] text-[#050810] hover:bg-white transition-all py-3.5 px-6 text-center text-base font-bold shadow-md cursor-pointer"
                onClick={() => onChoose(plan)}
              >
                Request {plan.display_name}
              </button>
            ) : (
              <Link
                to={`/signup?plan=${encodeURIComponent(plan.name)}`}
                className="mt-auto w-full rounded-2xl bg-[#BCCCE6] text-[#050810] hover:bg-white transition-all py-3.5 px-6 text-center text-base font-bold shadow-md cursor-pointer block"
              >
                Choose {plan.display_name}
              </Link>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
