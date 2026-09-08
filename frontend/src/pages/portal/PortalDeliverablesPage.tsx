import { Link } from "react-router";
import { Zap, ArrowRight, Keyboard, Loader2 } from "lucide-react";
import { ContactSheet } from "../../features/deliverables/ContactSheet";
import { useAuth } from "../../lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

export function PortalDeliverablesPage() {
  const { user } = useAuth();
  const clientId = user?.id || "00000000-0000-0000-0000-000000000001";

  const { data: subData, isLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isSubscribed =
    !isExpired &&
    !!subData?.subscription &&
    (subData?.is_active ?? ["active", "trialing"].includes(subData?.subscription?.status));

  // If user hasn't completed payment in onboarding (stage < 4), lock immediately on frame 0 without waiting
  const isUnpaidOnboarding = (user?.onboarding_stage ?? 1) < 4;

  if (isUnpaidOnboarding) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Creative Deliverables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve content created for your brand. Strict 9:16 mobile reels & static creatives.
          </p>
        </div>
        <SubscriptionLockedState
          title="Deliverables Workspace Locked"
          description="Access to static posters, reels, and approval stages requires an active production retainer. Choose a plan to assign your dedicated creative team."
        />
      </div>
    );
  }

  // While checking subscription status for onboarded users, show clean loading state instead of flashing unlocked UI
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Creative Deliverables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve content created for your brand. Strict 9:16 mobile reels & static creatives.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Creative Deliverables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve content created for your brand. Strict 9:16 mobile reels & static creatives.
          </p>
        </div>
        <SubscriptionLockedState
          title={isExpired ? "Creative Retainer Expired" : "Deliverables Workspace Locked"}
          description={
            isExpired
              ? "Your monthly creative retainer billing cycle has concluded. Deliverables approvals and active reviews are paused until you renew."
              : "Access to static posters, reels, and approval stages requires an active production retainer. Choose a plan to assign your dedicated creative team."
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Creative Deliverables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve content created for your brand. Strict 9:16 mobile reels & static creatives.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
          <Keyboard className="size-3.5 text-[#2B7BC4]" />
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">A</kbd> Approve
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">R</kbd> Revise
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">Esc</kbd> Close
        </div>
      </div>

      {/* Add-on Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100">
              <Zap className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Need more content this month?
              </p>
              <p className="text-xs text-amber-700">
                Purchase extra credits for posters, reels, or story batches anytime.
              </p>
            </div>
          </div>
          <Link
            to="/portal/payments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-4 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all shrink-0 shadow-md shadow-blue-500/20"
          >
            Order Add-on Pack
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <ContactSheet clientId={clientId} />
    </div>
  );
}
