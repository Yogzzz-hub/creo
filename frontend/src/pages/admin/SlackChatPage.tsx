import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Hash,
  Send,
  Plus,
  Paperclip,
  Video,
  CheckCircle2,
  Sparkles,
  X,
  User,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  avatar: string;
  avatarBg: string;
  content: string;
  timestamp: string;
  attachment?: { name: string; size: string; type: string };
  isTaskCard?: boolean;
  taskData?: {
    id: string;
    title: string;
    assignee: string;
    client: string;
    priority: "P1 High" | "P2 Med" | "P3 Normal";
    deadline: string;
    status: "In Progress" | "Completed" | "Pending QA";
  };
  reactions: { emoji: string; count: number; users: string[] }[];
}

export function SlackChatPage() {
  const navigate = useNavigate();

  // Active channel / DM selection
  const [activeChannel, setActiveChannel] = useState<string>("pod-a-general");
  const [activeDm, setActiveDm] = useState<string | null>(null);

  // Mobile view toggle ('channels' or 'chat')
  const [mobileView, setMobileView] = useState<"channels" | "chat">("chat");

  // Persona switch (Admin, Team Lead Maya, Member David, Client Sarah)
  const [currentPersona, setCurrentPersona] = useState<"David Kim" | "Maya Lin" | "Admin Operations" | "Sarah Jenkins (Client)">("David Kim");

  // Input states
  const [messageText, setMessageText] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [assignTaskModalOpen, setAssignTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("TikTok 9:16 Kinetic Teaser (Ver C)");
  const [taskAssignee, setTaskAssignee] = useState("David Kim (Sr. Motion)");
  const [taskClient, setTaskClient] = useState("Northwind Labs");
  const [taskPriority, setTaskPriority] = useState<"P1 High" | "P2 Med" | "P3 Normal">("P1 High");
  const [taskDeadline, setTaskDeadline] = useState("Today by 05:00 PM PST");
  const [taskScope, setTaskScope] = useState("Render 15s kinetic cut with high-contrast text overlays and audio normalize to -14 LUFS.");

  const [callModalOpen, setCallModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial messages by channel
  const [channelMessages, setChannelMessages] = useState<Record<string, ChatMessage[]>>({
    "pod-a-general": [
      {
        id: "m-1",
        sender: "Maya Lin",
        role: "Pod A Lead",
        avatar: "ML",
        avatarBg: "bg-blue-600",
        content: "Good morning team! Standup is in 25 mins. Please ensure your Octane render caches are synced.",
        timestamp: "09:35 AM",
        reactions: [
          { emoji: "👍", count: 3, users: ["David Kim", "Chloe Tan", "Elena Ortiz"] },
          { emoji: "⚡", count: 2, users: ["David Kim", "Marcus Vance"] },
        ],
      },
      {
        id: "m-2",
        sender: "David Kim",
        role: "Sr. Motion",
        avatar: "DK",
        avatarBg: "bg-[#2563EB]",
        content: "Morning Maya! Dual RTX 4090 cluster is at 75% on the Northwind 3D Product Teaser. Frame 3,840/5,120 clean.",
        timestamp: "09:38 AM",
        reactions: [{ emoji: "🚀", count: 2, users: ["Maya Lin", "Chloe Tan"] }],
      },
      {
        id: "m-3",
        sender: "Chloe Tan",
        role: "Backup Motion & QA",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        content: "Standing by for spillover renders if Node #04 needs extra capacity. Ready for handoffs.",
        timestamp: "09:41 AM",
        reactions: [{ emoji: "❤️", count: 1, users: ["David Kim"] }],
      },
    ],
    "deliverables-handoff": [
      {
        id: "dh-1",
        sender: "David Kim",
        role: "Sr. Motion",
        avatar: "DK",
        avatarBg: "bg-[#2563EB]",
        content: "Master ProRes 4444 drop for Northwind Hero Loop. Color space verified Rec.709.",
        timestamp: "Yesterday at 04:30 PM",
        attachment: { name: "Northwind_Hero_3D_Visual_Loop_4K.mov", size: "1.4 GB", type: "video" },
        reactions: [{ emoji: "🔥", count: 3, users: ["Maya Lin", "Sarah Jenkins", "Elena Ortiz"] }],
      },
      {
        id: "dh-2",
        sender: "Maya Lin",
        role: "Pod A Lead",
        avatar: "ML",
        avatarBg: "bg-blue-600",
        content: "Signed off on the full 60s master. Dispatched to AWS S302 client vault.",
        timestamp: "Yesterday at 05:15 PM",
        reactions: [{ emoji: "🎉", count: 4, users: ["David Kim", "Sarah Jenkins", "Chloe Tan", "Elena Ortiz"] }],
      },
    ],
    "client-northwind": [
      {
        id: "cn-1",
        sender: "Sarah Jenkins (Client)",
        role: "Brand Director • Northwind Labs",
        avatar: "SJ",
        avatarBg: "bg-gradient-to-br from-indigo-600 to-purple-600",
        content: "Hey Creo Pod! The Hero 3D visual loop is absolutely phenomenal. Our executive team loved the pacing!",
        timestamp: "10:12 AM",
        reactions: [
          { emoji: "❤️", count: 4, users: ["David Kim", "Maya Lin", "Marcus Vance", "Elena Ortiz"] },
          { emoji: "🚀", count: 3, users: ["David Kim", "Maya Lin", "Admin Operations"] },
        ],
      },
      {
        id: "cn-2",
        sender: "Maya Lin",
        role: "Pod A Lead",
        avatar: "ML",
        avatarBg: "bg-blue-600",
        content: "Thrilled to hear that Sarah! David is currently finalizing the 15s TikTok & Reel companion cuts right now.",
        timestamp: "10:15 AM",
        reactions: [{ emoji: "👍", count: 2, users: ["Sarah Jenkins (Client)", "David Kim"] }],
      },
    ],
    "urgent-escalations": [
      {
        id: "ue-1",
        sender: "Admin Operations",
        role: "Lead Ops Desk",
        avatar: "AO",
        avatarBg: "bg-slate-900",
        content: "Atlas Commerce Q4 Bumper turn-around deadline is locked for 5:00 PM EST today. SLA timer green.",
        timestamp: "08:45 AM",
        reactions: [{ emoji: "👀", count: 2, users: ["Maya Lin", "David Kim"] }],
      },
    ],
  });

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages, activeChannel, activeDm]);

  const activeKey = activeDm ? `dm-${activeDm}` : activeChannel;
  const currentMessages = channelMessages[activeKey] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    const senderRole =
      currentPersona === "Maya Lin"
        ? "Pod A Lead"
        : currentPersona === "Sarah Jenkins (Client)"
        ? "Brand Director • Northwind Labs"
        : currentPersona === "Admin Operations"
        ? "Operations Executive"
        : "Sr. Motion";

    const senderBg =
      currentPersona === "Maya Lin"
        ? "bg-blue-600"
        : currentPersona === "Sarah Jenkins (Client)"
        ? "bg-gradient-to-br from-indigo-600 to-purple-600"
        : currentPersona === "Admin Operations"
        ? "bg-slate-900"
        : "bg-[#2563EB]";

    const senderInitials =
      currentPersona === "Maya Lin"
        ? "ML"
        : currentPersona === "Sarah Jenkins (Client)"
        ? "SJ"
        : currentPersona === "Admin Operations"
        ? "AO"
        : "DK";

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: currentPersona,
      role: senderRole,
      avatar: senderInitials,
      avatarBg: senderBg,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reactions: [],
    };

    setChannelMessages((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), newMsg],
    }));

    setMessageText("");
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setChannelMessages((prev) => {
      const msgs = prev[activeKey] || [];
      const updated = msgs.map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.users.includes(currentPersona)) {
            return {
              ...m,
              reactions: m.reactions
                .map((r) =>
                  r.emoji === emoji
                    ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentPersona) }
                    : r
                )
                .filter((r) => r.count > 0),
            };
          } else {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentPersona] } : r
              ),
            };
          }
        } else {
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, users: [currentPersona] }],
          };
        }
      });
      return { ...prev, [activeKey]: updated };
    });
  };

  const handleConfirmAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignTaskModalOpen(false);

    const taskMsg: ChatMessage = {
      id: `task-${Date.now()}`,
      sender: currentPersona,
      role: currentPersona === "Maya Lin" ? "Pod A Lead" : "Operations Executive",
      avatar: currentPersona === "Maya Lin" ? "ML" : "AO",
      avatarBg: currentPersona === "Maya Lin" ? "bg-blue-600" : "bg-slate-900",
      content: `⚡ New Task Assigned: **${taskTitle}** assigned to **${taskAssignee}** for **${taskClient}**!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTaskCard: true,
      taskData: {
        id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
        title: taskTitle,
        assignee: taskAssignee,
        client: taskClient,
        priority: taskPriority,
        deadline: taskDeadline,
        status: "In Progress",
      },
      reactions: [{ emoji: "🚀", count: 1, users: [currentPersona] }],
    };

    setChannelMessages((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), taskMsg],
    }));

    showToast(`Assigned task "${taskTitle}" to ${taskAssignee}! Posted to #${activeChannel}.`);
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="Slack" />

      {/* Main Slack Layout (Sidebar + Chat Area) */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1650px] w-full mx-auto px-2 sm:px-6 py-2 sm:py-4 gap-3 sm:gap-4 h-[calc(100vh-76px)] overflow-hidden pb-20 md:pb-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 sm:right-8 z-[9999] p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xl animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. SLACK LEFT SIDEBAR (Full width on mobile when channels view active, fixed 72 on desktop) */}
        <aside
          className={`${
            mobileView === "channels" ? "flex w-full" : "hidden md:flex md:w-72"
          } bg-slate-900 text-slate-300 rounded-2xl sm:rounded-3xl flex-col shadow-xl border border-slate-800 shrink-0 overflow-hidden h-full`}
        >
          {/* Workspace Title & Persona Switcher */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-md bg-[#2563EB]" />
                <span className="font-black text-sm text-white tracking-tight">Creo Slack Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Pod A
                </span>
                {mobileView === "channels" && (
                  <button
                    onClick={() => setMobileView("chat")}
                    className="md:hidden text-xs font-bold text-blue-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
                  >
                    Open Chat &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Persona Switcher Selector */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Chatting as:
              </div>
              <select
                value={currentPersona}
                onChange={(e) => {
                  const p = e.target.value as any;
                  setCurrentPersona(p);
                  showToast(`Switched active persona to ${p}`);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="David Kim">David Kim (Sr. Motion Specialist)</option>
                <option value="Maya Lin">Maya Lin (Pod A Lead)</option>
                <option value="Admin Operations">Admin Operations (Executive)</option>
                <option value="Sarah Jenkins (Client)">Sarah Jenkins (Client - Northwind Labs)</option>
              </select>
            </div>
          </div>

          {/* Channels & DMs List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Quick Task Assign Button in Sidebar */}
            <button
              onClick={() => setAssignTaskModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="size-4" />
              + Assign Task in Chat
            </button>

            {/* Channels Section */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Channels</span>
                <span className="text-slate-400">4</span>
              </div>

              {[
                { id: "pod-a-general", label: "pod-a-general", desc: "Daily banter & renders" },
                { id: "deliverables-handoff", label: "deliverables-handoff", desc: "4K Master Drops" },
                { id: "client-northwind", label: "client-northwind", desc: "Sarah Jenkins & Pod A" },
                { id: "urgent-escalations", label: "urgent-escalations", desc: "SLA alert queue" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChannel(c.id);
                    setActiveDm(null);
                    setMobileView("chat");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                    activeChannel === c.id && !activeDm
                      ? "bg-[#2563EB] text-white shadow-xs font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Hash className="size-3.5 opacity-70" />
                  <span className="truncate flex-1">{c.label}</span>
                  <ChevronRight className="size-3.5 opacity-40 md:hidden" />
                </button>
              ))}
            </div>

            {/* Direct Messages Section */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Direct Messages
              </div>

              {[
                { name: "Maya Lin", role: "Pod Lead", avatar: "ML", bg: "bg-blue-600", online: true },
                { name: "Chloe Tan", role: "Backup QA", avatar: "CT", bg: "bg-teal-600", online: true },
                { name: "Marcus Vance", role: "Copy Lead", avatar: "MV", bg: "bg-slate-700", online: false },
                { name: "Sarah Jenkins", role: "Client Lead", avatar: "SJ", bg: "bg-purple-600", online: true },
              ].map((dm) => (
                <button
                  key={dm.name}
                  onClick={() => {
                    setActiveDm(dm.name);
                    setMobileView("chat");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                    activeDm === dm.name
                      ? "bg-[#2563EB] text-white font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`size-5 rounded-md ${dm.bg} text-white font-black text-[9px] flex items-center justify-center shrink-0`}>
                      {dm.avatar}
                    </div>
                    <span className="truncate text-xs">{dm.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${dm.online ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <ChevronRight className="size-3.5 opacity-40 md:hidden text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active User Footer in Sidebar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-[#2563EB] text-white font-black text-xs flex items-center justify-center shadow-xs">
              {currentPersona.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate">{currentPersona}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active in workspace
              </div>
            </div>
          </div>
        </aside>

        {/* 2. SLACK MAIN CHAT AREA */}
        <section
          className={`${
            mobileView === "chat" ? "flex flex-1" : "hidden md:flex md:flex-1"
          } bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl flex-col overflow-hidden h-full`}
        >
          {/* Header Bar */}
          <div className="px-3 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Back button on mobile to view channel list */}
              <button
                type="button"
                onClick={() => setMobileView("channels")}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0 transition-colors cursor-pointer"
                title="View Channels"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden xs:inline">Channels</span>
              </button>

              <div className="size-8 sm:size-9 rounded-xl sm:rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-black shrink-0">
                {activeDm ? <User className="size-4" /> : <Hash className="size-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {activeDm ? activeDm : `#${activeChannel}`}
                  </h2>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                    {activeDm ? "DM" : "Channel"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">
                  {activeDm
                    ? "Direct communication channel with end-to-end task integration"
                    : "Live sprint channel • Real-time notifications & task drops"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Assign Task Button in Header */}
              <button
                onClick={() => setAssignTaskModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Assign Task</span>
                <span className="sm:hidden">Task</span>
              </button>

              <button
                onClick={() => setCallModalOpen(true)}
                className="size-8 sm:size-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Start Video Huddle"
              >
                <Video className="size-3.5 sm:size-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-[#FAFAFA]/40">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className="group relative p-3 sm:p-3.5 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all flex items-start gap-2.5 sm:gap-3.5"
              >
                {/* Avatar */}
                <div className={`size-8 sm:size-10 rounded-xl sm:rounded-2xl ${msg.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                  {msg.avatar}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">{msg.sender}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-md">
                      {msg.role}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">{msg.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  <div className="text-xs text-slate-700 leading-relaxed font-medium break-words">
                    {msg.content}
                  </div>

                  {/* Task Card Embedded in Chat */}
                  {msg.isTaskCard && msg.taskData && (
                    <div className="mt-2.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm space-y-2.5 w-full max-w-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {msg.taskData.id}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            msg.taskData.priority === "P1 High"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {msg.taskData.priority}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-900">{msg.taskData.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mt-1">
                          <span>👤 Assignee: <strong>{msg.taskData.assignee}</strong></span>
                          <span>•</span>
                          <span>🏢 Client: <strong>{msg.taskData.client}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-blue-200/60 text-xs">
                        <span className="text-[11px] text-slate-500 font-semibold truncate mr-2">
                          ⏱ Due: {msg.taskData.deadline}
                        </span>
                        <button
                          onClick={() => {
                            showToast(`Opened task ${msg.taskData?.id} in sprint Kanban board!`);
                            navigate("/workstation/tasks");
                          }}
                          className="px-3 py-1 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer shrink-0"
                        >
                          View Board &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attachment Card */}
                  {msg.attachment && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between w-full max-w-md gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          🎬
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {msg.attachment.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{msg.attachment.size} • Verified Master</div>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast(`Downloading ${msg.attachment?.name}...`)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-blue-600 font-bold text-xs hover:bg-blue-50 cursor-pointer shrink-0"
                      >
                        Download
                      </button>
                    </div>
                  )}

                  {/* Reactions List */}
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleAddReaction(msg.id, r.emoji)}
                          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reaction Bar (Desktop hover / Mobile click) */}
                <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 bg-white border border-slate-200 shadow-md rounded-xl p-1 absolute top-2 right-2">
                  {["👍", "❤️", "🚀", "👀", "🔥"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="size-7 hover:bg-slate-100 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 sm:p-4 border-t border-slate-100 bg-white space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <button
                type="button"
                onClick={() => setAssignTaskModalOpen(true)}
                className="size-7 sm:size-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Assign Task in this Channel"
              >
                <Plus className="size-3.5 sm:size-4" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message #${activeChannel}...`}
                className="flex-1 bg-transparent text-xs font-medium placeholder:text-slate-400 focus:outline-none px-1.5 sm:px-2 min-w-0"
              />

              <button
                type="button"
                onClick={() => showToast("Simulated file upload attached!", "info")}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                title="Attach File"
              >
                <Paperclip className="size-3.5 sm:size-4" />
              </button>

              <button
                type="submit"
                disabled={!messageText.trim()}
                className="size-7 sm:size-8 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Send className="size-3.5 sm:size-4" />
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CENTERED MODALS WITH BLURRED BACKGROUND (z-[99999])
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL: ASSIGN TASK DIRECTLY IN SLACK */}
      {assignTaskModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setAssignTaskModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Assign Creative Task</h3>
                  <p className="text-xs text-slate-500">Post instant task card in #{activeChannel} and sync to Kanban</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignTaskModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assignee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="David Kim (Sr. Motion)">David Kim (Sr. Motion)</option>
                    <option value="Elena Ortiz (Brand Designer)">Elena Ortiz (Brand Designer)</option>
                    <option value="Marcus Vance (Copy Lead)">Marcus Vance (Copy Lead)</option>
                    <option value="Chloe Tan (Backup Motion & QA)">Chloe Tan (Backup Motion & QA)</option>
                    <option value="Sarah Jenkins (Client Review)">Sarah Jenkins (Client Review)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Pod</label>
                  <select
                    value={taskClient}
                    onChange={(e) => setTaskClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="Northwind Labs">Northwind Labs</option>
                    <option value="Atlas Commerce">Atlas Commerce</option>
                    <option value="Bloom Studio">Bloom Studio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="P1 High">P1 High (Urgent SLA)</option>
                    <option value="P2 Med">P2 Medium</option>
                    <option value="P3 Normal">P3 Normal Sprint</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Deadline</label>
                  <input
                    type="text"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Scope & Delivery Notes</label>
                <textarea
                  rows={3}
                  value={taskScope}
                  onChange={(e) => setTaskScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Confirm & Post Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIDEO CALL HUDDLE */}
      {callModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCallModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Start #{activeChannel} Huddle</h3>
              <p className="text-xs text-slate-500 mt-1">
                Instantly connect with everyone active in this channel via HD video & screen share.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCallModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCallModalOpen(false);
                  showToast(`Started video huddle in #${activeChannel}!`);
                }}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Launch Huddle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
