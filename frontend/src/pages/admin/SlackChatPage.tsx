import { NativeSelect } from "../../ui/NativeSelect";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Send,
  Paperclip,
  Video,
  Sparkles,
  X,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Smile,
  Search,
  Shield,
  Crown,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { request } from "../../lib/http";
import { useLocation, useSearchParams } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

interface ChatContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  is_super_admin?: boolean;
  is_client?: boolean;
  online?: boolean;
}

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
  const queryClient = useQueryClient();
  const isClient = user?.role === "client";
  const [searchParams] = useSearchParams();
  const urlDm = searchParams.get("dm");

  // Fetch DM contacts from backend
  const { data: serverContacts = [] } = useQuery<ChatContact[]>({
    queryKey: ["chat_contacts", user?.id],
    queryFn: () => request<ChatContact[]>("/api/v1/chat/contacts"),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  // Fallback contacts if offline or before loading
  const fallbackContacts: ChatContact[] = useMemo(() => {
    return [
      {
        id: "646f6d6e-3479-42c5-b275-9fcd212453f6",
        name: "Creo Super Admin",
        role: "Super Admin & Executive Support",
        email: "admin@creo.agency",
        is_super_admin: true,
        online: true,
      },
      {
        id: "00000000-0000-0000-0000-0000000000b1",
        name: "Sarah Connor (Lead - Pod B)",
        role: "Team Lead & Account Director",
        email: "lead.beta@creo.agency",
        online: true,
      },
      {
        id: "00000000-0000-0000-0000-0000000000b2",
        name: "David Kim (Editor - Pod B)",
        role: "Lead Video Editor (Reels & Motion)",
        email: "editor.beta@creo.agency",
        online: true,
      },
      {
        id: "00000000-0000-0000-0000-0000000000b3",
        name: "Elena Rostova (Designer - Pod B)",
        role: "Lead Graphic Designer (Posters & Carousels)",
        email: "designer.beta@creo.agency",
        online: true,
      },
    ];
  }, []);

  const contactsList: ChatContact[] = useMemo(() => {
    if (serverContacts && serverContacts.length > 0) {
      return serverContacts;
    }
    return fallbackContacts;
  }, [serverContacts, fallbackContacts]);

  // Active contact selection
  const [activeContactId, setActiveContactId] = useState<string>(() => {
    if (urlDm) {
      const match = contactsList.find(
        (c) =>
          c.id === urlDm ||
          c.name.toLowerCase().includes(urlDm.toLowerCase()) ||
          (urlDm.toLowerCase() === "super-admin" && c.is_super_admin)
      );
      if (match) return match.id;
    }
    return contactsList[0]?.id || "646f6d6e-3479-42c5-b275-9fcd212453f6";
  });

  // Sync activeContactId if URL param changes or contacts load
  useEffect(() => {
    if (urlDm && contactsList.length > 0) {
      const match = contactsList.find(
        (c) =>
          c.id === urlDm ||
          c.name.toLowerCase().includes(urlDm.toLowerCase()) ||
          (urlDm.toLowerCase() === "super-admin" && c.is_super_admin)
      );
      if (match) {
        setActiveContactId(match.id);
      }
    } else if (!activeContactId && contactsList.length > 0 && contactsList[0]?.id) {
      setActiveContactId(contactsList[0].id);
    }
  }, [urlDm, contactsList, activeContactId]);

  const activeContact = useMemo(() => {
    return (
      contactsList.find((c) => c.id === activeContactId) ||
      contactsList[0] || {
        id: "646f6d6e-3479-42c5-b275-9fcd212453f6",
        name: "Creo Super Admin",
        role: "Super Admin & Executive Support",
        is_super_admin: true,
        online: true,
      }
    );
  }, [contactsList, activeContactId]);

  // Mobile view toggle ('channels' or 'chat')
  const [mobileView, setMobileView] = useState<"channels" | "chat">("chat");

  const defaultPersona = user?.full_name || user?.email?.split("@")[0] || "Team Member";
  const [currentPersona, setCurrentPersona] = useState<string>(defaultPersona);

  useEffect(() => {
    if (user?.full_name) {
      setCurrentPersona(user.full_name);
    }
  }, [user?.full_name]);

  // Search input for contacts
  const [contactSearch, setContactSearch] = useState("");

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contactsList;
    const q = contactSearch.toLowerCase();
    return contactsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contactsList, contactSearch]);

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
  const [taskPriority, setTaskPriority] = useState<"P1 High" | "P2 Med" | "P3 Normal">("P1 High");
  const [taskDeadline, setTaskDeadline] = useState("Today by 05:00 PM PST");
  const [taskScope, setTaskScope] = useState("");
  const [callModalOpen, setCallModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Local reactions store
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string; count: number; users: string[] }[]>>({});

  // 1-on-1 Messages Query (Live Polling every 1000ms with background sync)
  const { data: serverMessages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["chat_messages", activeContact?.id],
    queryFn: async () => {
      if (!activeContact?.id) return [];
      const res = await request<any[]>(`/api/v1/chat/messages?other_user_id=${activeContact.id}`);
      return (res || []).map((m: any) => {
        const isSelf = m.sender_id === user?.id;
        const senderName = isSelf ? (user?.full_name || "You") : (m.sender_name || activeContact.name);
        const senderRole = isSelf
          ? (user?.role === "super_admin" || user?.role === "admin"
              ? "Super Admin"
              : user?.role === "client"
              ? (user?.company_name || "Client")
              : "Specialist")
          : activeContact.role;

        return {
          id: m.id,
          sender: senderName,
          role: senderRole,
          avatar: (senderName || "U").slice(0, 2).toUpperCase(),
          avatarBg: isSelf ? "bg-[#7FA0D6]" : (activeContact.is_super_admin ? "bg-amber-500" : "bg-[#64748B]"),
          content: m.message,
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: messageReactions[m.id] || [],
        };
      });
    },
    enabled: !!activeContact?.id,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // WebSocket Live Real-Time Connection
  useEffect(() => {
    if (!user?.id) return;

    let ws: WebSocket | null = null;
    let pingInterval: any = null;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      ws = new WebSocket(`${protocol}//${host}/api/v1/chat/ws/${user.id}`);

      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_MESSAGE") {
            queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
            refetchMessages();
          }
        } catch {
          // ignore pong
        }
      };

      ws.onerror = () => {
        // Fallback to polling
      };
    } catch {
      // Fallback to polling
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [user?.id, queryClient, refetchMessages]);

  // BroadcastChannel multi-tab instant sync
  useEffect(() => {
    try {
      const bc = new BroadcastChannel("creo_chat_channel");
      bc.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
        refetchMessages();
      };
      return () => {
        bc.close();
      };
    } catch {
      // BroadcastChannel fallback
    }
  }, [queryClient, refetchMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [serverMessages, activeContact?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeContact?.id) return;

    const text = messageText.trim();
    setMessageText("");
    setShowEmojiPicker(false);

    try {
      await request("/api/v1/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: activeContact.id,
          message: text,
          thread_type: "direct",
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["chat_messages", activeContact.id] });
      refetchMessages();

      try {
        const bc = new BroadcastChannel("creo_chat_channel");
        bc.postMessage({ type: "NEW_MESSAGE", timestamp: Date.now() });
        bc.close();
      } catch {
        // BroadcastChannel fallback
      }
    } catch (err: any) {
      console.error("Message send error:", err);
      showToast(err?.message || "Failed to send message. Please retry.", "info");
    }
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existing = prev[msgId] || [];
      const match = existing.find((r) => r.emoji === emoji);
      let updated: { emoji: string; count: number; users: string[] }[];
      if (match) {
        if (match.users.includes(currentPersona)) {
          updated = existing
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentPersona) }
                : r
            )
            .filter((r) => r.count > 0);
        } else {
          updated = existing.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...r.users, currentPersona] }
              : r
          );
        }
      } else {
        updated = [...existing, { emoji, count: 1, users: [currentPersona] }];
      }
      return { ...prev, [msgId]: updated };
    });
  };

  const handleConfirmAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignTaskModalOpen(false);

    const resolvedTitle = taskTitle || "Priority Sprint Request";
    const taskContent = `⚡ New Sprint Task: **${resolvedTitle}**\n- Priority: ${taskPriority}\n- Due: ${taskDeadline}${taskScope ? `\n- Scope: ${taskScope}` : ""}`;

    try {
      await request("/api/v1/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: activeContact.id,
          message: taskContent,
          thread_type: "direct",
        }),
      });
      refetchMessages();
      showToast(`Task "${resolvedTitle}" sent directly to ${activeContact.name}!`);
      setTaskTitle("");
      setTaskScope("");
    } catch (err) {
      showToast("Could not assign task", "info");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] min-h-[550px] overflow-hidden -mx-4 sm:-mx-6 -my-6 sm:-my-8">
      {/* ── Top Header Context Bar ── */}
      <AdminTopHeader
        title="Direct Chat Hub"
        activeTab="Direct Chat"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-8 z-[99999] bg-[#161F2D]/90 backdrop-blur-xl border border-[#7FA0D6]/40 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2">
          <Sparkles className="size-4 text-[#7FA0D6]" />
          <span className="font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Slack Hub Shell */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 min-h-0"
      >
        {/* 1. DIRECT MESSAGES SIDEBAR (GLASSMORPHIC) */}
        <aside
          className={`${
            mobileView === "channels" ? "flex w-full" : "hidden md:flex"
          } md:w-80 lg:w-88 flex-col shrink-0 bg-[#0B111C]/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl h-full max-h-full min-h-0`}
        >
          {/* Top Brand Bar */}
          <div className="p-3.5 border-b border-white/[0.08] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-gradient-to-br from-[#7FA0D6] to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <MessageSquare className="size-3.5" />
                </div>
                <div>
                  <span className="font-black text-sm text-white tracking-tight block">Creo Chat Hub</span>
                  <span className="text-[10px] text-[#97A0B3] block -mt-0.5">Direct 1-on-1 Channels</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 backdrop-blur-sm text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
                {mobileView === "channels" && (
                  <button
                    onClick={() => setMobileView("chat")}
                    className="md:hidden text-xs font-bold text-[#7FA0D6] hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
                  >
                    Open &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Authenticated User Identity */}
            <div className="p-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex items-center gap-2.5 shadow-sm">
              <div className="size-7 rounded-lg bg-gradient-to-br from-[#7FA0D6] to-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                {currentPersona.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate">{currentPersona}</div>
                <div className="text-[10px] font-bold text-[#7FA0D6] truncate">
                  {user?.role === "super_admin"
                    ? "Super Admin · Executive"
                    : user?.role === "admin"
                    ? "Operations Executive"
                    : user?.role === "team_lead"
                    ? "Pod Lead"
                    : user?.role === "client"
                    ? (user?.company_name ? `${user.company_name} · Client` : "Client")
                    : "Creative Specialist"}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Message Super Admin Button for Clients (Glassmorphism) */}
          {isClient && (
            <div className="px-3 pt-3 shrink-0">
              <button
                onClick={() => {
                  const sa = contactsList.find((c) => c.is_super_admin) || contactsList[0];
                  if (sa) {
                    setActiveContactId(sa.id);
                    setMobileView("chat");
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-md ${
                  activeContact?.is_super_admin
                    ? "bg-gradient-to-r from-amber-500/25 via-amber-600/15 to-orange-500/10 backdrop-blur-xl border border-amber-400/50 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40"
                    : "bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] text-white border border-amber-500/25 hover:border-amber-400/50 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30">
                    <Crown className="size-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black text-white">Chat with Super Admin</span>
                    <span className="block text-[10px] text-amber-300/80 font-medium">Executive Support</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40 backdrop-blur-xs">
                  Priority
                </span>
              </button>
            </div>
          )}

          {/* Search Contacts Filter (Glassmorphic) */}
          <div className="p-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-2.5 text-[#97A0B3]" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]/60 transition-colors"
              />
              {contactSearch && (
                <button
                  onClick={() => setContactSearch("")}
                  className="absolute right-2.5 top-2 text-[10px] text-[#97A0B3] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Direct Messages List (Glassmorphic Contact Cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 text-xs">
            <div className="px-2 text-[10px] font-black uppercase tracking-wider text-[#97A0B3] flex items-center justify-between pb-1">
              <span>Direct Messages</span>
              <span className="text-[#97A0B3]">{filteredContacts.length}</span>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="px-3 py-6 text-center text-[#97A0B3] text-xs">
                No matching contacts
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = activeContactId === contact.id;
                const isSA = contact.is_super_admin;
                const initials = contact.name
                  .split(" ")
                  .filter((w) => w.length > 0)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setActiveContactId(contact.id);
                      setMobileView("chat");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? isSA
                          ? "bg-gradient-to-r from-amber-500/25 via-amber-600/15 to-transparent backdrop-blur-xl border border-amber-400/50 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30"
                          : "bg-gradient-to-r from-[#7FA0D6]/25 via-blue-500/15 to-transparent backdrop-blur-xl border border-[#7FA0D6]/50 text-white shadow-[0_0_20px_rgba(127,160,214,0.2)] ring-1 ring-[#7FA0D6]/30"
                        : isSA
                        ? "bg-amber-500/[0.06] backdrop-blur-md text-white hover:bg-amber-500/[0.12] border border-amber-500/20"
                        : "text-slate-300 hover:bg-white/[0.04] backdrop-blur-xs hover:text-white border border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-transform ${
                          isSA
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 shadow-md shadow-amber-500/25"
                            : isSelected
                            ? "bg-gradient-to-br from-[#7FA0D6] to-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "bg-white/[0.06] backdrop-blur-md text-white border border-white/10"
                        }`}
                      >
                        {isSA ? <Crown className="size-4" /> : initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs block font-bold text-white">
                            {contact.name}
                          </span>
                          {isSA && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[8px] uppercase font-black shrink-0 bg-amber-400/20 text-amber-300 border border-amber-400/40 backdrop-blur-xs"
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] truncate block text-[#97A0B3]">
                          {contact.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`size-2 rounded-full ${isSelected ? "bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse" : "bg-emerald-400/70"}`} />
                      <ChevronRight className="size-3.5 opacity-40 md:hidden text-[#97A0B3]" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active User Footer in Sidebar (Glassmorphic) */}
          <div className="p-3 border-t border-white/[0.08] bg-white/[0.02] backdrop-blur-md flex items-center gap-2.5 mt-auto shrink-0">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[#7FA0D6] to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
              {currentPersona.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate">{currentPersona}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active in workspace
              </div>
            </div>
          </div>
        </aside>

        {/* 2. DIRECT CHAT MAIN AREA (GLASSMORPHIC) */}
        <section
          className={`${
            mobileView === "chat" ? "flex w-full" : "hidden md:flex"
          } flex-1 min-w-0 bg-[#161F2D]/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden h-full max-h-full min-h-0`}
        >
          {/* Header Bar */}
          <div className="px-3 sm:px-6 py-3.5 border-b border-[#2A3446] flex items-center justify-between bg-[#161F2D] gap-2 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              {/* Back button on mobile to view contact list */}
              <button
                type="button"
                onClick={() => setMobileView("channels")}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-[#F1F5F9] font-bold text-xs shrink-0 transition-colors cursor-pointer"
                title="View Contacts"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden xs:inline">Contacts</span>
              </button>

              <div
                className={`size-9 sm:size-10 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                  activeContact?.is_super_admin
                    ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20"
                    : "bg-[#7FA0D6] text-[#0B111C]"
                }`}
              >
                {activeContact?.is_super_admin ? (
                  <Crown className="size-5" />
                ) : (
                  (activeContact?.name || "U").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    {activeContact?.name || "Select Contact"}
                  </h2>
                  {activeContact?.is_super_admin ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                      <Shield className="size-3" />
                      SUPER ADMIN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B111C] text-[#7FA0D6] shrink-0">
                      Direct 1-on-1
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-[#97A0B3] truncate flex items-center gap-2">
                  <span>{activeContact?.role}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Active
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick Task Assign Button (Internal team to client/lead) */}
              {!isClient && (
                <button
                  onClick={() => setAssignTaskModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span className="hidden sm:inline">Send Task</span>
                </button>
              )}

              <button
                onClick={() => setCallModalOpen(true)}
                className="size-8 sm:size-9 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] text-[#F1F5F9] border border-[#2A3446] flex items-center justify-center cursor-pointer transition-colors"
                title="Start 1-on-1 Call"
              >
                <Video className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 max-h-full overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-[#0B111C]/90 backdrop-blur-xl flex flex-col"
          >
            {serverMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div
                  className={`size-16 rounded-3xl flex items-center justify-center mb-4 border ${
                    activeContact?.is_super_admin
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-[#7FA0D6]/10 text-[#7FA0D6] border-[#7FA0D6]/20"
                  }`}
                >
                  {activeContact?.is_super_admin ? (
                    <Crown className="size-8" />
                  ) : (
                    <MessageSquare className="size-8" />
                  )}
                </div>
                <h3 className="text-base font-black text-white">
                  {activeContact?.is_super_admin
                    ? "Direct Channel with Creo Super Administration"
                    : `Direct Conversation with ${activeContact?.name}`}
                </h3>
                <p className="text-xs text-[#97A0B3] max-w-md mt-1.5 leading-relaxed">
                  {activeContact?.is_super_admin
                    ? "This is your private, direct thread with Creo Executive Super Administration. Inquire about your creative pod, retainer adjustments, SLA escalations, or custom requests."
                    : `This is the start of your direct 1-on-1 thread with ${activeContact?.name}. Drop project feedback, creative directions, or collaborate in real time.`}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#161F2D] text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live 2-Way Sync Active
                  </span>
                </div>
              </div>
            ) : (
              serverMessages.map((msg) => {
                const isUser = msg.sender === currentPersona || msg.sender === (user?.full_name || "You");
                return (
                  <div
                    key={msg.id}
                    className={`group relative p-3 sm:p-3.5 rounded-2xl transition-all flex items-start gap-2.5 sm:gap-3.5 ${
                      isUser
                        ? "bg-gradient-to-r from-[#7FA0D6]/10 via-blue-500/[0.05] to-transparent backdrop-blur-md border border-[#7FA0D6]/20 shadow-xs"
                        : "hover:bg-white/[0.03] backdrop-blur-xs border border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`size-8 sm:size-10 rounded-xl sm:rounded-2xl ${msg.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      {msg.avatar}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{msg.sender}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] bg-[#161F2D] px-1.5 sm:px-2 py-0.5 rounded-md">
                          {msg.role}
                        </span>
                        <span className="text-[10px] text-[#97A0B3] ml-auto">{msg.timestamp}</span>
                      </div>

                      {/* Message Content */}
                      <div className="text-xs text-[#F1F5F9] leading-relaxed font-medium break-words">
                        {msg.content}
                      </div>

                      {/* Reactions Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {msg.reactions.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddReaction(msg.id, r.emoji)}
                            className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                              r.users.includes(currentPersona)
                                ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                                : "bg-[#161F2D] border-[#2A3446] text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}

                        {/* WhatsApp Floating Reaction Bar on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5 ml-2 bg-[#0B111C] border border-[#2A3446] rounded-full px-1.5 py-0.5 shadow-lg">
                          {["👍", "❤️", "😂", "😮", "😢", "🙏", "🚀", "🔥"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="size-6 rounded-full hover:bg-[#161F2D] flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
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
                            className="size-5.5 rounded-full bg-[#161F2D] hover:bg-[#7FA0D6] hover:text-white text-[#97A0B3] border border-[#2A3446] flex items-center justify-center text-xs font-bold transition-all cursor-pointer ml-0.5"
                            title="Choose reaction"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Bar */}
          <div className="p-3 sm:p-4 border-t border-[#2A3446] bg-[#161F2D] relative shrink-0 mt-auto">
            {/* FULL WHATSAPP EMOJI PICKER POPOVER */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 right-2 sm:right-4 z-50 w-[92vw] max-w-sm sm:w-96 bg-[#161F2D] border border-[#2A3446] rounded-3xl p-3 sm:p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2A3446]">
                  <div className="flex items-center gap-2">
                    <Smile className="size-4 text-[#7FA0D6]" />
                    <span className="text-xs font-black text-white">
                      {pickerTargetMsgId ? "React with Emoji" : "Emoji Suite"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(false);
                      setPickerTargetMsgId(null);
                    }}
                    className="text-[#97A0B3] hover:text-white text-xs font-bold p-1 rounded hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Emoji Search Box */}
                <div className="relative mb-2.5">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-[#97A0B3]" />
                  <input
                    type="text"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    placeholder="Search 200+ emojis..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0B111C] border border-[#2A3446] rounded-xl text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                  {emojiSearch && (
                    <button
                      onClick={() => setEmojiSearch("")}
                      className="absolute right-2.5 top-2 text-[10px] text-[#97A0B3] hover:text-white"
                    >
                      clear
                    </button>
                  )}
                </div>

                {/* WhatsApp Category Navigation Tabs */}
                {!emojiSearch && (
                  <div className="flex items-center justify-between gap-1 pb-2 border-b border-[#2A3446] overflow-x-auto no-scrollbar mb-2">
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
                    <div className="col-span-8 py-6 text-center text-xs text-[#97A0B3]">
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
                  placeholder={`Message ${activeContact?.name || "Direct Message"}... (Enter to send)`}
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-2xl pl-4 pr-32 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FA0D6] transition-colors"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="p-1.5 text-[#97A0B3] hover:text-[#7FA0D6] rounded-lg transition-colors cursor-pointer"
                    title="Add Emoji"
                  >
                    <Smile className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("Attachment upload ready", "info")}
                    className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Attach file"
                  >
                    <Paperclip className="size-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="p-2 rounded-xl bg-[#7FA0D6] hover:bg-white text-[#0B111C] disabled:opacity-40 transition cursor-pointer font-bold"
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
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#7FA0D6]" />
                <h3 className="text-base font-black text-white">Send Task to {activeContact?.name}</h3>
              </div>
              <button onClick={() => setAssignTaskModalOpen(false)} className="text-[#97A0B3] hover:text-white">
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
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#0B111C] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Priority Level</label>
                  <NativeSelect
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#0B111C] text-white"
                  >
                    <option value="P1 High">P1 High (Urgent SLA)</option>
                    <option value="P2 Med">P2 Medium</option>
                    <option value="P3 Normal">P3 Normal Sprint</option>
                  </NativeSelect>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Delivery Deadline</label>
                  <input
                    type="text"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#0B111C] text-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium bg-[#0B111C] text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setAssignTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-white text-[#0B111C] font-black cursor-pointer shadow-md"
                >
                  Send Task in DM
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
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Start 1-on-1 Call</h3>
              <p className="text-xs text-[#97A0B3] mt-1">
                Direct connection with <strong>{activeContact?.name}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setCallModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCallModalOpen(false);
                  showToast(`Started direct call with ${activeContact?.name}!`);
                }}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-white text-[#0B111C] font-black text-xs shadow-md cursor-pointer"
              >
                Connect Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
