import { CreoInlineLoader } from "../../components/ui/CreoLoader";
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
    "bg-app-accent",
    "bg-app-accent",
    "bg-app-warm",
    "bg-app-warm",
    "bg-app-accent",
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
              ? "bg-app-surface/95 border-rose-800 text-rose-200"
              : "bg-app-surface/95 border-app-line text-app-accent-soft"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertCircle className="size-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="size-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-auto rounded-lg p-1 text-current opacity-70 hover:bg-hi/10 hover:opacity-100" aria-label="Dismiss notification">
            <X className="size-3" />
          </button>
        </div>,
        document.body,
      )}


      {/* ── Team Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <CreoInlineLoader />
        ) : allMembers.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm text-app-mist">Your creative pod hasn't been assembled yet.</p>
            <p className="text-xs text-app-mist mt-1">Team members will appear here once onboarding is complete.</p>
          </div>
        ) : (
          allMembers.map((member, i) => {
            const memberId = member.id || member.user_id || "";
            const initials = member.name.split(" ").filter(w => w.length > 0).map(w => w[0]).join("").toUpperCase().slice(0, 2);
            const roleDesc = getRoleDesc(member.raw_role);

            return (
              <div
                key={memberId || i}
                className="bg-app-surface rounded-2xl p-4 sm:p-5 border border-app-line flex flex-col animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3.5 mb-3">
                  <div className={`w-11 h-11 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-hi text-xs font-bold shrink-0`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-hi truncate">{member.name}</h3>
                    <p className="text-xs text-app-mist">{member.role}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-app-mist leading-relaxed mb-3 flex-1">
                  {roleDesc}
                </p>

                {/* Working hours */}
                <p className="text-xs text-app-mist mb-3">
                  Working hours: <span className="text-app-mist">Mon-Fri, 10am-7pm IST</span>
                </p>

                {/* Message Button - Client only DMs Team Lead or messages Pod Hub */}
                {member.role.toLowerCase().includes("lead") ? (
                  <Link
                    to={`/portal/slack?dm=${encodeURIComponent(member.name)}`}
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-app-accent/40 bg-app-accent/10 text-hi hover:bg-app-accent/20 text-xs sm:text-[13px] font-bold cursor-pointer transition-all duration-200 mt-auto"
                  >
                    <MessageCircle className="w-4 h-4 text-app-accent" strokeWidth={1.8} />
                    Message Team Lead
                  </Link>
                ) : (
                  <Link
                    to="/portal/slack?channel=pod-creative-hub"
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-app-line text-app-mist bg-app-surface/60 text-xs sm:text-[13px] font-medium cursor-pointer transition-all duration-200 hover:border-app-accent hover:text-app-accent-soft hover:bg-app-accent/[0.08] mt-auto"
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
        <div className="lg:col-span-2 bg-gradient-to-br from-app-surface to-app-base rounded-2xl p-4 sm:p-5 border border-app-line flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-app-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-app-accent/10 border border-app-accent/20 text-app-accent text-[11px] font-bold mb-2.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Collaboration Hub
            </div>
            <h3 className="text-lg sm:text-xl font-black text-hi tracking-tight mb-1.5">
              Creo Slack Hub
            </h3>
            <p className="text-xs sm:text-sm text-app-mist max-w-lg leading-relaxed mb-4">
              Connect directly with your dedicated Creative Specialists, Pod Lead, and <strong className="text-hi">Super Admin</strong>. Post sprint requests, share assets, and receive live instant updates.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 pt-3 border-t border-app-line/60">
            <Link
              to="/portal/slack"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-app-accent hover:bg-hi text-app-base shadow-lg shadow-app-accent/20 transition-all cursor-pointer active:scale-95"
            >
              <MessageSquare className="size-4" />
              <span>Open Workspace Hub &rarr;</span>
            </Link>
            <Link
              to="/portal/slack?dm=super-admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-app-surface hover:bg-app-line text-app-accent-soft border border-app-line transition-all cursor-pointer"
            >
              <span>⚡ Direct Line to Super Admin</span>
            </Link>
          </div>
        </div>

        {/* Booking (1 col) */}
        <div className="bg-app-surface rounded-2xl p-4 sm:p-5 border border-app-line flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0">
            <h3 className="text-sm sm:text-base font-bold text-hi mb-0.5">Book a call</h3>
            <p className="text-xs text-app-mist mb-3">15-minute slots with {callAvailability?.lead?.name || podLead?.name || "your pod lead"}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-0 divide-y divide-hi/[0.05] pr-1 scrollbar-thin scrollbar-thumb-app-line">
            {(callAvailability?.bookings || []).map((booking) => (
              <div key={`booked-${booking.id}`} className="flex items-center justify-between gap-3 py-2.5 sm:py-3">
                <span className="text-xs sm:text-sm text-app-accent-soft">{booking.date_label}</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-app-accent/20 px-2.5 py-0.5 text-xs font-medium text-app-accent-soft">
                  <Check className="size-3" /> Booked · {booking.time_label}
                </span>
              </div>
            ))}
            {callAvailability?.slots.map((slot) => {
              const isBooking = bookingSlotId === slot.id;
              return (
                <div key={slot.id} className="flex items-center justify-between py-2.5 sm:py-3">
                  <span className="text-xs sm:text-sm text-app-mist">{slot.date_label}</span>
                  <button 
                    type="button"
                    onClick={() => void handleBookSlot(slot)}
                    disabled={bookingSlotId !== null}
                    className="inline-flex items-center gap-1.5 rounded-md bg-hi/[0.08] px-2.5 py-0.5 text-xs font-medium text-hi transition-colors hover:bg-hi/[0.12] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBooking ? "Booking…" : slot.time_label}
                  </button>
                </div>
              );
            })}
            {isLoadingCallAvailability && <p className="py-3 text-xs sm:text-sm text-app-mist">Loading available call times…</p>}
            {!isLoadingCallAvailability && callAvailabilityError && <p className="py-3 text-xs sm:text-sm text-rose-300">Call times could not load. Refresh to try again.</p>}
            {!isLoadingCallAvailability && !callAvailabilityError && !callAvailability?.slots.length && !callAvailability?.bookings.length && (
              <p className="py-3 text-xs sm:text-sm text-app-mist">There are no available call times right now. Please check again shortly.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
