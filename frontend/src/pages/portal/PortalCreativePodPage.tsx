import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
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
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const upcomingSlots = (() => {
    const slots = [];
    const times = ["10:30 AM", "2:00 PM", "11:00 AM", "3:30 PM", "10:00 AM"];
    let d = new Date();
    while (slots.length < 5) {
      d = new Date(d.getTime() + 86400000);
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        const dateStr = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
        slots.push({
          id: `slot-${d.toISOString().slice(0, 10)}`,
          date: dateStr,
          time: times[slots.length % times.length],
        });
      }
    }
    return slots;
  })();

  const gate = useOnboardingGate();

  const handleBookSlot = (slotId: string) => {
    if (!bookedSlots.includes(slotId)) {
      setBookedSlots(prev => [...prev, slotId]);
      showToast("Call scheduled with your pod lead! Calendar invite sent.", "success");
    }
  };

  const { data: podData, isLoading } = useQuery<PodData>({
    queryKey: ["portal-pod", user?.id],
    queryFn: () => request<PodData>("/api/v1/portal/pod"),
    enabled: !!user?.id && gate.isComplete,
    staleTime: 5 * 60_000,
  });

  const assignedTeam = podData?.assigned_team || [];
  const podLead = assignedTeam.find((m) => m.is_primary || m.raw_role === "team_lead" || m.raw_role === "creative_lead");
  const allMembers = podLead ? [podLead, ...assignedTeam.filter((m) => m.id !== podLead.id)] : assignedTeam;

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
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Creative Pod Access Locked"
          description="Your dedicated creative specialists and lead producer will be provisioned once your account setup is completed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-4 sm:right-8 z-[9999] p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xl animate-fade-in ${
            toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-300"
              : "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertCircle className="size-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="size-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-current opacity-70 hover:opacity-100">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <h1 className="text-2xl font-semibold text-white">Your pod</h1>

      {/* ── Team Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] flex flex-col animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
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

                {/* Message Button */}
                <Link
                  to={`/portal/slack?dm=${encodeURIComponent(member.name)}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#2A3446] text-[#97A0B3] bg-[#161F2D]/60 text-[13px] font-medium cursor-pointer transition-all duration-200 hover:border-[#7FA0D6] hover:text-[#BCCCE6] hover:bg-[#7FA0D6]/[0.08] mt-auto"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                  Message {member.name.split(" ")[0]}
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Section: Slack Hub Access + Booking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slack Hub Banner (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#161F2D] to-[#0D1522] rounded-2xl p-6 sm:p-8 border border-[#2A3446] flex flex-col justify-between shadow-sm relative overflow-hidden">
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
        <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-white mb-1">Book a call</h3>
            <p className="text-[13px] text-[#97A0B3] mb-5">15-minute slots with your pod lead</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-0 divide-y divide-white/[0.05] pr-1 scrollbar-thin scrollbar-thumb-[#2A3446]">
            {upcomingSlots.map((slot) => {
              const isBooked = bookedSlots.includes(slot.id);
              return (
                <div key={slot.id} className="flex items-center justify-between py-4">
                  <span className="text-sm text-[#97A0B3]">{slot.date}</span>
                  <button 
                    onClick={() => handleBookSlot(slot.id)}
                    disabled={isBooked}
                    className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
                      isBooked 
                        ? "bg-[#7FA0D6]/20 text-[#BCCCE6] cursor-default" 
                        : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                    }`}
                  >
                    {isBooked ? <><Check className="w-3.5 h-3.5"/> Booked</> : slot.time}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
