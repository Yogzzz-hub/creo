import { useState } from "react";
import { Download, Loader2, PauseCircle, CheckCircle2, AlertCircle, Sparkles, CreditCard, PhoneCall } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { fetchClientNegotiations } from "../../lib/ops-api";
import type { PlanNegotiationApiItem } from "../../lib/ops-api";
import { openRazorpayCheckout, type RazorpayPaymentSuccess } from "../../lib/razorpay";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { ResumeOnboardingBanner } from "../../components/portal/ResumeOnboardingBanner";
import { PausePlanModal } from "../../components/portal/PausePlanModal";
import { ComparePlansModal } from "../../components/portal/ComparePlansModal";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

import { generateInvoicePDF, type InvoiceData } from "../../lib/pdf-invoice";

interface SubscriptionData {
  status: string;
  name?: string;
  price_minor?: number;
  current_period_end?: string;
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

  const { data: subData, isLoading: isSubLoading } = useQuery<{ subscription?: SubscriptionData; is_paused_next_month?: boolean }>({
    queryKey: ["client-subscription", user?.id],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    enabled: !!user?.id,
  });

  const [subscribingCustom, setSubscribingCustom] = useState(false);

  // Fetch client's custom negotiation status
  const { data: negData } = useQuery<{
    has_negotiation: boolean;
    approved: {
      id: string;
      status: string;
      agreed_amount: number;
      order_id: string;
      contact_phone: string;
      proposed_budget: string;
      target_topic: string;
    } | null;
    key_id: string;
  }>({
    queryKey: ["my-negotiation", user?.id],
    queryFn: () => request<any>("/api/negotiations/my"),
    enabled: !!user?.id,
  });

  const { data: clientNegotiations } = useQuery<PlanNegotiationApiItem[]>({
    queryKey: ["client-negotiations", user?.id],
    queryFn: () => fetchClientNegotiations(),
    enabled: !!user?.id,
  });

  const latestNeg = clientNegotiations && clientNegotiations.length > 0 ? clientNegotiations[0] : null;

  const gate = useOnboardingGate();

  const handleSubscribeCustomPlan = async () => {
    if (!negData?.approved) return;
    const approved = negData.approved;
    const amountInr = approved.agreed_amount || 35000;
    const rzpKeyId =
      negData.key_id ||
      (import.meta.env.VITE_RAZORPAY_KEY_ID as string) ||
      "rzp_test_TO2r0YMjDZSpuC";

    try {
      setSubscribingCustom(true);
      setErrorNotice(null);

      await openRazorpayCheckout(
        {
          key: rzpKeyId,
          amount: amountInr * 100,
          currency: "INR",
          name: "Creo Agency",
          description: "Your Custom Negotiated Plan",
          order_id: approved.order_id,
          prefill: {
            name: user?.full_name || "",
            email: user?.email || "",
            contact: approved.contact_phone || "",
          },
          theme: {
            color: "#7FA0D6",
          },
        },
        async (response: RazorpayPaymentSuccess) => {
          try {
            await request("/api/negotiations/confirm-payment", {
              method: "POST",
              body: JSON.stringify({
                negotiation_id: approved.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || approved.order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            await queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
            await queryClient.invalidateQueries({ queryKey: ["my-negotiation"] });
            await queryClient.invalidateQueries({ queryKey: ["client-negotiations"] });
            await queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });

            setActionNotice(
              `🎉 Payment verified! Your custom negotiated retainer at ₹${amountInr.toLocaleString(
                "en-IN"
              )}/mo is now active!`
            );
            setTimeout(() => setActionNotice(null), 6000);
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : "Failed to activate subscription.";
            setErrorNotice(msg);
          } finally {
            setSubscribingCustom(false);
          }
        },
        () => {
          setSubscribingCustom(false);
        }
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to open Razorpay checkout.";
      setErrorNotice(msg);
      setSubscribingCustom(false);
    }
  };

  if (!gate.isReady || isSubLoading || !subData) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Plan & Billing" />;
  }

  const hasActivePlan = Boolean((subData as any)?.is_active || subData?.subscription || (subData as any)?.plan);
  const planName = (subData as any)?.plan?.display_name || subData?.subscription?.name || (hasActivePlan ? "Active Retainer" : "No Active Plan");
  const planPrice = (subData?.subscription as any)?.amount 
    ? parseFloat((subData?.subscription as any).amount) 
    : (subData as any)?.plan?.price_minor ? (subData as any).plan.price_minor / 100 : 0;
  const renewalDate = subData?.subscription?.current_period_end 
    ? new Date(subData.subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
    : (hasActivePlan ? "NEXT BILLING CYCLE" : "INACTIVE");

  const isPausedNextMonth = !!(subData as any)?.is_paused_next_month;

  const addons = [
    { id: "extra_reel", name: "Extra reel", desc: "Delivered within this batch", price: 4500 },
    { id: "rush", name: "Rush delivery", desc: "24-hour turnaround on one asset", price: 6000 },
    { id: "revision", name: "Extra revision round", desc: "For one asset", price: 1500 },
    { id: "shoot", name: "Half-day shoot", desc: "Product + process footage in Chennai", price: 18000 },
  ];

  const backendInvoices = (subData as any)?.invoices || [];
  const invoices = backendInvoices.map((inv: any) => ({
    id: inv.id,
    period: inv.date,
    amount: typeof inv.amount === 'string' ? parseFloat(inv.amount.replace(/[^0-9.]/g, '')) : inv.amount,
    status: inv.status
  }));

  const usage = (subData as any)?.quotas || (subData as any)?.usage || {};
  const usageBars = [
    { label: "Reels", current: usage.reel?.used || 0, max: usage.reel?.quota ?? (subData as any)?.plan?.reel_quota ?? 0, color: "bg-[#7FA0D6]" },
    { label: "Posts", current: (usage.static_post?.used ?? usage.poster?.used) || 0, max: (usage.static_post?.quota ?? usage.poster?.quota) ?? (subData as any)?.plan?.poster_quota ?? 0, color: "bg-[#7FA0D6]" },
    { label: "Stories", current: usage.story?.used || 0, max: usage.story?.quota ?? (subData as any)?.plan?.story_quota ?? 0, color: "bg-[#7FA0D6]" }
  ];

  const totalMax = usageBars.reduce((sum, item) => sum + item.max, 0);
  const costPerAsset = totalMax > 0 && planPrice > 0 ? Math.round(planPrice / totalMax) : 0;

  const rzpKey = (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_TO2r0YMjDZSpuC";

  const handleAddon = (addon: typeof addons[0]) => {
    setProcessingAddon(addon.id);
    setTimeout(() => {
      setProcessingAddon(null);
      openRazorpayCheckout(
        {
          key: rzpKey,
          amount: addon.price * 100,
          currency: "INR",
          name: "Creo Studio",
          description: addon.name,
          order_id: "addon_" + addon.id + "_" + Date.now(),
          prefill: { name: user?.full_name || "", email: user?.email || "" }
        },
        () => {
          setActionNotice(`Successfully added ${addon.name} to this cycle!`);
          setTimeout(() => setActionNotice(null), 4000);
        },
        () => {}
      );
    }, 600);
  };

  const handleDownload = (id: string) => {
    setDownloadingInv(id);
    const targetInv = backendInvoices.find((i: any) => i.id === id);
    const invToRender: InvoiceData = {
      id: id,
      date: targetInv?.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      amount: targetInv?.amount ? String(targetInv.amount) : `₹${planPrice.toLocaleString("en-IN")}`,
      status: targetInv?.status || "Paid",
      plan: planName,
      clientName: user?.full_name || undefined,
      clientEmail: user?.email || undefined,
      companyName: user?.company_name || undefined,
    };
    generateInvoicePDF(invToRender);
    setTimeout(() => setDownloadingInv(null), 500);
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

  const renderCustomPlanCard = () => {
    if (!negData?.approved) return null;
    const approved = negData.approved;

    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161F2D] via-[#161F2D] to-[#1F2C3F] border-2 border-[#7FA0D6]/60 p-6 sm:p-8 shadow-2xl shadow-[#7FA0D6]/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7FA0D6]/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#7FA0D6]">
              <Sparkles className="size-3.5 fill-[#7FA0D6]" />
              Your Custom Negotiated Plan
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Executive Agreement Ready
            </h2>

            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed">
              Our Agency Director has reviewed your consultation call and approved a custom production scope tailored specifically for your brand.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs text-[#F1F5F9] font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> 10 High-Impact Reels / mo
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> 12 Static Posters / mo
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> Dedicated Creative Pod Lead
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 p-5 rounded-2xl bg-[#0B111C] border border-[#2A3446] shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#97A0B3] block">
                Approved Retainer Fee
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  ₹{approved.agreed_amount?.toLocaleString("en-IN") || "35,000"}
                </span>
                <span className="text-xs text-[#97A0B3] font-semibold">/ mo</span>
              </div>
              {approved.order_id && (
                <span className="text-[10px] text-[#7FA0D6] font-mono mt-1 block">
                  Order ID: {approved.order_id}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubscribeCustomPlan}
              disabled={subscribingCustom}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#BCCCE6] text-[#050810] hover:bg-white text-sm font-extrabold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {subscribingCustom ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opening Razorpay...
                </>
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Subscribe via Razorpay
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // No plan yet: show where to resume or custom negotiated plan card if approved.
  if (!gate.isPaid && !subData?.subscription) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-300">
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

        <div>
          <p className="text-xs uppercase font-bold tracking-[0.16em] text-[#97A0B3] mb-2">
            {negData?.approved ? "Custom Retainer Ready" : "No active plan yet"}
          </p>
          <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Plan & billing</h1>
        </div>

        {/* Prominent Custom Plan Card */}
        {renderCustomPlanCard()}

        <ResumeOnboardingBanner variant="hero" title="Activate your plan in a few quick steps" />

        <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 lg:p-8">
          <h3 className="text-base font-semibold text-[#F8FAFC] mb-1.5">Invoices</h3>
          <p className="text-sm text-[#97A0B3] leading-relaxed">
            Receipts and invoices will appear here after your first payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12">
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

      {/* Prominent Custom Plan Card if client has an approved negotiation */}
      {renderCustomPlanCard()}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-[0.16em] text-[#97A0B3] mb-2">
            {planName} PLAN • RENEWS {renewalDate}
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Plan & billing</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="px-5 py-2.5 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
          >
            Compare plans
          </button>
          
          {isPausedNextMonth ? (
            <button
              type="button"
              onClick={handleResumePlan}
              disabled={resumingSub}
              className="px-5 py-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-[13px] font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {resumingSub ? (
                <Loader2 className="size-4 animate-spin text-amber-400" />
              ) : (
                <PauseCircle className="size-4 text-amber-400" />
              )}
              <span>Paused for next cycle • Click to resume</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => setPauseModalOpen(true)}
              className="px-5 py-2.5 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#161F2D] hover:border-amber-500/40 transition-colors cursor-pointer"
            >
              Pause next month
            </button>
          )}
        </div>
      </div>

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

      {/* Paid but onboarding unfinished */}
      <ResumeOnboardingBanner variant="hero" title="Your plan is active — finish setup to start production" />

      {/* Active Negotiation Status Banner */}
      {latestNeg && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-[fadeIn_0.2s_ease-out] ${
            latestNeg.status === "Accepted"
              ? "border-emerald-500/40 bg-emerald-950/25 text-emerald-200"
              : latestNeg.status === "Counter Offered"
              ? "border-blue-500/40 bg-blue-950/25 text-blue-200"
              : latestNeg.status === "Declined"
              ? "border-rose-500/30 bg-rose-950/20 text-rose-200"
              : "border-[#7FA0D6]/40 bg-[#0B111C] text-[#BCCCE6]"
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="size-9 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0 text-[#7FA0D6]">
              <PhoneCall className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">Plan Negotiation</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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
              <p className="text-sm font-bold text-white mt-0.5">
                {latestNeg.targetTopic}
                {latestNeg.proposedOffer ? ` (${latestNeg.proposedOffer})` : ""}
              </p>
              {latestNeg.status === "Counter Offered" && (
                <p className="text-xs text-blue-300 font-semibold mt-1">
                  Executive Counter-Offer: ₹{latestNeg.counterPrice?.toLocaleString("en-IN")}/mo
                  {latestNeg.counterNote ? ` • "${latestNeg.counterNote}"` : ""}
                </p>
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
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Left: Current Plan */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-[24px] p-6 lg:p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-[0.16em] text-[#97A0B3] mb-1">
                CURRENT PLAN
              </p>
              <h2 className="text-3xl font-bold text-white">{planName}</h2>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-white">₹{planPrice.toLocaleString('en-IN')}</h2>
              <p className="text-xs text-[#97A0B3] mt-1">per month • ₹{costPerAsset.toLocaleString('en-IN')} per asset</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {usageBars.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-bold text-white">{item.label}</span>
                  <span className="text-[13px] font-medium text-[#97A0B3]">{item.current} / {item.max}</span>
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
        </div>

        {/* Top Right: Add to this cycle */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-[24px] p-6 lg:p-8">
          <h3 className="text-sm font-bold text-white mb-6">Add to this cycle</h3>
          <div className="divide-y divide-white/[0.05]">
            {addons.map(addon => (
              <div key={addon.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-1">{addon.name}</h4>
                  <p className="text-xs text-[#97A0B3]">{addon.desc}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <span className="text-[13px] font-bold text-white">₹{addon.price.toLocaleString('en-IN')}</span>
                  <button 
                    onClick={() => handleAddon(addon)}
                    disabled={!!processingAddon}
                    className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors w-20 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  >
                    {processingAddon === addon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Left: Invoices */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-[24px] p-6 lg:p-8">
          <h3 className="text-sm font-bold text-white mb-6">Invoices</h3>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#2A3446]">
                  <th className="text-left text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-3 font-mono">Invoice</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-3 font-mono">Period</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-3 font-mono">Amount</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-bold text-[#97A0B3] pb-3 font-mono">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#97A0B3]">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="py-4 text-[13px] font-medium text-[#97A0B3] font-mono">{inv.id}</td>
                      <td className="py-4 text-[13px] text-white">{inv.period}</td>
                      <td className="py-4 text-[13px] font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</td>
                      <td className="py-4">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#7FA0D6]/15 text-[#BCCCE6] text-xs font-bold">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => handleDownload(inv.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
                        >
                          {downloadingInv === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Download className="w-3.5 h-3.5" />}
                          GST invoice
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Payment method */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-[24px] p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-6">Payment method</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#97A0B3]">Method</span>
                <span className="text-[13px] font-bold text-white">UPI AutoPay • Razorpay</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#97A0B3]">Next charge</span>
                <span className="text-[13px] font-bold text-white">₹{planPrice.toLocaleString('en-IN')} • {renewalDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#97A0B3]">GSTIN on invoices</span>
                <span className="text-[13px] font-bold text-white">Added</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              openRazorpayCheckout(
                {
                  key: rzpKey,
                  amount: 0,
                  currency: "INR",
                  name: "Creo Studio",
                  description: "Update payment method",
                  order_id: "auth_" + Date.now(),
                },
                () => {
                  setActionNotice("Payment method updated successfully!");
                  setTimeout(() => setActionNotice(null), 4000);
                },
                () => {}
              );
            }}
            className="w-full py-3 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#161F2D] transition-colors mt-auto cursor-pointer"
          >
            Change payment method
          </button>
        </div>

      </div>

      {/* Modals */}
      <PausePlanModal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-subscription", user?.id] });
          queryClient.refetchQueries({ queryKey: ["client-subscription", user?.id] });
          setActionNotice("Plan scheduled to pause for next month. AutoPay will not charge your account next cycle.");
          setTimeout(() => setActionNotice(null), 5000);
        }}
        planName={planName}
        renewalDate={renewalDate}
      />

      <ComparePlansModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        currentPlanName={planName}
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
