import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
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
  MessageSquare,
  Smile,
  Search,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { request } from "../../lib/http";

// WhatsApp Emoji Categories
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys & People",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸",
      "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢",
      "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
      "🤔", "🫣", "🤭", "🫡", "🤫", "🫠", "🤥", "😶", "😶‍🌫️", "😐", "😑", "😬", "🫨", "🫠", "🙄", "😯"
    ],
  },
  {
    id: "gestures",
    name: "Hands & Body",
    icon: "👍",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤟", "🤘", "🤌", "🤏", "👈", "👉", "👆",
      "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "💪", "🦾", "🖕", "✍️", "🫵", "🫶", "🫱", "🫲", "🫸",
      "🫷", "🫡", "🤝", "💅", "🤳", "💆", "💇", "🙋", "💁", "🙇", "🙅", "🙆", "🙋‍♂️", "🙋‍♀️"
    ],
  },
  {
    id: "symbols",
    name: "Hearts & Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "💯", "🔥", "✨", "🎉", "🎊", "⭐", "🌟", "💫", "⚡", "💥", "🎯", "🚀",
      "💡", "🔔", "🏆", "🥇", "🥈", "🥉", "👑", "💎", "📢", "💬", "💭", "🔴", "🟢", "🔵", "🟡", "✅", "❌"
    ],
  },
  {
    id: "animals",
    name: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵",
      "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗",
      "🐴", "🦄", "🐝", "🪲", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🐙", "🦑", "🦐", "🦞", "🦀"
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: "🍔",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥",
      "🥝", "🍅", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞",
      "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕",
      "☕", "🍵", "🧃", "🥤", "🧋", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🍿", "🍩", "🍪"
    ],
  },
  {
    id: "activities",
    name: "Objects & Activities",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍",
      "🏏", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷",
      "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎮", "🎰", "🧩", "🚗", "🏎️", "✈️", "🚀"
    ],
  },
];

const STORAGE_KEY = "creo_slack_messages_v2";

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  general: [
    {
      id: "seed-1",
      sender: "Pod Operations Lead",
      role: "Pod Lead",
      avatar: "PL",
      avatarBg: "bg-[#7FA0D6]",
      content: "Good morning team! Standup update: All 4 active client sprint deliverables are on track for today's review.",
      timestamp: "09:00 AM",
      reactions: [
        { emoji: "🚀", count: 3, users: ["Pod Lead", "Operations"] },
        { emoji: "👍", count: 2, users: ["Specialist"] },
      ],
    },
    {
      id: "seed-2",
      sender: "Client Manager",
      role: "Operations Executive",
      avatar: "CM",
      avatarBg: "bg-[#7FA0D6]",
      content: "Reminder: Please upload all final MP4 and Figma assets to the deliverables-handoff channel once QA approves.",
      timestamp: "09:15 AM",
      reactions: [{ emoji: "✅", count: 4, users: ["Team Lead"] }],
    },
  ],
  "deliverables-handoff": [
    {
      id: "seed-3",
      sender: "Creative Specialist",
      role: "Video Editor",
      avatar: "CS",
      avatarBg: "bg-[#7FA0D6]",
      content: "📦 Handoff Drop: High-conversion reel assets for Apex Motion are packaged and ready for final review.",
      timestamp: "10:30 AM",
      reactions: [{ emoji: "🔥", count: 3, users: ["Lead"] }],
    },
  ],
  "urgent-escalations": [
    {
      id: "seed-4",
      sender: "System Alert",
      role: "Automation Bot",
      avatar: "SA",
      avatarBg: "bg-[#D8BF9B]",
      content: "⚡ SLA Monitor: Priority 1 deliverable review queue is currently empty. Excellent turnaround time!",
      timestamp: "11:00 AM",
      reactions: [{ emoji: "⭐", count: 2, users: ["Admin"] }],
    },
  ],
};
import { useAuth } from "../../lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, fetchClientRoster, type PodDashboardData, type ClientRosterItem } from "../../lib/ops-api";

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
  const { user } = useAuth();

  const { data: podData } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });

  const podName = podData?.pod?.name || "Pod Operations";
  const defaultPersona = user?.full_name || user?.email?.split("@")[0] || "Team Member";

  const isOpsOrSuperAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "ops_admin";

  const { data: rawClientRoster } = useQuery<ClientRosterItem[]>({
    queryKey: ["client_roster"],
    queryFn: () => fetchClientRoster(),
    enabled: isOpsOrSuperAdmin,
  });

  const clientRoster = (rawClientRoster || []).map(c => ({
    id: c.client_id,
    name: c.company_name || c.email.split("@")[0] || "Unknown Client",
    pod_name: (c as any).pod_name || undefined
  }));

  // Active channel / DM selection
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [activeDm, setActiveDm] = useState<string | null>(null);

  // Mobile view toggle ('channels' or 'chat')
  const [mobileView, setMobileView] = useState<"channels" | "chat">("chat");

  // Persona switch
  const [currentPersona, setCurrentPersona] = useState<string>(defaultPersona);

  useEffect(() => {
    if (user?.full_name) {
      setCurrentPersona(user.full_name);
    }
  }, [user?.full_name]);

  // Input states
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("smileys");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [pickerTargetMsgId, setPickerTargetMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [assignTaskModalOpen, setAssignTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskClient, setTaskClient] = useState("");
  const [taskPriority, setTaskPriority] = useState<"P1 High" | "P2 Med" | "P3 Normal">("P1 High");
  const [taskDeadline, setTaskDeadline] = useState("Today by 05:00 PM PST");
  const [taskScope, setTaskScope] = useState("");

  const [callModalOpen, setCallModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistent Messages loaded from localStorage with initial seeds
  const [channelMessages, setChannelMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      }
    } catch (err) {
      console.warn("Failed to load slack messages from storage:", err);
    }
    return SEED_MESSAGES;
  });

  // Sync messages to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channelMessages));
    } catch (err) {
      console.warn("Failed to persist slack messages:", err);
    }
  }, [channelMessages]);

  // Real-time multi-tab / multi-window broadcast synchronization
  useEffect(() => {
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel("creo_slack_sync_channel");
      broadcast.onmessage = (event) => {
        if (event.data && event.data.type === "SLACK_MSG_SYNC" && event.data.payload) {
          setChannelMessages(event.data.payload);
        }
      };
    } catch (e) {
      console.log("BroadcastChannel fallback to storage event");
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setChannelMessages(parsed);
        } catch (err) {
          console.warn(err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      broadcast?.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const broadcastUpdate = (updated: Record<string, ChatMessage[]>) => {
    setChannelMessages(updated);
    try {
      const bc = new BroadcastChannel("creo_slack_sync_channel");
      bc.postMessage({ type: "SLACK_MSG_SYNC", payload: updated });
      bc.close();
    } catch (e) {
      // fallback
    }
  };

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages, activeChannel, activeDm]);

  const activeClientId = activeChannel.startsWith("client-")
    ? (isOpsOrSuperAdmin 
        ? clientRoster?.find((c) => `client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` === activeChannel)?.id 
        : podData?.clients?.find((c) => `client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` === activeChannel)?.id)
    : null;

  const { data: serverMessages = [], refetch: refetchServerMessages } = useQuery({
    queryKey: ["chat_messages", activeChannel, activeDm],
    queryFn: async () => {
      let url = "";
      if (activeDm) {
        const dmUser = podData?.members?.find((m) => (m.name || m.full_name) === activeDm);
        if (!dmUser?.id) return [];
        url = `/api/v1/chat/messages?other_user_id=${dmUser.id}`;
      } else if (activeChannel.startsWith("client-")) {
        url = `/api/v1/chat/messages?channel=${activeChannel}`;
      } else {
        url = `/api/v1/chat/messages?channel=${activeChannel}`;
      }
      
      const res = await request<any[]>(url);
      return (res || []).map((m: any) => ({
        id: m.id,
        sender: m.sender_name || "Unknown",
        role: "Specialist", 
        avatar: (m.sender_name || "U").slice(0, 2).toUpperCase(),
        avatarBg: "bg-[#7FA0D6]",
        content: m.message,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        reactions: [],
      })) as ChatMessage[];
    },
    refetchInterval: 5000,
    staleTime: 5000,
  });

  const activeKey = activeDm ? `dm-${activeDm}` : activeChannel;
  const currentMessages = activeChannel.startsWith("client-") || activeDm ? serverMessages : (channelMessages[activeKey] || []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    if (activeChannel.startsWith("client-") || activeDm) {
      try {
        const payload: any = { message: messageText.trim(), thread_type: "direct" };
        if (activeDm) {
          const dmUser = podData?.members?.find((m) => (m.name || m.full_name) === activeDm);
          if (dmUser?.id) {
            payload.recipient_id = dmUser.id;
          }
        } else {
          payload.channel = activeChannel;
          payload.client_id = activeClientId;
        }

        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessageText("");
        setShowEmojiPicker(false);
        refetchServerMessages();
        return;
      } catch (err: any) {
        showToast(err?.message || "Failed to send message", "info");
        return;
      }
    }

    const senderRole =
      user?.role === "admin" || user?.role === "super_admin"
        ? "Operations Executive"
        : user?.role === "team_lead"
        ? `${podName} Lead`
        : user?.role === "client"
        ? "Client Representative"
        : "Specialist";

    const senderInitials = (currentPersona || "TM")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: currentPersona,
      role: senderRole,
      avatar: senderInitials,
      avatarBg: "bg-[#7FA0D6]",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reactions: [],
    };

    const updated = {
      ...channelMessages,
      [activeKey]: [...(channelMessages[activeKey] || []), newMsg],
    };

    broadcastUpdate(updated);
    setMessageText("");
    setShowEmojiPicker(false);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    const msgs = channelMessages[activeKey] || [];
    const updatedMsgs = msgs.map((m) => {
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

    const updated = {
      ...channelMessages,
      [activeKey]: updatedMsgs,
    };
    broadcastUpdate(updated);
  };

  const handleConfirmAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignTaskModalOpen(false);

    const resolvedClient = taskClient || podData?.clients?.[0]?.name || "Client";
    const resolvedAssignee = taskAssignee || podData?.members?.[0]?.name || "Specialist";
    const resolvedTitle = taskTitle || "Sprint Asset Delivery";

    const senderRole =
      user?.role === "team_lead"
        ? `${podName} Lead`
        : user?.role === "admin" || user?.role === "super_admin"
        ? "Operations Executive"
        : "Specialist";

    const senderInitials = (currentPersona || "TM")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const taskMsg: ChatMessage = {
      id: `task-${Date.now()}`,
      sender: currentPersona,
      role: senderRole,
      avatar: senderInitials,
      avatarBg: "bg-[#7FA0D6]",
      content: `⚡ New Task Assigned: **${resolvedTitle}** assigned to **${resolvedAssignee}** for **${resolvedClient}**!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTaskCard: true,
      taskData: {
        id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
        title: resolvedTitle,
        assignee: resolvedAssignee,
        client: resolvedClient,
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

    showToast(`Assigned task "${resolvedTitle}" to ${resolvedAssignee}! Posted to #${activeChannel}.`);
    setTaskTitle("");
  };

  const channels = [
    { id: "general", label: "general", desc: `${podName} daily standup & team banter` },
    { id: "deliverables-handoff", label: "deliverables-handoff", desc: "Master asset sync & drops" },
    { id: "urgent-escalations", label: "urgent-escalations", desc: "SLA priority alert queue" },
    ...(isOpsOrSuperAdmin ? (clientRoster || []) : (podData?.clients || [])).map((c) => ({
      id: `client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      label: `client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      desc: isOpsOrSuperAdmin && 'pod_name' in c ? `${c.name} (${c.pod_name})` : `${c.name} pod communication`,
      badge: isOpsOrSuperAdmin && 'pod_name' in c ? c.pod_name : undefined,
    })),
  ];

  return (
    <div data-surface="ops" className="h-screen max-h-screen bg-nebula-navy text-white font-sans flex flex-col overflow-hidden">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="Slack" />

      {/* Main Slack Layout (Sidebar + Chat Area) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 min-h-0 flex flex-col md:flex-row max-w-[1650px] w-full mx-auto px-2 sm:px-6 py-2 sm:py-4 gap-3 sm:gap-4 overflow-hidden pb-2 md:pb-4"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 sm:right-8 z-[9999] p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xl animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-blue-300"
                : "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
            }`}
          >
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. SLACK LEFT SIDEBAR (Compact Fixed Width & Equal Height) */}
        <aside
          className={`${
            mobileView === "channels" ? "flex w-full" : "hidden md:flex"
          } md:w-72 lg:w-80 shrink-0 min-w-0 bg-nebula-surface text-slate-300 rounded-2xl sm:rounded-3xl flex flex-col shadow-xl border border-nebula-steel overflow-hidden h-full min-h-0`}
        >
          {/* Workspace Title & Persona Switcher */}
          <div className="p-4 border-b border-nebula-steel bg-nebula-navy/80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-md bg-[#7FA0D6]" />
                <span className="font-black text-sm text-white tracking-tight">Creo Slack Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live {podName}
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

            {/* Authenticated User Identity (Strict - No Role Switching) */}
            <div className="p-2.5 rounded-xl bg-nebula-surface border border-nebula-steel flex items-center gap-2">
              <div className="size-6 rounded-lg bg-[#7FA0D6] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                {currentPersona.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate">{currentPersona}</div>
                <div className="text-[10px] font-bold text-nebula-glow truncate">
                  {user?.role === "admin" || user?.role === "super_admin"
                    ? "Operations Executive (Admin)"
                    : user?.role === "team_lead"
                    ? `${podName} Lead`
                    : user?.role === "client"
                    ? "Client Representative"
                    : "Creative Specialist"}
                </div>
              </div>
            </div>
          </div>

          {/* Channels & DMs List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Quick Task Assign Button in Sidebar */}
            <button
              onClick={() => setAssignTaskModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="size-4" />
              Assign Task in Chat
            </button>

            {/* Channels Section */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-nebula-mist flex items-center justify-between">
                <span>Channels</span>
                <span className="text-nebula-mist">{channels.length}</span>
              </div>

              {channels.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChannel(c.id);
                    setActiveDm(null);
                    setMobileView("chat");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                    activeChannel === c.id && !activeDm
                      ? "bg-[#7FA0D6] text-white shadow-xs font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Hash className="size-3.5 opacity-70" />
                  <span className="truncate flex-1">{c.label}</span>
                  {c.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-nebula-surface/50 text-nebula-mist border border-nebula-steel">
                      {c.badge}
                    </span>
                  )}
                  <ChevronRight className="size-3.5 opacity-40 md:hidden" />
                </button>
              ))}
            </div>

            {/* Direct Messages Section */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-nebula-mist">
                Direct Messages
              </div>

              {(!podData?.members || podData.members.length === 0) ? (
                <div className="px-3 py-2 text-[11px] text-nebula-mist">
                  No specialists in pod
                </div>
              ) : (
                podData.members.map((dm) => {
                  const displayName = dm.name || dm.full_name || "Specialist";
                  return (
                    <button
                      key={dm.id}
                      onClick={() => {
                        setActiveDm(displayName);
                        setMobileView("chat");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                        activeDm === displayName
                          ? "bg-[#7FA0D6] text-white font-black"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-5 rounded-md bg-[#7FA0D6] text-white font-black text-[9px] flex items-center justify-center shrink-0">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate text-xs">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        <ChevronRight className="size-3.5 opacity-40 md:hidden text-nebula-mist" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active User Footer in Sidebar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2.5 mt-auto shrink-0">
            <div className="size-8 rounded-xl bg-[#7FA0D6] text-white font-black text-xs flex items-center justify-center shadow-xs">
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

        {/* 2. SLACK MAIN CHAT AREA (Fills Remaining Space) */}
        <section
          className={`${
            mobileView === "chat" ? "flex w-full" : "hidden md:flex"
          } flex-1 min-w-0 bg-nebula-surface rounded-2xl sm:rounded-3xl border border-nebula-steel shadow-xl flex flex-col overflow-hidden h-full min-h-0`}
        >
          {/* Header Bar */}
          <div className="px-3 sm:px-6 py-3 border-b border-nebula-steel flex items-center justify-between bg-nebula-surface gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Back button on mobile to view channel list */}
              <button
                type="button"
                onClick={() => setMobileView("channels")}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-nebula-surface hover:bg-slate-200 text-[#F1F5F9] font-bold text-xs shrink-0 transition-colors cursor-pointer"
                title="View Channels"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden xs:inline">Channels</span>
              </button>

              <div className="size-8 sm:size-9 rounded-xl sm:rounded-2xl bg-[#7FA0D6]/15 text-nebula-glow flex items-center justify-center font-black shrink-0">
                {activeDm ? <User className="size-4" /> : <Hash className="size-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    {activeDm ? activeDm : `#${activeChannel}`}
                  </h2>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-nebula-surface text-[#F1F5F9] shrink-0">
                    {activeDm ? "DM" : "Channel"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-nebula-mist truncate hidden sm:block">
                  {activeDm
                    ? `Direct communication thread with ${activeDm}`
                    : `Live sprint channel for ${podName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Assign Task Button in Header */}
              <button
                onClick={() => setAssignTaskModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-nebula-glow font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Assign Task</span>
                <span className="sm:hidden">Task</span>
              </button>

              <button
                onClick={() => setCallModalOpen(true)}
                className="size-8 sm:size-9 rounded-xl bg-nebula-surface hover:bg-slate-700 text-[#F1F5F9] flex items-center justify-center cursor-pointer transition-colors"
                title="Start Video Huddle"
              >
                <Video className="size-3.5 sm:size-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-nebula-navy/90 backdrop-blur-xl flex flex-col">
            {currentMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="size-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  {activeDm ? <MessageSquare className="size-7" /> : <Hash className="size-7" />}
                </div>
                <h3 className="text-base font-black text-white">
                  {activeDm ? `Conversation with ${activeDm}` : `Welcome to #${activeChannel}`}
                </h3>
                <p className="text-xs text-nebula-mist max-w-sm mt-1">
                  {activeDm
                    ? `This is the beginning of your direct message history with ${activeDm}. Send a message or assign a task.`
                    : `This is the start of the #${activeChannel} channel for ${podName}. Post updates, drop deliverables, or assign sprint tasks.`}
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative p-3 sm:p-3.5 rounded-2xl hover:bg-nebula-surface/90 border border-transparent hover:border-nebula-steel transition-all flex items-start gap-2.5 sm:gap-3.5"
                >
                  {/* Avatar */}
                  <div className={`size-8 sm:size-10 rounded-xl sm:rounded-2xl ${msg.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                    {msg.avatar}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-xs font-black text-white">{msg.sender}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-nebula-mist bg-nebula-surface px-1.5 sm:px-2 py-0.5 rounded-md">
                        {msg.role}
                      </span>
                      <span className="text-[10px] text-nebula-mist ml-auto">{msg.timestamp}</span>
                    </div>

                    {/* Message Content */}
                    <div className="text-xs text-[#F1F5F9] leading-relaxed font-medium break-words">
                      {msg.content}
                    </div>

                    {/* Task Card Embedded in Chat */}
                    {msg.isTaskCard && msg.taskData && (
                      <div className="mt-2.5 p-3.5 sm:p-4 rounded-2xl bg-nebula-surface border border-[#7FA0D6]/30 shadow-sm hover-card-innovative space-y-2.5 w-full max-w-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-nebula-glow bg-[#7FA0D6]/20 px-2 py-0.5 rounded">
                            {msg.taskData.id}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              msg.taskData.priority === "P1 High"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-[#7FA0D6]/20 text-nebula-glow"
                            }`}
                          >
                            {msg.taskData.priority}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-white">{msg.taskData.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#F1F5F9] mt-1">
                            <span>👤 Assignee: <strong>{msg.taskData.assignee}</strong></span>
                            <span>•</span>
                            <span>🏢 Client: <strong>{msg.taskData.client}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-nebula-steel text-[10px] font-bold text-nebula-mist">
                          <span>Due: {msg.taskData.deadline}</span>
                          <span className="text-emerald-400">● {msg.taskData.status}</span>
                        </div>
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleAddReaction(msg.id, r.emoji)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                            r.users.includes(currentPersona)
                              ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                              : "bg-nebula-surface border-nebula-steel text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}

                      {/* WhatsApp Floating Reaction Bar on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5 ml-2 bg-nebula-navy border border-nebula-steel rounded-full px-1.5 py-0.5 shadow-lg">
                        {["👍", "❤️", "😂", "😮", "😢", "🙏", "🚀", "🔥"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="size-6 rounded-full hover:bg-nebula-surface flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setPickerTargetMsgId(msg.id);
                            setShowEmojiPicker(true);
                          }}
                          className="size-5.5 rounded-full bg-nebula-surface hover:bg-[#7FA0D6] hover:text-white text-nebula-mist border border-nebula-steel flex items-center justify-center text-xs font-bold transition-all cursor-pointer ml-0.5"
                          title="Choose any WhatsApp emoji reaction"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Bar */}
          <div className="p-3 sm:p-4 border-t border-nebula-steel bg-nebula-surface relative shrink-0 mt-auto">
            {/* FULL WHATSAPP EMOJI PICKER POPOVER */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 right-2 sm:right-4 z-50 w-[92vw] max-w-sm sm:w-96 bg-nebula-surface border border-nebula-steel rounded-3xl p-3 sm:p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-nebula-steel">
                  <div className="flex items-center gap-2">
                    <Smile className="size-4 text-nebula-glow" />
                    <span className="text-xs font-black text-white">
                      {pickerTargetMsgId ? "React with Emoji" : "WhatsApp Emoji Suite"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(false);
                      setPickerTargetMsgId(null);
                    }}
                    className="text-nebula-mist hover:text-white text-xs font-bold p-1 rounded hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Emoji Search Box */}
                <div className="relative mb-2.5">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-nebula-mist" />
                  <input
                    type="text"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    placeholder="Search 200+ emojis..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-nebula-navy border border-nebula-steel rounded-xl text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                  {emojiSearch && (
                    <button
                      onClick={() => setEmojiSearch("")}
                      className="absolute right-2.5 top-2 text-[10px] text-nebula-mist hover:text-white"
                    >
                      clear
                    </button>
                  )}
                </div>

                {/* WhatsApp Category Navigation Tabs */}
                {!emojiSearch && (
                  <div className="flex items-center justify-between gap-1 pb-2 border-b border-nebula-steel overflow-x-auto no-scrollbar mb-2">
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEmojiCategory(cat.id)}
                        className={`p-1.5 rounded-xl text-sm transition-all cursor-pointer ${
                          emojiCategory === cat.id
                            ? "bg-[#7FA0D6] text-white shadow-xs font-bold scale-110"
                            : "hover:bg-slate-800 text-slate-400"
                        }`}
                        title={cat.name}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji Grid Display */}
                <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto pr-1">
                  {((emojiSearch.trim()
                    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(emojiSearch.trim()))
                    : (EMOJI_CATEGORIES.find((c) => c.id === emojiCategory) || EMOJI_CATEGORIES[0])!.emojis)
                  ).length === 0 ? (
                    <div className="col-span-8 py-6 text-center text-xs text-nebula-mist">
                      No matching emojis found
                    </div>
                  ) : (
                    (emojiSearch.trim()
                      ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(emojiSearch.trim()))
                      : (EMOJI_CATEGORIES.find((c) => c.id === emojiCategory) || EMOJI_CATEGORIES[0])!.emojis
                    ).map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (pickerTargetMsgId) {
                            handleAddReaction(pickerTargetMsgId, emoji);
                            setPickerTargetMsgId(null);
                            setShowEmojiPicker(false);
                          } else {
                            setMessageText((prev) => prev + emoji);
                          }
                        }}
                        className="size-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg transition-transform active:scale-125 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message #${activeChannel}...`}
                  className="w-full bg-nebula-navy border border-nebula-steel rounded-2xl pl-4 pr-32 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FA0D6] transition-colors"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="p-1.5 text-nebula-mist hover:text-nebula-glow rounded-lg transition-colors cursor-pointer"
                    title="Add Emoji (WhatsApp)"
                  >
                    <Smile className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("Attachment upload ready", "info")}
                    className="p-1.5 text-nebula-mist hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Attach file"
                  >
                    <Paperclip className="size-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="p-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 disabled:opacity-40 text-white transition cursor-pointer"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </motion.div>

      {/* MODAL: ASSIGN TASK IN CHAT */}
      {assignTaskModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setAssignTaskModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-nebula-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-nebula-steel space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-nebula-steel">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-nebula-glow" />
                <h3 className="text-base font-black text-white">Assign Task in Chat</h3>
              </div>
              <button onClick={() => setAssignTaskModalOpen(false)} className="text-nebula-mist hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Hero Kinetic Reel Animation"
                  className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-bold bg-nebula-navy text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Assignee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-semibold bg-nebula-navy text-white"
                  >
                    {(!podData?.members || podData.members.length === 0) ? (
                      <option value="">No specialists registered</option>
                    ) : (
                      podData.members.map((m) => {
                        const name = m.name || m.full_name || "Specialist";
                        return (
                          <option key={m.id} value={name}>
                            {name} ({m.role})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Client Pod</label>
                  <select
                    value={taskClient}
                    onChange={(e) => setTaskClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-semibold bg-nebula-navy text-white"
                  >
                    {(!podData?.clients || podData.clients.length === 0) ? (
                      <option value="">No clients assigned</option>
                    ) : (
                      podData.clients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-bold bg-nebula-navy text-white"
                  >
                    <option value="P1 High">P1 High (Urgent SLA)</option>
                    <option value="P2 Med">P2 Medium</option>
                    <option value="P3 Normal">P3 Normal Sprint</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Delivery Deadline</label>
                  <input
                    type="text"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-bold bg-nebula-navy text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Task Scope & Delivery Notes</label>
                <textarea
                  rows={3}
                  value={taskScope}
                  onChange={(e) => setTaskScope(e.target.value)}
                  placeholder="Add scope details or technical requirements..."
                  className="w-full px-3 py-2 rounded-xl border border-nebula-steel font-medium bg-nebula-navy text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-nebula-steel">
                <button
                  type="button"
                  onClick={() => setAssignTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-nebula-steel font-bold text-[#F1F5F9] hover:bg-nebula-navy cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer"
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
            className="w-full max-w-md bg-nebula-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-nebula-steel space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-[#7FA0D6]/15 text-nebula-glow flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Start #{activeChannel} Huddle</h3>
              <p className="text-xs text-nebula-mist mt-1">
                Instantly connect with everyone active in this channel via HD video & screen share.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-nebula-steel">
              <button
                type="button"
                onClick={() => setCallModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-nebula-steel font-bold text-xs text-[#F1F5F9] hover:bg-nebula-navy cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCallModalOpen(false);
                  showToast(`Started video huddle in #${activeChannel}!`);
                }}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
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
