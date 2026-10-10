import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Calendar,
  FileCheck,
  Check,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

interface MessageEntry {
  id: string;
  author: string;
  role: string;
  avatar: string;
  avatarBg: string;
  timestamp: string;
  text: string;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] || "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
};

export function ClientTicketDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id, ticketId } = useParams();
  const activeId = id || ticketId || "1039";

  // Redirect admin and pod team members to internal admin triage suite
  const isOpsRole =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "team_lead" ||
    user?.role === "ops_admin" ||
    user?.role === "editor" ||
    user?.role === "designer" ||
    user?.role === "team_member";

  useEffect(() => {
    if (isOpsRole && activeId) {
      navigate(`/admin/support/tickets/${activeId}`, { replace: true });
    }
  }, [isOpsRole, activeId, navigate]);

  const [ticketData, setTicketData] = useState<{
    id: string;
    client: string;
    email: string;
    tier: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    time: string;
    assignee_name?: string;
  } | null>(null);

  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [followUpText, setFollowUpText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const fetchTicket = () => {
      // 1. Check special mock ticket 1781
      if (activeId === "1781" || activeId.includes("1781")) {
        setTicketData({
          id: "1781",
          client: "Sushmitaa",
          email: "sushmitaa1407@gmail.com",
          tier: "Enterprise Acceleration",
          title: "deliverables not received on time, checkout",
          description: "I've not received my deliverables which was scheduled yesterday",
          priority: "High",
          status: "resolved",
          time: "Yesterday, 4:15 PM",
          assignee_name: "Creative Pod Alpha",
        });
        setMessages([
          {
            id: "msg-1781-1",
            author: "Sushmitaa",
            role: "Client",
            avatar: "S",
            avatarBg: "bg-[#7FA0D6]",
            timestamp: "Yesterday at 4:15 PM",
            text: "I've not received my deliverables which was scheduled yesterday",
          },
          {
            id: "msg-1781-2",
            author: "Pod Lead",
            role: "Pod Lead",
            avatar: "PL",
            avatarBg: "bg-emerald-600",
            timestamp: "Yesterday at 4:48 PM",
            text: "Hi Sushmitaa, we apologize for the short delay! The final 4K color grade has been expedited and is now ready in your Deliverables tab.",
          },
        ]);
        return;
      }

      // 2. Fetch from real backend API
      request<any>(`/api/v1/tickets/${activeId}`)
        .then((data) => {
          setTicketData({
            id: String(data.id),
            client: data.client || user?.full_name || "Client",
            email: data.email || user?.email || "client@creo.agency",
            tier: data.tier || "Active Retainer",
            title: data.title || data.subject || "Support Request",
            description: data.description || "",
            priority: data.priority || "Medium",
            status: (data.status || "open").toLowerCase(),
            time: data.created_at ? new Date(data.created_at).toLocaleString() : "Recently",
            assignee_name: data.assignee ? data.assignee.full_name : undefined,
          });

          const msgArray = Array.isArray(data.messages) ? data.messages : [];
          const msgs: MessageEntry[] = msgArray.map((m: any) => {
            const senderName = m.sender_name || (m.sender_id === user?.id ? (user?.full_name || "You") : "Support Specialist");
            const isUser = m.sender_id === user?.id;
            return {
              id: m.id,
              author: senderName,
              role: isUser ? "Client" : "Creative Pod",
              avatar: getInitials(senderName),
              avatarBg: isUser ? "bg-[#7FA0D6]" : "bg-emerald-600",
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              text: m.message,
            };
          });

          // Ensure original report is visible if not in messages
          if (data.description && msgs.length === 0) {
            msgs.push({
              id: "msg-orig",
              author: user?.full_name || "You",
              role: "Client",
              avatar: getInitials(user?.full_name || "Client"),
              avatarBg: "bg-[#7FA0D6]",
              timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Recently",
              text: data.description,
            });
          }

          setMessages(msgs);
        })
        .catch(() => {
          // Fallback to localStorage or mock
          try {
            const stored = JSON.parse(localStorage.getItem("creo_support_tickets") || "[]");
            const found = stored.find(
              (t: any) =>
                String(t.id).toLowerCase() === activeId.toLowerCase() ||
                activeId.toLowerCase().includes(String(t.id).toLowerCase())
            );
            if (found) {
              setTicketData({
                id: String(found.id),
                client: found.client || user?.full_name || "Client",
                email: found.email || user?.email || "client@creo.agency",
                tier: found.tier || "Active Retainer",
                title: found.issueTitle || found.title || "Support Request",
                description: found.issueDesc || found.description || "",
                priority: found.priority || "Medium",
                status: (found.status || "open").toLowerCase(),
                time: found.timeLog || "Recently",
              });
              if (found.issueDesc || found.description) {
                setMessages([
                  {
                    id: "msg-orig-local",
                    author: user?.full_name || "You",
                    role: "Client",
                    avatar: getInitials(user?.full_name || "Client"),
                    avatarBg: "bg-[#7FA0D6]",
                    timestamp: found.timeLog || "Recently",
                    text: found.issueDesc || found.description,
                  },
                ]);
              }
            }
          } catch {}
        });
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 4000);
    return () => clearInterval(interval);
  }, [activeId, user]);

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await request(`/api/v1/tickets/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: followUpText.trim() }),
      });

      const newMsg: MessageEntry = {
        id: `msg-${Date.now()}`,
        author: user?.full_name || "You",
        role: "Client",
        avatar: getInitials(user?.full_name || "Client"),
        avatarBg: "bg-[#7FA0D6]",
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        text: followUpText.trim(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setFollowUpText("");
      showToast("Follow-up note sent to your creative pod.");
    } catch {
      // Local fallback
      const newMsg: MessageEntry = {
        id: `msg-${Date.now()}`,
        author: user?.full_name || "You",
        role: "Client",
        avatar: getInitials(user?.full_name || "Client"),
        avatarBg: "bg-[#7FA0D6]",
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        text: followUpText.trim(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setFollowUpText("");
      showToast("Note added to ticket history.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSolved =
    ticketData?.status === "resolved" ||
    ticketData?.status === "closed" ||
    ticketData?.status === "solved";

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-6 pb-12 animate-fade-in text-[#F1F5F9]">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-emerald-950/95 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/portal/support"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#97A0B3] hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Support Desk</span>
        </Link>
        <span className="text-xs text-[#97A0B3] font-mono">
          Ticket ID: #{String(ticketData?.id || activeId).slice(0, 8)}
        </span>
      </div>

      {/* ── 1. PROMINENT RESULT BANNER: SOLVED vs IN PROGRESS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl sm:rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden ${
          isSolved
            ? "bg-gradient-to-br from-emerald-950/80 via-[#161F2D] to-[#0B111C] border-emerald-500/40 shadow-emerald-950/30"
            : "bg-gradient-to-br from-blue-950/70 via-[#161F2D] to-[#0B111C] border-blue-500/30 shadow-blue-950/20"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div
              className={`size-14 sm:size-16 rounded-2xl flex items-center justify-center shrink-0 border ${
                isSolved
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                  : "bg-blue-500/20 text-[#7FA0D6] border-blue-500/30 shadow-[0_0_24px_rgba(59,130,246,0.2)]"
              }`}
            >
              {isSolved ? (
                <CheckCircle2 className="size-8 sm:size-9" />
              ) : (
                <Clock className="size-8 sm:size-9 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    isSolved
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  <span className={`size-2 rounded-full ${isSolved ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                  {isSolved ? "TICKET SOLVED" : "TICKET IN PROGRESS"}
                </span>
                <span className="text-xs text-[#97A0B3] hidden sm:inline">
                  {ticketData?.time ? `Submitted ${ticketData.time}` : ""}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isSolved
                  ? "This ticket has been marked Solved"
                  : "Your creative pod is working on this ticket"}
              </h1>

              <p className="text-xs sm:text-sm text-[#97A0B3] mt-1 max-w-xl">
                {isSolved
                  ? "All required adjustments or answers have been completed by your creative team. Check the resolution details below."
                  : "Your inquiry is currently in queue with our dedicated specialists. We review and resolve deliverables and support inquiries rapidly."}
              </p>
            </div>
          </div>

          {/* Quick Action Button in Banner */}
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            {isSolved ? (
              <Link
                to="/portal/deliverables"
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0B111C] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <FileCheck className="size-4" />
                <span>View Deliverables</span>
              </Link>
            ) : (
              <Link
                to="/portal/slack"
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#7FA0D6] hover:bg-[#7FA0D6]/90 text-[#0B111C] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="size-4" />
                <span>Chat in Slack Hub</span>
              </Link>
            )}
          </div>
        </div>

        {/* Status Timeline Bar */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="size-6 rounded-full bg-emerald-500 text-[#0B111C] flex items-center justify-center text-xs font-black mb-1">
              ✓
            </div>
            <span className="text-[11px] font-bold text-white">Ticket Created</span>
            <span className="text-[10px] text-[#97A0B3]">Received</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`size-6 rounded-full flex items-center justify-center text-xs font-black mb-1 ${
                isSolved
                  ? "bg-emerald-500 text-[#0B111C]"
                  : "bg-blue-500 text-white animate-pulse"
              }`}
            >
              {isSolved ? "✓" : "2"}
            </div>
            <span className="text-[11px] font-bold text-white">Under Pod Review</span>
            <span className="text-[10px] text-[#97A0B3]">
              {isSolved ? "Completed" : "In Progress"}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`size-6 rounded-full flex items-center justify-center text-xs font-black mb-1 ${
                isSolved
                  ? "bg-emerald-500 text-[#0B111C]"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}
            >
              {isSolved ? "✓" : "3"}
            </div>
            <span className={`text-[11px] font-bold ${isSolved ? "text-emerald-400" : "text-[#97A0B3]"}`}>
              {isSolved ? "Solved" : "Pending Resolution"}
            </span>
            <span className="text-[10px] text-[#97A0B3]">
              {isSolved ? "Resolved" : "Awaiting team"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── 2. MAIN DETAILS & CONVERSATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Your Original Report & Conversation (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Your Original Request Card */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#2A3446] pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#7FA0D6] uppercase tracking-wider block mb-1">
                  Subject
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {ticketData?.title || "Support Request"}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] shrink-0">
                {ticketData?.priority || "Medium"} Priority
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-[#97A0B3] block mb-2">
                What you reported:
              </span>
              <div className="p-4 rounded-xl bg-[#0B111C] border border-white/[0.04] text-sm text-[#F1F5F9] whitespace-pre-wrap leading-relaxed">
                {ticketData?.description || "No description provided."}
              </div>
            </div>
          </div>

          {/* Conversation & Pod Responses */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="size-4 text-[#7FA0D6]" />
                <span>Updates & Responses</span>
              </h3>
              <span className="text-xs text-[#97A0B3]">
                {messages.length} message{messages.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3.5">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-[#97A0B3] bg-[#0B111C]/50 rounded-xl">
                  <Clock className="size-8 mx-auto mb-2 opacity-40 text-[#7FA0D6]" />
                  <p className="text-sm font-semibold text-white">No updates yet</p>
                  <p className="text-xs text-[#97A0B3] mt-1">
                    Your pod lead will post updates and confirmation here once resolved.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-[#0B111C] border border-white/[0.04] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`size-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 ${msg.avatarBg}`}
                        >
                          {msg.avatar}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">
                            {msg.author}
                          </span>
                          <span className="text-[10px] text-[#97A0B3]">
                            {msg.role}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#97A0B3]">{msg.timestamp}</span>
                    </div>

                    <div className="text-xs sm:text-sm text-[#F1F5F9] whitespace-pre-wrap pl-9 leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Follow-up reply box */}
            <form onSubmit={handleSendFollowUp} className="pt-2 border-t border-[#2A3446]">
              <label className="block text-xs font-bold text-[#97A0B3] mb-2">
                Need to add extra details or follow up with your team?
              </label>
              <div className="flex gap-2">
                <textarea
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  placeholder="Type a follow-up message to your creative pod..."
                  rows={2}
                  className="flex-1 p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs sm:text-sm text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] resize-none"
                />
                <button
                  type="submit"
                  disabled={!followUpText.trim() || isSubmitting}
                  className="px-4 rounded-xl bg-[#7FA0D6] hover:bg-[#7FA0D6]/90 text-[#0B111C] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Send Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Resolution Summary & Help Card (1 Col) */}
        <div className="space-y-6">
          {/* Resolution Result Summary Card */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A3446] pb-3">
              <ShieldCheck className="size-4 text-[#7FA0D6]" />
              <span>Resolution Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B111C] border border-white/[0.04]">
                <span className="text-[#97A0B3]">Final Result</span>
                <span
                  className={`font-black uppercase tracking-wider ${
                    isSolved ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {isSolved ? "✓ Solved" : "In Progress"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B111C] border border-white/[0.04]">
                <span className="text-[#97A0B3]">Assigned Pod</span>
                <span className="font-bold text-white">
                  {ticketData?.assignee_name || "Creative Pod Specialists"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B111C] border border-white/[0.04]">
                <span className="text-[#97A0B3]">SLA Target</span>
                <span className="font-bold text-emerald-400">
                  {isSolved ? "Met On Time" : "Standard SLA Active"}
                </span>
              </div>
            </div>

            {isSolved && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  All requests on this ticket have been resolved. If you need any further changes, you can submit a new request anytime.
                </span>
              </div>
            )}
          </div>

          {/* Direct Support Options */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446] shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="size-4 text-[#7FA0D6]" />
              <span>Direct Assistance</span>
            </h3>

            <p className="text-xs text-[#97A0B3]">
              Need immediate answers? You can chat live with your dedicated specialists or schedule a sync.
            </p>

            <div className="space-y-2 pt-1">
              <Link
                to="/portal/slack"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-white/[0.04] text-xs font-semibold text-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="size-4 text-[#7FA0D6]" />
                  <span>Open Pod Slack Chat</span>
                </div>
                <ChevronRight className="size-3.5 text-[#97A0B3] group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/portal/creative-pod"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-white/[0.04] text-xs font-semibold text-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-[#7FA0D6]" />
                  <span>Meet Your Creative Pod</span>
                </div>
                <ChevronRight className="size-3.5 text-[#97A0B3] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
