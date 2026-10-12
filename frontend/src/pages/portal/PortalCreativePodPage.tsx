import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import { MessageCircle, MessageSquare, Check, AlertCircle, X } from "lucide-react";

interface TeamMember {
  id?: string;
  user_id?: string;
  name: string;
  email: string;
  raw_role: string;
  role: string;
  is_primary?: boolean;
}

interface PodData {
  assigned_team?: TeamMember[];
}

interface PodCallSlot {
  id: string;
  starts_at: string;
  date_label: string;
  time_label: string;
}

interface PodCallAvailability {
  lead: { id: string; name: string };
  slots: PodCallSlot[];
  bookings: PodCallSlot[];
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  team_lead: "Strategy, briefs, and client communication. Mon-Fri, 10am-7pm IST.",
  creative_lead: "Art direction, quality control, and brand consistency.",
  editor: "Reels, motion graphics, and video editing. Mon-Fri, 10am-7pm IST.",
  designer: "Static posts, carousels, and brand design. Mon-Fri, 10am-7pm IST.",
  copywriter: "Captions, hooks, and messaging. Mon-Fri, 10am-7pm IST.",
  strategist: "Content planning and research. Mon-Fri, 10am-7pm IST.",
};

function getRoleDesc(role: string): string {
  const key = role.toLowerCase().replace(/\s+/g, "_");
  return ROLE_DESCRIPTIONS[key] || "Creative execution and support. Mon-Fri, 10am-7pm IST.";
}

export function PortalCreativePodPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const gate = useOnboardingGate();

  const { data: podData, isLoading } = useQuery<PodData>({
    queryKey: ["portal-pod", user?.id],
    queryFn: () => request<PodData>("/api/v1/portal/pod"),
    enabled: !!user?.id && gate.isComplete,
    staleTime: 5 * 60_000,
  });

  const assignedTeam = podData?.assigned_team || [];
  const podLead = assignedTeam.find((m) => m.is_primary || m.raw_role === "team_lead" || m.raw_role === "creative_lead");
  const allMembers = podLead ? [podLead, ...assignedTeam.filter((m) => m.id !== podLead.id)] : assignedTeam;

  const { data: callAvailability, isLoading: isLoadingCallAvailability, isError: callAvailabilityError } = useQuery<PodCallAvailability>({
    queryKey: ["portal-pod-call-availability", user?.id],
    queryFn: () => request<PodCallAvailability>("/api/v1/portal/pod-calls/availability"),
    enabled: !!user?.id && gate.isComplete,
    staleTime: 30_000,
  });

  const handleBookSlot = async (slot: PodCallSlot) => {
    const leadName = callAvailability?.lead?.name || podLead?.name || "your pod lead";
    const shouldBook = await confirm({
      title: "Confirm your pod call",
      description: `Book this 15-minute call with ${leadName}?`,
      details: [`${slot.date_label} at ${slot.time_label}`, `${leadName} will receive a booking notification.`],
      confirmText: "Book this call",
      cancelText: "Choose another time",
      tone: "info",
      icon: "info",
    });
    if (!shouldBook) return;

    setBookingSlotId(slot.id);
    try {
      const result = await request<{ message: string; lead_name: string }>("/api/v1/portal/pod-calls", {
        method: "POST",
        body: JSON.stringify({ starts_at: slot.starts_at }),
      });
      await queryClient.invalidateQueries({ queryKey: ["portal-pod-call-availability", user?.id] });
      showToast(`Booked with ${result.lead_name}. Your pod lead has been notified.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "We couldn't book that call. Please choose another slot.", "error");
      await queryClient.invalidateQueries({ queryKey: ["portal-pod-call-availability", user?.id] });
    } finally {
      setBookingSlotId(null);
    }
  };

  // Avatar color palette
  const AVATAR_COLORS = [
    "bg-gradient-to-br from-pink-500 to-orange-400",
    "bg-[#7FA0D6]",
    "bg-[#7FA0D6]",
    "bg-[#D8BF9B]",
    "bg-[#D8BF9B]",
    "bg-[#7FA0D6]",
  ];

  if (!gate.isReady || (gate.isComplete && isLoading)) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Creative Pod" className="min-h-[45vh]" />;
  }

  if (!gate.isComplete) {
    return (
      <div className="w-full">
        <SubscriptionLockedState
          title="Creative Pod Access Locked"
          description="Complete setup to meet your dedicated creative team."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Toast Alert */}
      {toastMessage && typeof document !== "undefined" && createPortal(
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[100000] flex w-[min(420px,calc(100vw-2rem))] items-center gap-3 rounded-2xl border p-4 text-xs font-bold shadow-2xl backdrop-blur-xl animate-fade-in ${
            toastMessage.type === "error"
              ? "bg-[#161F2D]/95 border-rose-800 text-rose-200"
              : "bg-[#161F2D]/95 border-[#2A3446] text-[#BCCCE6]"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertCircle className="size-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="size-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-auto rounded-lg p-1 text-current opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Dismiss notification">
            <X className="size-3" />
          </button>
        </div>,
        document.body,
      )}

      {/* Page Header */}
      <h1 className="text-2xl font-semibold text-white">Your pod</h1>

      {/* ── Team Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#7FA0D6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allMembers.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-[#97A0B3]">Your creative pod hasn't been assembled yet.</p>
            <p className="text-xs text-[#97A0B3] mt-1">Team members will appear here once onboarding is complete.</p>
          </div>
        ) : (
          allMembers.map((member, i) => {
            const memberId = member.id || member.user_id || "";
            const initials = member.name.split(" ").filter(w => w.length > 0).map(w => w[0]).join("").toUpperCase().slice(0, 2);
            const roleDesc = getRoleDesc(member.raw_role);

            return (
              <div
                key={memberId || i}
                className="bg-[#161F2D] rounded-2xl p-5 sm:p-6 border border-[#2A3446] flex flex-col animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{member.name}</h3>
                    <p className="text-[13px] text-[#97A0B3]">{member.role}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[#97A0B3] leading-relaxed mb-4 flex-1">
                  {roleDesc}
                </p>

                {/* Working hours */}
                <p className="text-xs text-[#97A0B3] mb-4">
                  Working hours: <span className="text-[#97A0B3]">Mon-Fri, 10am-7pm IST</span>
                </p>

                {/* Message Button - Client only DMs Team Lead or messages Pod Hub */}
                {member.role.toLowerCase().includes("lead") ? (
                  <Link
                    to={`/portal/slack?dm=${encodeURIComponent(member.name)}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#7FA0D6]/40 bg-[#7FA0D6]/10 text-white hover:bg-[#7FA0D6]/20 text-[13px] font-bold cursor-pointer transition-all duration-200 mt-auto"
                  >
                    <MessageCircle className="w-4 h-4 text-[#7FA0D6]" strokeWidth={1.8} />
                    Message Team Lead
                  </Link>
                ) : (
                  <Link
                    to="/portal/slack?channel=pod-creative-hub"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#2A3446] text-[#97A0B3] bg-[#161F2D]/60 text-[13px] font-medium cursor-pointer transition-all duration-200 hover:border-[#7FA0D6] hover:text-[#BCCCE6] hover:bg-[#7FA0D6]/[0.08] mt-auto"
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                    Chat in Pod Hub
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Section: Slack Hub Access + Booking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Slack Hub Banner (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#161F2D] to-[#0D1522] rounded-2xl p-5 sm:p-6 border border-[#2A3446] flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7FA0D6]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7FA0D6]/10 border border-[#7FA0D6]/20 text-[#7FA0D6] text-xs font-bold mb-4">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Collaboration Hub
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
              Creo Slack Hub
            </h3>
            <p className="text-sm text-[#97A0B3] max-w-lg leading-relaxed mb-6">
              Connect directly with your dedicated Creative Specialists, Pod Lead, and <strong className="text-white">Super Admin</strong>. Post sprint requests, share assets, and receive live instant updates.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 pt-4 border-t border-[#2A3446]/60">
            <Link
              to="/portal/slack"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-[#7FA0D6] hover:bg-white text-[#0B111C] shadow-lg shadow-[#7FA0D6]/20 transition-all cursor-pointer active:scale-95"
            >
              <MessageSquare className="size-4" />
              <span>Open Slack Workspace Hub &rarr;</span>
            </Link>
            <Link
              to="/portal/slack?dm=super-admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#161F2D] hover:bg-[#2A3446] text-[#BCCCE6] border border-[#2A3446] transition-all cursor-pointer"
            >
              <span>⚡ Direct Line to Super Admin</span>
            </Link>
          </div>
        </div>

        {/* Booking (1 col) */}
        <div className="bg-[#161F2D] rounded-2xl p-5 sm:p-6 border border-[#2A3446] flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-white mb-1">Book a call</h3>
            <p className="text-[13px] text-[#97A0B3] mb-5">15-minute slots with {callAvailability?.lead?.name || podLead?.name || "your pod lead"}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-0 divide-y divide-white/[0.05] pr-1 scrollbar-thin scrollbar-thumb-[#2A3446]">
            {(callAvailability?.bookings || []).map((booking) => (
              <div key={`booked-${booking.id}`} className="flex items-center justify-between gap-3 py-4">
                <span className="text-sm text-[#BCCCE6]">{booking.date_label}</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#7FA0D6]/20 px-3 py-1 text-[13px] font-medium text-[#BCCCE6]">
                  <Check className="size-3.5" /> Booked · {booking.time_label}
                </span>
              </div>
            ))}
            {callAvailability?.slots.map((slot) => {
              const isBooking = bookingSlotId === slot.id;
              return (
                <div key={slot.id} className="flex items-center justify-between py-4">
                  <span className="text-sm text-[#97A0B3]">{slot.date_label}</span>
                  <button 
                    type="button"
                    onClick={() => void handleBookSlot(slot)}
                    disabled={bookingSlotId !== null}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.08] px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBooking ? "Booking…" : slot.time_label}
                  </button>
                </div>
              );
            })}
            {isLoadingCallAvailability && <p className="py-4 text-sm text-[#97A0B3]">Loading available call times…</p>}
            {!isLoadingCallAvailability && callAvailabilityError && <p className="py-4 text-sm text-rose-300">Call times could not load. Refresh to try again.</p>}
            {!isLoadingCallAvailability && !callAvailabilityError && !callAvailability?.slots.length && !callAvailability?.bookings.length && (
              <p className="py-4 text-sm text-[#97A0B3]">There are no available call times right now. Please check again shortly.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
