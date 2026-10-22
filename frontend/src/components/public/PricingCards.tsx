import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { request } from "../../lib/http";
import { useNearViewport } from "../../lib/useNearViewport";
import { CreoInlineLoader } from "../ui/CreoLoader";
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
  const reduce = useReducedMotion();
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
        <CreoInlineLoader label="Loading plans" className="min-h-[420px]" />
      )}
      {query.isError && (
        <p role="alert" className="text-center text-site-amber">
          Plans could not be loaded.{" "}
          <button type="button" className="underline underline-offset-4 cursor-pointer hover:text-hi" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {query.isSuccess && query.data.length === 0 && (
        <p className="text-center text-site-mist">No subscription plans available.</p>
      )}
      <section className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {query.data?.map((plan, index) => {
          const featured = plan.is_recommended;
          return (
            <motion.article
              key={plan.id}
              initial={reduce ? false : { opacity: 0, y: 32, clipPath: "inset(12% 0% 0% 0% round 28px)" }}
              // Release the clip afterwards so the card's glow isn't cut off
              whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 28px)", transitionEnd: { clipPath: "none" } }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.9, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              // Stagger the edge light so the cards don't flash in unison
              style={{ "--creo-beam-delay": `-${index * 2.1}s` } as CSSProperties}
              whileHover={reduce ? undefined : { y: -6 }}
              className={`group relative rounded-[28px] p-8 sm:p-9 flex flex-col gap-6 text-hi transition-shadow duration-500 ${
                featured
                  ? "creo-featured-border shadow-[0_30px_80px_-30px_rgba(210,150,90,0.8)] lg:-my-3 lg:py-12"
                  : "creo-glass creo-beam hover:shadow-[0_30px_70px_-30px_rgba(210,150,90,0.45)]"
              }`}
            >
              {featured && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(80%_50%_at_50%_0%,rgba(210,150,90,0.22),transparent)]" />
              )}

              <div className="relative flex items-center justify-between gap-2">
                <h2 className="text-2xl font-black tracking-[-0.02em] text-hi">{plan.display_name}</h2>
                {featured && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] px-3 py-1.5 rounded-full bg-gradient-to-r from-site-blue to-site-blue-deep text-[var(--on-brand)] shadow-[0_6px_20px_-6px_rgba(210,150,90,0.9)]">
                    <Sparkles className="size-3" />
                    Recommended
                  </span>
                )}
              </div>

              <div className="relative">
                <p className="text-4xl sm:text-5xl font-black text-hi tracking-[-0.04em]">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: plan.currency,
                    maximumFractionDigits: 0,
                  }).format(plan.price_minor / 100)}
                  <span className="text-base font-medium tracking-normal text-site-mist"> / month</span>
                </p>
                <p className="text-xs text-site-mist mt-2 font-medium">Billed monthly &bull; Cancel or pause anytime</p>
              </div>

              <div className="relative grid grid-cols-3 rounded-2xl border border-hi/[0.08] bg-site-bg/50 text-center">
                <div className="p-3.5">
                  <span className="block text-xl font-black text-hi">{plan.reel_quota}</span>
                  <span className="text-[10px] font-bold tracking-[0.14em] text-site-mist uppercase">Reels</span>
                </div>
                <div className="p-3.5 border-x border-hi/[0.08]">
                  <span className="block text-xl font-black text-hi">{plan.poster_quota}</span>
                  <span className="text-[10px] font-bold tracking-[0.14em] text-site-mist uppercase">Posts</span>
                </div>
                <div className="p-3.5">
                  <span className="block text-xl font-black text-hi">{plan.story_quota}</span>
                  <span className="text-[10px] font-bold tracking-[0.14em] text-site-mist uppercase">Stories</span>
                </div>
              </div>

              <div className="relative flex items-center gap-2 text-sm font-semibold text-site-peri">
                <Check className="size-4 text-site-blue-light" />
                {plan.revision_rounds} included revision rounds
              </div>

              {!!plan.highlights?.length && (
                <ul className="relative space-y-3 text-sm text-site-mist-2 pt-5 border-t border-hi/[0.08]">
                  {plan.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-site-blue shadow-[0_0_8px_1px_rgba(210,150,90,0.8)]" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              {onChoose ? (
                <button
                  type="button"
                  className={`relative mt-auto w-full rounded-full py-3.5 px-6 text-center text-base font-semibold cursor-pointer inline-flex items-center justify-center gap-2 ${featured ? "creo-btn-primary" : "creo-btn-ghost"}`}
                  onClick={() => onChoose(plan)}
                >
                  Request {plan.display_name}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              ) : (
                <Link
                  to={`/signup?plan=${encodeURIComponent(plan.name)}`}
                  className={`relative mt-auto w-full rounded-full py-3.5 px-6 text-center text-base font-semibold cursor-pointer inline-flex items-center justify-center gap-2 ${featured ? "creo-btn-primary" : "creo-btn-ghost"}`}
                >
                  Choose {plan.display_name}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )}
            </motion.article>
          );
        })}
      </section>
    </div>
  );
}
