import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
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
}: { className?: string; showBillingToggle?: boolean; defaultCycle?: string }) {
  const query = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
    staleTime: 60_000,
  });
  return (
    <div className={className}>
      {query.isPending && (
        <p role="status" className="text-[#97A0B3]">
          Loading plans?
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
      <section className="grid lg:grid-cols-3 gap-6">
        {query.data?.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-2xl bg-[#121926] border p-6 space-y-5 flex flex-col text-white ${plan.is_recommended ? "border-[#7FA0D6]" : "border-[#222F44]"}`}
          >
            <h2 className="text-xl font-bold">{plan.display_name}</h2>
            {plan.is_recommended && <p className="text-[#7FA0D6]">Recommended</p>}
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: plan.currency,
                maximumFractionDigits: 0,
              }).format(plan.price_minor / 100)}
              <span className="text-sm text-[#97A0B3]"> / month</span>
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <p>{plan.reel_quota} Reels</p>
              <p>{plan.poster_quota} Posters</p>
              <p>{plan.story_quota} Stories</p>
            </div>
            <p>{plan.revision_rounds} revision rounds</p>
            {!!plan.highlights?.length && (
              <ul className="space-y-2 text-[#97A0B3]">
                {plan.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
            <Link
              to={`/signup?plan=${encodeURIComponent(plan.name)}`}
              className="mt-auto rounded-xl bg-[#BCCCE6] text-[#050810] p-3 text-center font-bold"
            >
              Choose {plan.display_name}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
