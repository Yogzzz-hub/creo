import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import { MessageCircle, Send, Check, X, AlertCircle } from "lucide-react";

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
  const [chatMessage, setChatMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const queryClient = useQueryClient();

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

  const clientChannel = `client-${(user?.full_name || "client").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const gate = useOnboardingGate();

  const { data: messages = [] } = useQuery({
    queryKey: ["chat_messages", activeRecipientId || clientChannel],
    queryFn: async () => {
      if (activeRecipientId) {
        return request<any[]>(`/api/v1/chat/messages?other_user_id=${activeRecipientId}`);
      }
      return request<any[]>(`/api/v1/chat/messages?channel=${clientChannel}`);
    },
    enabled: gate.isComplete,
    refetchInterval: 5000,
    staleTime: 5000,
  });

  const handleSendMessage = async (isModal = false) => {
    const isModalContext = typeof isModal === "boolean" ? isModal : false;
    const msg = isModalContext ? modalMessage : chatMessage;
    
    console.log("Dispatching drawer message:", { 
      recipientId: activeRecipientId, 
      channel: !activeRecipientId ? clientChannel : undefined,
      message: msg.trim(),
      isModal: isModalContext
    });

    if (!msg.trim()) return;

    try {
      const payload: any = { message: msg.trim(), client_id: user?.id, thread_type: "direct" };
      if (activeRecipientId) {
        payload.recipient_id = activeRecipientId;
      } else {
        payload.channel = clientChannel;
      }

      await request("/api/v1/chat/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (isModalContext) {
        setModalMessage("");
      } else {
        setChatMessage("");
      }
      queryClient.invalidateQueries({ queryKey: ["chat_messages", activeRecipientId || clientChannel] });
    } catch (err: any) {
      console.error("Failed to send message", err);
      showToast(err?.message || "Failed to send message. Please try again.", "error");
    }
  };

  const openDirectMessage = (recipientId: string, memberName: string) => {
    setActiveRecipientId(recipientId);
    setChatMessage(`@${memberName} `);
    setTimeout(() => {
      document.getElementById("pod-chat-input")?.focus();
    }, 50);
  };

  const handleBookSlot = (slotId: string) => {
    if (!bookedSlots.includes(slotId)) {
      setBookedSlots(prev => [...prev, slotId]);
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

  // Set default active recipient to pod lead once loaded
  useEffect(() => {
    if (!activeRecipientId && podLead) setActiveRecipientId(podLead.id || podLead.user_id || null);
  }, [activeRecipientId, podLead]);

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
                <button
                  onClick={() => openDirectMessage(memberId, member.name)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#2A3446] text-[#97A0B3] bg-[#161F2D]/60 text-[13px] font-medium cursor-pointer transition-all duration-200 hover:border-[#7FA0D6] hover:text-[#BCCCE6] hover:bg-[#7FA0D6]/[0.08] mt-auto"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                  Message {member.name.split(" ")[0]}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Section: Chat + Booking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat (2 cols) */}
        <div className="lg:col-span-2 bg-[#161F2D] rounded-2xl border border-[#2A3446] flex flex-col" style={{ minHeight: "400px" }}>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3446]">
            <h3 className="text-base font-semibold text-white">Chat with your pod</h3>
            <span className="text-[13px] text-[#97A0B3]">average reply 1h 50m</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto scrollbar-hide flex flex-col justify-center">
            {messages.length === 0 ? (
              <div className="py-12 text-center text-[#97A0B3]">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-white" />
                <p className="text-sm font-medium text-white/80">No messages yet</p>
                <p className="text-xs text-[#97A0B3] mt-1">Send a message to start communicating directly with your pod.</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isUser = msg.sender_id === user?.id;
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const nameInitial = msg.sender_name?.charAt(0)?.toUpperCase() || "U";
                return (
                <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${isUser ? "bg-[#BCCCE6] text-[#0B111C]" : "bg-gradient-to-br from-pink-500 to-orange-400 text-white"}`}>
                    {nameInitial}
                  </div>
                  <div className={isUser ? "text-right" : ""}>
                    <div className={`p-3 rounded-2xl text-sm inline-block text-left ${isUser ? "bg-[#BCCCE6] text-[#0B111C] rounded-tr-sm" : "bg-[#161F2D] text-white rounded-tl-sm"}`}>
                      {msg.message}
                    </div>
                    <span className={`text-[11px] text-[#97A0B3] mt-1 block ${isUser ? "text-right" : ""}`}>
                      {timeStr}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <div className="px-4 py-3 border-t border-[#2A3446]">
            <div className="flex items-center gap-2 bg-[#0B111C] rounded-full px-4 py-2 border border-white/[0.06]">
              <input
                id="pod-chat-input"
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm text-white placeholder-[#97A0B3] outline-none"
              />
              <button onClick={() => handleSendMessage(false)} className="px-4 py-1.5 bg-[#BCCCE6] text-[#0B111C] rounded-full text-[13px] font-medium hover:bg-white transition-colors flex items-center gap-1.5 shrink-0">
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Booking (1 col) */}
        <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
          <h3 className="text-base font-semibold text-white mb-1">Book a call</h3>
          <p className="text-[13px] text-[#97A0B3] mb-5">15-minute slots with your pod lead</p>

          <div className="space-y-0 divide-y divide-white/[0.05]">
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

      {/* 1-on-1 Direct Chat Modal (Slide-over) */}
      {isModalOpen && (() => {
        const activeRecipient = allMembers.find(m => (m.id || m.user_id) === activeRecipientId);
        const recipientInitials = activeRecipient?.name.split(" ").filter(w => w.length > 0).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
        const recipientName = activeRecipient?.name || "Team Member";
        const recipientRole = activeRecipient?.role || "Specialist";
        const recipientColorIndex = activeRecipient ? allMembers.findIndex(m => (m.id || m.user_id) === activeRecipientId) : 0;
        const recipientColor = AVATAR_COLORS[recipientColorIndex % AVATAR_COLORS.length] || "bg-[#7FA0D6]";

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-md bg-[#161F2D]/95 backdrop-blur-md border-l border-[#2A3446] h-full flex flex-col shadow-2xl shadow-[#050810]/80 animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A3446] bg-[#050810]/40">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ${recipientColor}`}>
                      {recipientInitials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#7FA0D6] border-2 border-[#161F2D] rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <span className="truncate max-w-[140px]">{recipientName}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#2A3446] text-[10px] font-medium text-[#BCCCE6] uppercase tracking-wider whitespace-nowrap">{recipientRole}</span>
                    </h3>
                    <p className="text-[11px] text-[#97A0B3] mt-0.5">Direct 1-on-1 Channel · Mon-Fri, 10am-7pm IST</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-md text-[#97A0B3] hover:text-[#BCCCE6] hover:border-[#2A3446] border border-transparent transition-colors cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Drawer Messages Thread */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="w-12 h-12 rounded-full border border-[#2A3446] bg-[#0B111C] flex items-center justify-center mb-4">
                      <MessageCircle className="w-5 h-5 text-[#7FA0D6]" />
                    </div>
                    <h4 className="text-sm font-semibold text-[#BCCCE6] mb-4">Start a conversation with {recipientName.split(" ")[0]}</h4>
                    <div className="flex flex-col gap-2 w-full max-w-[240px]">
                      <button 
                        onClick={() => setModalMessage("Checking on the latest draft status")}
                        className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-[#97A0B3] hover:text-[#BCCCE6] hover:border-[#7FA0D6] hover:bg-[#7FA0D6]/[0.08] transition-all duration-200 cursor-pointer text-left"
                      >
                        "Checking on the latest draft status"
                      </button>
                      <button 
                        onClick={() => setModalMessage("Have a question about my brand brief")}
                        className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-[#97A0B3] hover:text-[#BCCCE6] hover:border-[#7FA0D6] hover:bg-[#7FA0D6]/[0.08] transition-all duration-200 cursor-pointer text-left"
                      >
                        "Have a question about my brand brief"
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isUser = msg.sender_id === user?.id;
                    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    return (
                      <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                        <div className={isUser ? "text-right" : "text-left"}>
                          <div className={`p-3 rounded-2xl text-sm inline-block text-left ${isUser ? "bg-[#7FA0D6]/15 border border-[#7FA0D6]/20 text-white rounded-br-sm" : "bg-[#0B111C] border border-[#2A3446] text-[#BCCCE6] rounded-bl-sm"}`}>
                            {msg.message}
                          </div>
                          <span className={`text-[11px] text-[#97A0B3] mt-1.5 block ${isUser ? "text-right" : "text-left"}`}>
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Input */}
              <div className="p-4 border-t border-[#2A3446] bg-[#050810]">
                <div className="flex items-center gap-2 bg-[#0B111C] rounded-xl px-4 py-2 border border-[#2A3446] focus-within:ring-1 focus-within:ring-[#7FA0D6] focus-within:border-[#7FA0D6] transition-all">
                  <input
                    type="text"
                    value={modalMessage}
                    onChange={(e) => setModalMessage(e.target.value)}
                    placeholder="Type a direct message..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#97A0B3] outline-none py-1.5"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(true);
                      }
                    }}
                  />
                  <button 
                    onClick={() => handleSendMessage(true)} 
                    disabled={!modalMessage.trim()}
                    className="p-1.5 bg-[#7FA0D6] text-[#050810] rounded-lg hover:bg-white transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
