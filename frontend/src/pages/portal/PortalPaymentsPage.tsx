import { AutoPaySettings } from "../../components/portal/AutoPaySettings";
import { useState } from "react";
import { Link } from "react-router";
import { Download, Loader2, PauseCircle, CheckCircle2, AlertCircle, PhoneCall, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { fetchClientNegotiations } from "../../lib/ops-api";
import type { PlanNegotiationApiItem } from "../../lib/ops-api";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { PausePlanModal } from "../../components/portal/PausePlanModal";
import { ComparePlansModal } from "../../components/portal/ComparePlansModal";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";
import { SplitPaymentCard } from "../../components/portal/SplitPaymentCard";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

import type { InvoiceData } from "../../lib/pdf-invoice";

interface SubscriptionData {
  status: string;
  is_active?: boolean;
  name?: string;
  price_minor?: number;
  current_period_end?: string;
}

interface ClientSubscriptionData {
  subscription?: SubscriptionData | null;
  is_active?: boolean;
  is_paused_next_month?: boolean;
  [key: string]: unknown;
}

export function PortalPaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [downloadingInv, setDownloadingInv] = useState<string | null>(null);
  const [processingAddon, setProcessingAddon] = useState<string | null>(null);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [negotiateModalOpen, setNegotiateModalOpen] = useState(false);
  const [negotiateTopic, setNegotiateTopic] = useState("Custom Pricing / Retainer Discount");
  const [resumingSub, setResumingSub] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [mobileInvoicesOpen, setMobileInvoicesOpen] = useState(false);
  const [mobilePaymentMethodOpen, setMobilePaymentMethodOpen] = useState(false);
  const [mobileNegOpen, setMobileNegOpen] = useState(false);

  const { data: subData, isLoading: isSubLoading } = useQuery<ClientSubscriptionData>({
    queryKey: ["client-subscription", user?.id],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    enabled: !!user?.id,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: clientNegotiations } = useQuery<PlanNegotiationApiItem[]>({
    queryKey: ["client-negotiations", user?.id],
    queryFn: () => fetchClientNegotiations(),
    enabled: !!user?.id,
  });

  const latestNeg = clientNegotiations && clientNegotiations.length > 0 ? clientNegotiations[0] : null;

  const gate = useOnboardingGate();

  if (!gate.isReady || isSubLoading || !subData) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Plan & Billing" className="min-h-[45vh]" />;
  }

  // Only the server's active flag proves the subscription is paid, current, and unexpired.
  const hasActivePlan = Boolean(subData.is_active || subData.subscription?.is_active);
  const planName = hasActivePlan
    ? ((subData as any)?.plan?.display_name || subData?.subscription?.name || "Active Retainer")
    : "No Active Plan";
  const planPrice = hasActivePlan
    ? ((subData?.subscription as any)?.amount 
        ? parseFloat((subData?.subscription as any).amount) 
        : (subData as any)?.plan?.price_minor ? (subData as any).plan.price_minor / 100 : 0)
    : 0;
  const renewalDate = hasActivePlan && subData?.subscription?.current_period_end 
    ? new Date(subData.subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
    : "INACTIVE";

  const isPausedNextMonth = !!(subData as any)?.is_paused_next_month;

  const addons = [
    { id: "extra_reel", name: "Extra reel", desc: "Delivered within this batch", price: 4500 },
    { id: "rush", name: "Rush delivery", desc: "24-hour turnaround on one asset", price: 6000 },
    { id: "revision", name: "Extra revision round", desc: "For one asset", price: 1500 },
    { id: "shoot", name: "Half-day shoot", desc: "Product + process footage in Chennai", price: 18000 },
  ];

  const backendInvoices = (subData as any)?.invoices || [];
  const invoices = backendInvoices
    .filter((inv: any) => {
      const st = String(inv?.status || "").toLowerCase();
      return st !== "incomplete" && st !== "unpaid" && st !== "pending";
    })
    .map((inv: any) => ({
      id: inv.id,
      period: inv.date,
      amount: typeof inv.amount === 'string' ? parseFloat(inv.amount.replace(/[^0-9.]/g, '')) : inv.amount,
      status: inv.status
    }));

  const usage = (subData as any)?.quotas || (subData as any)?.usage || {};
  const usageBars = [
    { label: "Reels", current: usage.reel?.used || 0, max: usage.reel?.quota ?? (subData as any)?.plan?.reel_quota ?? 0, color: "bg-[#7FA0D6]" },
    { label: "Posts", current: (usage.static_post?.used ?? usage.poster?.used) || 0, max: (usage.static_post?.quota ?? usage.poster?.quota) ?? (subData as any)?.plan?.poster_quota ?? 0, color: "bg-[#7FA0D6]" },
    { label: "Stories", current: (usage.story?.used ?? usage.carousel?.used) || 0, max: (usage.story?.quota ?? usage.carousel?.quota) ?? (subData as any)?.plan?.story_quota ?? 0, color: "bg-[#7FA0D6]" }
  ];

  const totalMax = usageBars.reduce((sum, item) => sum + item.max, 0);
  const costPerAsset = totalMax > 0 && planPrice > 0 ? Math.round(planPrice / totalMax) : 0;

  const rzpKey = (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_TO2r0YMjDZSpuC";

  const handleAddon = async (addon: typeof addons[0]) => {
    if (!hasActivePlan) {
      setErrorNotice("An active subscription is required before you can add extras.");
      return;
    }

    setProcessingAddon(addon.id);
    setErrorNotice(null);
    try {
      const orderData = await request<any>("/api/v1/payments/addon-order", {
        method: "POST",
        body: JSON.stringify({ addon_id: addon.id }),
      });
      if (!orderData?.order_id || !orderData?.key_id || !orderData?.amount_minor) {
        throw new Error("Could not prepare add-on checkout. Please try again.");
      }

      await openRazorpayCheckout(
        {
          key: orderData.key_id,
          amount: orderData.amount_minor,
          currency: orderData.currency || "INR",
          name: "Creo Studio",
          description: addon.name,
          order_id: orderData.order_id,
          prefill: { name: user?.full_name || "", email: user?.email || "" },
        },
        async (paymentResponse) => {
          try {
            await request("/api/v1/payments/addon-confirm", {
              method: "POST",
              body: JSON.stringify({
                addon_id: addon.id,
                order_id: paymentResponse.razorpay_order_id || orderData?.order_id,
                payment_id: paymentResponse.razorpay_payment_id || `pay_mock_${Date.now()}`,
                signature: paymentResponse.razorpay_signature,
              }),
            });
          } catch (confirmErr) {
            console.warn("Add-on confirmation notice:", confirmErr);
          }
          await queryClient.invalidateQueries({ queryKey: ["client-subscription", user?.id] });
          await queryClient.refetchQueries({ queryKey: ["client-subscription", user?.id] });
          setActionNotice(`Successfully added ${addon.name} to this cycle!`);
          setTimeout(() => setActionNotice(null), 4000);
        },
        () => {
          setProcessingAddon(null);
        }
      );
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to initiate payment.");
    } finally {
      setProcessingAddon(null);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingInv(id);
    const targetInv = backendInvoices.find((i: any) => i.id === id);
    const invToRender: InvoiceData = {
      id: id,
      date: targetInv?.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      amount: targetInv?.amount ? String(targetInv.amount) : `₹${planPrice.toLocaleString("en-IN")}`,
      status: targetInv?.status || "Paid",
      plan: targetInv?.plan || planName,
      clientName: user?.full_name || undefined,
      clientEmail: user?.email || undefined,
      companyName: user?.company_name || undefined,
    };
    try {
      const { generateInvoicePDF } = await import("../../lib/pdf-invoice");
      generateInvoicePDF(invToRender);
    } catch {
      setErrorNotice("Could not download your invoice. Please try again.");
    } finally {
      setDownloadingInv(null);
    }
  };

  const handleResumePlan = async () => {
    try {
      setResumingSub(true);
      setErrorNotice(null);
      await request("/api/v1/payments/subscription/resume", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["client-subscription", user?.id] });
      await queryClient.refetchQueries({ queryKey: ["client-subscription", user?.id] });
      setActionNotice("Subscription resumed! Your next cycle will renew automatically.");
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resume subscription renewal.";
      setErrorNotice(msg);
      setTimeout(() => setErrorNotice(null), 5000);
    } finally {
      setResumingSub(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 space-y-4">
      {/* Action Toast / Confirmation Notice */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Error Toast / Alert Notice */}
      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{errorNotice}</span>
        </div>
      )}


      {/* Paused for Next Month Notice Banner */}
      {isPausedNextMonth && (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-950/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-200 shadow-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="size-9 rounded-xl bg-amber-900/40 border border-amber-600/50 flex items-center justify-center shrink-0 text-amber-400">
              <PauseCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">
                Subscription renewal scheduled to pause on {renewalDate}
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Your current {planName} deliverables remain 100% active until {renewalDate}. AutoPay renewal charge will not occur next month.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResumePlan}
            disabled={resumingSub}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B111C] text-xs font-bold transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {resumingSub ? "Resuming..." : "Resume Renewal"}
          </button>
        </div>
      )}

      {/* Active Negotiation Status Banner (Slim 1-line expandable on mobile) */}
      {latestNeg && (
        <div
          className={`rounded-xl md:rounded-2xl border p-3 sm:p-5 shadow-sm animate-[fadeIn_0.2s_ease-out] ${
            latestNeg.status === "Accepted"
              ? "border-emerald-500/40 bg-emerald-950/25 text-emerald-200"
              : latestNeg.status === "Counter Offered"
              ? "border-blue-500/40 bg-blue-950/25 text-blue-200"
              : latestNeg.status === "Declined"
              ? "border-rose-500/30 bg-rose-950/20 text-rose-200"
              : "border-[#7FA0D6]/40 bg-[#0B111C] text-[#BCCCE6]"
          }`}
        >
          {/* Header row - clickable on mobile */}
          <div
            onClick={() => setMobileNegOpen((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer md:cursor-default select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="size-8 sm:size-9 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0 text-[#7FA0D6]">
                <PhoneCall className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">Plan Negotiation</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                      latestNeg.status === "Accepted"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : latestNeg.status === "Counter Offered"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        : latestNeg.status === "Declined"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/40"
                    }`}
                  >
                    {latestNeg.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate hidden sm:block">
                  {latestNeg.targetTopic}
                  {latestNeg.proposedOffer ? ` (${latestNeg.proposedOffer})` : ""}
                </p>
              </div>
            </div>
            <span className="text-[#7FA0D6] md:hidden">
              {mobileNegOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
          </div>

          {/* Details - Collapsed by default on mobile, always open on desktop */}
          <div className={`${mobileNegOpen ? "block mt-2.5 pt-2.5 border-t border-white/10" : "hidden md:block md:mt-2"}`}>
            <p className="text-xs sm:text-sm font-bold text-white sm:hidden mb-1">
              {latestNeg.targetTopic}
              {latestNeg.proposedOffer ? ` (${latestNeg.proposedOffer})` : ""}
            </p>
            {latestNeg.status === "Accepted" && (
              <div className="space-y-1">
                <p className="text-xs text-emerald-300 font-bold">
                  Approved Retainer Rate: ₹{(latestNeg.counterPrice || latestNeg.agreedAmount || 0).toLocaleString("en-IN")}/mo
                  {latestNeg.counterNote ? ` • "${latestNeg.counterNote}"` : ""}
                </p>
                {(latestNeg.reelQuota || latestNeg.posterQuota || latestNeg.storyQuota) && (
                  <p className="text-[11px] text-[#BCCCE6] font-semibold">
                    Agreed Deliverables: {latestNeg.reelQuota || 8} Reels • {latestNeg.posterQuota || 12} Posters • {latestNeg.storyQuota || 15} Stories
                  </p>
                )}
              </div>
            )}
            {latestNeg.status === "Counter Offered" && (
              <div className="space-y-1">
                <p className="text-xs text-blue-300 font-bold">
                  Executive Counter-Offer: ₹{(latestNeg.counterPrice || 0).toLocaleString("en-IN")}/mo
                  {latestNeg.counterNote ? ` • "${latestNeg.counterNote}"` : ""}
                </p>
                {(latestNeg.reelQuota || latestNeg.posterQuota || latestNeg.storyQuota) && (
                  <p className="text-[11px] text-[#BCCCE6] font-semibold">
                    Proposed Deliverables: {latestNeg.reelQuota || 8} Reels • {latestNeg.posterQuota || 12} Posters • {latestNeg.storyQuota || 15} Stories
                  </p>
                )}
              </div>
            )}
            {latestNeg.status === "Declined" && latestNeg.declineReason && (
              <p className="text-xs text-rose-300 mt-1">
                Reason: {latestNeg.declineReason}
              </p>
            )}
            {latestNeg.status === "Pending Review" && (
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Our Agency Director will call you at {latestNeg.phoneNumber} ({latestNeg.preferredTime}).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Bento Row: Plan Details & Quotas (Left) + Add-ons (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Top Left: Current Plan & Quotas */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          {!hasActivePlan ? (
            <div className="flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] uppercase font-bold tracking-[0.16em] text-amber-400">
                    Status: Pending Activation
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setCompareModalOpen(true)}
                      className="px-3 py-1 rounded-full border border-[#2A3446] text-xs font-bold text-white hover:bg-[#0B111C] transition-colors cursor-pointer"
                    >
                      Compare plans
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                      Step 3 Pending
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">No Active Retainer</h2>
                <p className="text-xs text-[#97A0B3] mt-1.5 leading-relaxed">
                  You have not completed plan selection or payment yet. Pick a subscription tier to launch your dedicated creative pod.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446] space-y-2 text-xs">
                <p className="text-white font-semibold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#7FA0D6]" />
                  What unlocks with an active retainer:
                </p>
                <ul className="space-y-1.5 text-[#97A0B3] pl-4 list-disc">
                  <li>Dedicated Creative Director, Copywriter & Motion Lead</li>
                  <li>Monthly batches of Reels, Posts, and Story creatives</li>
                  <li>Automated Instagram publishing, scheduling & SLA delivery</li>
                </ul>
              </div>

              <Link
                to="/onboarding?step=3"
                className="w-full py-2.5 px-6 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] font-bold text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-auto"
              >
                <span>Choose Retainer Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] uppercase font-bold tracking-[0.16em] text-[#97A0B3]">
                      CURRENT PLAN
                    </span>
                    <span className="text-xs text-[#7FA0D6] font-semibold">
                      • Renews {renewalDate}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">{planName}</h2>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-2xl sm:text-3xl font-bold text-white">₹{planPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-[#97A0B3] ml-1.5 sm:block sm:ml-0">per month • ₹{costPerAsset.toLocaleString('en-IN')} per asset</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <button 
                      type="button"
                      onClick={() => setCompareModalOpen(true)}
                      className="px-3 py-1.5 rounded-full border border-[#2A3446] text-xs font-bold text-white hover:bg-[#0B111C] hover:border-[#7FA0D6]/40 transition-colors cursor-pointer"
                    >
                      Compare plans
                    </button>
                    {isPausedNextMonth ? (
                      <button
                        type="button"
                        onClick={handleResumePlan}
                        disabled={resumingSub}
                        className="px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {resumingSub ? (
                          <Loader2 className="size-3.5 animate-spin text-amber-400" />
                        ) : (
                          <PauseCircle className="size-3.5 text-amber-400" />
                        )}
                        <span>Resume renewal</span>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setPauseModalOpen(true)}
                        className="px-3 py-1.5 rounded-full border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] hover:border-amber-500/40 transition-colors cursor-pointer"
                      >
                        Pause next month
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Compact 3-Column Quotas Row (< md) */}
              <div className="grid grid-cols-3 gap-2 md:hidden mb-3">
                {usageBars.map(item => {
                  const pct = item.max > 0 ? Math.min(100, Math.round((item.current / item.max) * 100)) : 0;
                  return (
                    <div key={item.label} className="bg-[#0B111C]/60 border border-[#2A3446] rounded-xl p-2 text-center">
                      <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">{item.label}</span>
                      <div className="text-xs font-black text-white my-0.5">{item.current}/{item.max}</div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden my-1">
                        <div className="h-full bg-[#7FA0D6] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-emerald-400 font-semibold">{Math.max(0, item.max - item.current)} left</span>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Progress Bars (md: and up - strictly preserved) */}
              <div className="space-y-3.5 mb-4 hidden md:block">
                {usageBars.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-bold text-white">{item.label}</span>
                      <span className="text-[13px] font-medium text-[#97A0B3]">
                        {item.current} / {item.max}
                        <span className="text-emerald-400 font-semibold ml-1.5">({Math.max(0, item.max - item.current)} remaining)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.current / item.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#97A0B3] font-medium leading-relaxed">
                2 revision rounds per asset • 2 business-day batch SLA • dedicated account director
              </p>
            </>
          )}
        </div>

        {/* Top Right: Add to this cycle */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl md:rounded-2xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2.5 md:mb-3.5">
            <h3 className="text-xs sm:text-sm font-bold text-white">Add to this cycle</h3>
          </div>
          {!hasActivePlan && (
            <p className="text-xs text-[#97A0B3] -mt-1 mb-2.5">
              An active plan is required before you can add extras.
            </p>
          )}

          {/* Mobile 2x2 Compact Grid (< md, zero scroll, 100% visible) */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            {addons.map(addon => (
              <div
                key={addon.id}
                className="p-2.5 rounded-xl bg-[#0B111C]/60 border border-[#2A3446] flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{addon.name}</h4>
                  <span className="text-xs font-black text-[#7FA0D6] mt-0.5 block">₹{addon.price.toLocaleString('en-IN')}</span>
                </div>
                <button 
                  onClick={() => handleAddon(addon)}
                  disabled={!hasActivePlan || !!processingAddon}
                  title={!hasActivePlan ? "An active plan is required to add extras" : undefined}
                  className="mt-2 w-full py-1.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  {processingAddon === addon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Add-on rows (md: and up - strictly preserved) */}
          <div className="hidden md:block divide-y divide-white/[0.05]">
            {addons.map(addon => (
              <div
                key={addon.id}
                className="py-2.5 sm:py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-0.5">{addon.name}</h4>
                  <p className="text-xs text-[#97A0B3]">{addon.desc}</p>
                </div>
                <div className="flex items-center justify-end gap-4 shrink-0">
                  <span className="text-[13px] font-bold text-white">₹{addon.price.toLocaleString('en-IN')}</span>
                  <button 
                    onClick={() => handleAddon(addon)}
                    disabled={!hasActivePlan || !!processingAddon}
                    title={!hasActivePlan ? "An active plan is required to add extras" : undefined}
                    className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs sm:text-[13px] font-bold transition-colors w-18 sm:w-20 flex items-center justify-center disabled:opacity-50 ${
                      !hasActivePlan
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-white disabled:cursor-wait"
                    }`}
                  >
                    {processingAddon === addon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Split Payment & Instalment Plan Card (Renders only if opted into split payments) */}
      <SplitPaymentCard />

      {/* Lower Bento Row: Invoices (Left) + Payment Method (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bottom Left: Invoices */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl md:rounded-2xl p-3.5 sm:p-5">
          <div 
            onClick={() => setMobileInvoicesOpen(prev => !prev)}
            className="flex items-center justify-between cursor-pointer md:cursor-default mb-0 md:mb-3.5 select-none"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white">Invoices ({invoices.length})</h3>
            </div>
            <div className="md:hidden text-[#7FA0D6] p-0.5">
              {mobileInvoicesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </div>
          </div>
          <div className={`${mobileInvoicesOpen ? "block mt-3" : "hidden md:block"} overflow-x-auto scrollbar-hide`}>
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#2A3446]">
                  <th className="text-left text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-2 font-mono">Invoice</th>
                  <th className="text-left text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-2 font-mono">Period</th>
                  <th className="text-left text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-2 font-mono">Amount</th>
                  <th className="text-left text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-2 font-mono">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs md:text-sm text-[#97A0B3]">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 text-xs sm:text-[13px] font-medium text-[#97A0B3] font-mono">{inv.id}</td>
                      <td className="py-2.5 text-xs sm:text-[13px] text-white">{inv.period}</td>
                      <td className="py-2.5 text-xs sm:text-[13px] font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center justify-center px-2 sm:px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#BCCCE6] text-[11px] sm:text-xs font-bold">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {inv.status?.toLowerCase() === "paid" ? (
                          <button 
                            onClick={() => handleDownload(inv.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-[#2A3446] text-[11px] sm:text-xs font-bold text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
                          >
                            {downloadingInv === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Download className="w-3.5 h-3.5" />}
                            GST invoice
                          </button>
                        ) : (
                          <span className="text-[11px] sm:text-xs text-[#97A0B3] italic pr-2">Payment incomplete</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Payment method */}
        <div className="space-y-3 md:space-y-4">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl md:rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between">
            <div 
              onClick={() => setMobilePaymentMethodOpen(prev => !prev)}
              className="flex items-center justify-between cursor-pointer md:cursor-default mb-0 md:mb-3.5 select-none"
            >
              <h3 className="text-xs sm:text-sm font-bold text-white">Payment method</h3>
              <div className="md:hidden text-[#7FA0D6] p-0.5">
                {mobilePaymentMethodOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>
            
            <div className={`${mobilePaymentMethodOpen ? "block mt-3" : "hidden md:block"} space-y-3 sm:space-y-4`}>
              <div className="space-y-2.5 sm:space-y-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] text-[#97A0B3]">Method</span>
                  <span className="text-xs sm:text-[13px] font-bold text-white">{(subData as any)?.autopay?.recurring ? "Razorpay AutoPay" : "No AutoPay mandate"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] text-[#97A0B3]">Next charge</span>
                  <span className="text-xs sm:text-[13px] font-bold text-white">
                    {isPausedNextMonth ? "Renewal paused" : !(subData as any)?.autopay?.enabled ? "No automatic charge confirmed" : hasActivePlan ? `₹${planPrice.toLocaleString('en-IN')} • ${renewalDate}` : "No upcoming charge (Plan inactive)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] text-[#97A0B3]">GSTIN on invoices</span>
                  <span className="text-xs sm:text-[13px] font-bold text-white">Added</span>
                </div>
              </div>
            
              <button 
                onClick={() => {
                  openRazorpayCheckout(
                    {
                      key: rzpKey,
                      amount: 100,
                      currency: "INR",
                      name: "Creo Studio",
                      description: "Update payment method (UPI / Card)",
                      prefill: { name: user?.full_name || "", email: user?.email || "" },
                    },
                    () => {
                      setActionNotice("Payment method updated successfully!");
                      setTimeout(() => setActionNotice(null), 4000);
                    },
                    () => {}
                  );
                }}
                className="w-full py-2 sm:py-2.5 rounded-full border border-[#2A3446] text-xs sm:text-[13px] font-bold text-white hover:bg-[#161F2D] transition-colors mt-auto cursor-pointer"
              >
                Change payment method
              </button>
            </div>
          </div>

          <AutoPaySettings />
        </div>

      </div>

      {/* Modals */}
      <PausePlanModal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-subscription", user?.id] });
          queryClient.refetchQueries({ queryKey: ["client-subscription", user?.id] });
          setActionNotice("Pause request sent. AutoPay stays active until an administrator approves.");
          setTimeout(() => setActionNotice(null), 5000);
        }}
        planName={planName}
        renewalDate={renewalDate}
      />

      <ComparePlansModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        currentPlanName={hasActivePlan ? planName : ""}
        onOpenNegotiation={(topic) => {
          setNegotiateTopic(topic);
          setNegotiateModalOpen(true);
        }}
      />

      <PlanBargainCallModal
        isOpen={negotiateModalOpen}
        onClose={() => setNegotiateModalOpen(false)}
        initialTopic={negotiateTopic}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-negotiations", user?.id] });
          setActionNotice("Plan consultation call request submitted!");
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />
    </div>
  );
}
