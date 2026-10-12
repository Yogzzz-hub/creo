import { NativeSelect } from "../../ui/NativeSelect";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Send,
  Paperclip,
  Sparkles,
  X,
  ArrowLeft,
  MessageSquare,
  Smile,
  Search,
  Shield,
  Crown,
  Hash,
  Users,
} from "lucide-react";
import { request } from "../../lib/http";
import { useSearchParams } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import { getAuthToken } from "../../lib/auth-token";

// WhatsApp & Modern Emoji Categories
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
      "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "💪", "🦾", "Middle", "✍️", "🫵", "🫶", "🫱", "🫲", "🫸",
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

interface WorkspaceChannel {
  id: string;
  label: string;
  desc: string;
  unreadCount?: number;
  isPodChannel?: boolean;
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

const SEED_WORKSPACE_MESSAGES: Record<string, ChatMessage[]> = {
  "all-pod-leads": [
    {
      id: "seed-leads-1",
      sender: "Creo Super Admin",
      role: "Super Admin",
      avatar: "SA",
      avatarBg: "bg-amber-500",
      content: "👑 Leadership Council Hub: All Pod Leads please sync daily sprint velocity, member capacities, and client escalations here.",
      timestamp: "08:45 AM",
      reactions: [{ emoji: "🚀", count: 3, users: ["Lead"] }],
    },
    {
      id: "seed-leads-2",
      sender: "Sarah Connor (Lead - Pod B)",
      role: "Team Lead & Account Director",
      avatar: "SC",
      avatarBg: "bg-[#7FA0D6]",
      content: "Pod Beta capacity report: 6 approved reel cuts in final color grade for client review by 3 PM.",
      timestamp: "09:05 AM",
      reactions: [{ emoji: "✅", count: 2, users: ["Admin"] }],
    },
  ],
  "pod-beta-team": [
    {
      id: "seed-pod-b-1",
      sender: "Sarah Connor (Lead - Pod B)",
      role: "Team Lead & Account Director",
      avatar: "SC",
      avatarBg: "bg-[#7FA0D6]",
      content: "⚡ Pod Beta Standup: @David Kim focusing on 4K reel grading, @Elena Rostova finishing carousel slides. Admin is monitoring priority handoffs.",
      timestamp: "09:15 AM",
      reactions: [{ emoji: "🔥", count: 4, users: ["Team"] }],
    },
    {
      id: "seed-pod-b-2",
      sender: "David Kim (Editor - Pod B)",
      role: "Lead Video Editor",
      avatar: "DK",
      avatarBg: "bg-[#7FA0D6]",
      content: "Sound design and kinetic subtitles rendered. Uploading master package now.",
      timestamp: "09:40 AM",
      reactions: [{ emoji: "👍", count: 2, users: ["Sarah Connor"] }],
    },
  ],
  "pod-alpha-team": [
    {
      id: "seed-pod-a-1",
      sender: "Alex Rivera (Lead - Pod A)",
      role: "Team Lead & Account Director",
      avatar: "AR",
      avatarBg: "bg-[#7FA0D6]",
      content: "Pod Alpha standup: Identity guidelines & typography tokens locked for enterprise client.",
      timestamp: "09:20 AM",
      reactions: [{ emoji: "✨", count: 2, users: ["Admin"] }],
    },
  ],
  "pod-gamma-team": [
    {
      id: "seed-pod-c-1",
      sender: "Marcus Vance (Lead - Pod C)",
      role: "Team Lead & Account Director",
      avatar: "MV",
      avatarBg: "bg-[#7FA0D6]",
      content: "Pod Gamma standup: 3D Blender sequences and octane lighting passes running on render farm.",
      timestamp: "09:30 AM",
      reactions: [{ emoji: "🎬", count: 3, users: ["Admin"] }],
    },
  ],
  general: [
    {
      id: "seed-gen-1",
      sender: "Sarah Connor (Lead - Pod B)",
      role: "Pod Lead",
      avatar: "SC",
      avatarBg: "bg-[#7FA0D6]",
      content: "👋 Good morning team! Standup update: All active client sprint deliverables are on track for today's review.",
      timestamp: "09:00 AM",
      reactions: [
        { emoji: "🚀", count: 3, users: ["Sarah Connor", "Admin"] },
        { emoji: "👍", count: 2, users: ["Specialist"] },
      ],
    },
    {
      id: "seed-gen-2",
      sender: "Creo Super Admin",
      role: "Super Admin",
      avatar: "SA",
      avatarBg: "bg-amber-500",
      content: "📢 Retainer & milestone review checkpoints are now active. Drop any priority requests directly in the channel or DM.",
      timestamp: "09:30 AM",
      reactions: [{ emoji: "✅", count: 4, users: ["Team Lead"] }],
    },
  ],
  "deliverables-handoff": [
    {
      id: "seed-del-1",
      sender: "David Kim (Editor - Pod B)",
      role: "Lead Video Editor",
      avatar: "DK",
      avatarBg: "bg-[#7FA0D6]",
      content: "📦 Handoff Drop: High-conversion reel assets and exported 4K masters are packaged and uploaded to the review portal.",
      timestamp: "10:30 AM",
      reactions: [{ emoji: "🔥", count: 3, users: ["Lead"] }],
    },
    {
      id: "seed-del-2",
      sender: "Elena Rostova (Designer - Pod B)",
      role: "Lead Graphic Designer",
      avatar: "ER",
      avatarBg: "bg-[#7FA0D6]",
      content: "🎨 Figma design system components and carousel slide deck exports ready for client approval.",
      timestamp: "11:15 AM",
      reactions: [{ emoji: "✨", count: 2, users: ["Lead"] }],
    },
  ],
  "urgent-escalations": [
    {
      id: "seed-urg-1",
      sender: "System Alert",
      role: "Automation Bot",
      avatar: "SB",
      avatarBg: "bg-rose-500",
      content: "⚡ SLA Monitor: Priority 1 deliverable review queue is currently clear. Excellent turnaround time across all pods!",
      timestamp: "11:00 AM",
      reactions: [{ emoji: "⭐", count: 2, users: ["Admin"] }],
    },
  ],
};

const LOCAL_STORAGE_CHANNEL_MESSAGES_KEY = "creo_slack_channels_v3";

export function SlackChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // User role classification
  const roleStr = (user?.role || "").toLowerCase();
  const isClient = roleStr === "client";
  const isTeamLead = roleStr === "team_lead" || roleStr === "lead";
  const isAdmin = ["admin", "super_admin", "ops_admin"].includes(roleStr);
  const isTeamMember = !isClient && !isTeamLead && !isAdmin;

  const [searchParams] = useSearchParams();
  const urlDm = searchParams.get("dm");
  const urlChannel = searchParams.get("channel");

  // Client pod channel slug
  const clientChannelSlug = useMemo(() => {
    if (user?.full_name) {
      return `client-${user.full_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    }
    if (user?.company_name) {
      return `client-${user.company_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    }
    return "client-kameshwari-rajkumar";
  }, [user]);

  // Channels definitions strictly filtered per user role:
  // - Client: ONLY their dedicated Pod Hub (#pod-creative-hub)
  // - Admin: Group with all leads (#all-pod-leads), each pod group with members, and agency channels
  // - TL: Group with all leads (#all-pod-leads), their own pod group (#pod-beta-team), and agency channels
  // - Team Members: Their own pod group (#pod-beta-team) with lead & admin, and agency channels
  const channelsList: WorkspaceChannel[] = useMemo(() => {
    const list: WorkspaceChannel[] = [];

    // 1. CLIENT: ONLY dedicated pod creative hub
    if (isClient) {
      list.push({
        id: clientChannelSlug,
        label: "pod-creative-hub",
        desc: "Your dedicated Creative Pod (Team Lead & Super Admin)",
        isPodChannel: true,
      });
      return list;
    }

    // 2. ADMIN: All Leads Group + Each Pod Group with members + Global agency channels
    if (isAdmin) {
      list.push({
        id: "all-pod-leads",
        label: "all-pod-leads",
        desc: "Leadership Council: Executive Admin & All Pod Leads",
        isPodChannel: true,
      });

      list.push(
        {
          id: "pod-alpha-team",
          label: "pod-alpha-team",
          desc: "Pod Alpha • Brand & Creative Design (Lead & Specialists)",
          isPodChannel: true,
        },
        {
          id: "pod-beta-team",
          label: "pod-beta-team",
          desc: "Pod Beta • Performance Video & Reels (Lead & Specialists)",
          isPodChannel: true,
        },
        {
          id: "pod-gamma-team",
          label: "pod-gamma-team",
          desc: "Pod Gamma • 3D Motion & CGI (Lead & Specialists)",
          isPodChannel: true,
        }
      );

      list.push(
        {
          id: "general",
          label: "general",
          desc: "Workspace standups, milestones, and announcements",
        },
        {
          id: "deliverables-handoff",
          label: "deliverables-handoff",
          desc: "Master asset sync, reel drops & Figma releases",
        },
        {
          id: "urgent-escalations",
          label: "urgent-escalations",
          desc: "SLA priority alert queue & executive requests",
        }
      );
      return list;
    }

    // 3. TEAM LEAD (TL): All Leads Group + Their Own Pod + Global agency channels
    if (isTeamLead) {
      list.push({
        id: "all-pod-leads",
        label: "all-pod-leads",
        desc: "Leadership Council: Executive Admin & All Pod Leads",
        isPodChannel: true,
      });

      list.push({
        id: "pod-beta-team",
        label: "pod-beta-team",
        desc: "Your Dedicated Pod Group (Team Lead, Specialists & Admin)",
        isPodChannel: true,
      });

      list.push(
        {
          id: "general",
          label: "general",
          desc: "Workspace standups, milestones, and announcements",
        },
        {
          id: "deliverables-handoff",
          label: "deliverables-handoff",
          desc: "Master asset sync, reel drops & Figma releases",
        },
        {
          id: "urgent-escalations",
          label: "urgent-escalations",
          desc: "SLA priority alert queue & executive requests",
        }
      );
      return list;
    }

    // 4. TEAM MEMBERS: Their Own Pod Group + Global channels
    if (isTeamMember) {
      list.push({
        id: "pod-beta-team",
        label: "pod-beta-team",
        desc: "Your Dedicated Pod Group (Team Lead, Specialists & Admin)",
        isPodChannel: true,
      });

      list.push(
        {
          id: "general",
          label: "general",
          desc: "Workspace standups, milestones, and announcements",
        },
        {
          id: "deliverables-handoff",
          label: "deliverables-handoff",
          desc: "Master asset sync, reel drops & Figma releases",
        }
      );
      return list;
    }

    return list;
  }, [isClient, isAdmin, isTeamLead, isTeamMember, clientChannelSlug]);

  // Fetch DM contacts from backend
  const contactsQuery = useQuery<ChatContact[]>({
    queryKey: ["chat_contacts", user?.id],
    queryFn: () => request<ChatContact[]>("/api/v1/chat/contacts"),
    enabled: !!user?.id && canUseChat,
    staleTime: 15_000,
  });

  // Fallback contacts strictly enforcing role permissions:
  // - Client: ONLY 2 CHATS (Admin & Pod Lead)
  // - TL: Admin & Clients
  // - Team Members: Admin ONLY
  // - Admin: All Pod Leads & Clients (NO other admin, NO individual members)
  const fallbackContacts: ChatContact[] = useMemo(() => {
    const superAdmin: ChatContact = {
      id: "646f6d6e-3479-42c5-b275-9fcd212453f6",
      name: "Creo Super Admin",
      role: "Super Admin & Executive Support",
      email: "admin@creo.agency",
      is_super_admin: true,
      online: true,
    };
    const teamLead: ChatContact = {
      id: "00000000-0000-0000-0000-0000000000b1",
      name: "Sarah Connor (Lead - Pod B)",
      role: "Team Lead & Account Director",
      email: "lead.beta@creo.agency",
      online: true,
    };
    const clientRep: ChatContact = {
      id: "1a5ef9ac-e43e-4fa0-918d-de31d44e8c7a",
      name: "Kameshwari Rajkumar",
      role: "Client",
      email: "kameshwari.r2824@gmail.com",
      is_client: true,
      online: true,
    };

    if (isClient) {
      // RULE 1: CLIENT ONLY MESSAGES TL AND ADMIN (2 CHATS)
      return [superAdmin, teamLead];
    }
    if (isTeamLead) {
      // RULE 2: TL MESSAGES ADMIN AND CLIENTS
      return [superAdmin, clientRep];
    }
    if (isTeamMember) {
      // RULE 3: TEAM MEMBERS MESSAGE ADMIN ONLY
      return [superAdmin];
    }
    // RULE 4: ADMIN MESSAGES ALL POD LEADS AND CLIENTS (NO ADMIN, NO MEMBERS)
    return [teamLead, clientRep];
  }, [isClient, isTeamLead, isTeamMember]);

  const contactsList: ChatContact[] = useMemo(() => {
    const rawList = serverContacts && serverContacts.length > 0 ? serverContacts : fallbackContacts;

    // Strict frontend filter ensuring no unauthorized contacts leak through
    return rawList
      .map((c) => ({
        ...c,
        role: (c.role || "").replace(/Client Representative/gi, "Client"),
      }))
      .filter((c) => {
        // Exclude self if somehow present
        if (c.id === user?.id || (c.email && c.email.toLowerCase() === (user?.email || "").toLowerCase())) {
          return false;
        }

        const cRole = (c.role || "").toLowerCase();
        const isTargetAdmin = Boolean(c.is_super_admin) || cRole.includes("admin");
        const isTargetTL = cRole.includes("lead") || cRole.includes("director");
        const isTargetClient = Boolean(c.is_client) || cRole.includes("client");

        if (isClient) {
          // CLIENT: EXACTLY 2 CHATS ONLY - ADMIN AND POD LEAD
          return isTargetAdmin || isTargetTL;
        }
        if (isTeamLead) {
          // TL: ADMIN AND CLIENTS
          return isTargetAdmin || isTargetClient;
        }
        if (isTeamMember) {
          // MEMBERS: ADMIN ONLY
          return isTargetAdmin;
        }
        if (isAdmin) {
          // ADMIN:
          // - REMOVE ADMIN (cannot chat with admin!)
          // - REMOVE INDIVIDUAL MEMBERS (collaborate in Pod Groups!)
          // - ONLY POD LEADS AND CLIENTS!
          if (isTargetAdmin) return false;
          return isTargetTL || isTargetClient;
        }
        return isTargetAdmin || isTargetTL;
      });
  }, [serverContacts, fallbackContacts, isClient, isTeamLead, isTeamMember, isAdmin, user]);

  // Selection mode: "channel" | "dm"
  const [activeMode, setActiveMode] = useState<"channel" | "dm">(() => {
    if (urlDm) return "dm";
    if (urlChannel) return "channel";
    return "channel"; // Default to Pod Channel on entry
  });

  // Selected Channel ID
  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    if (urlChannel) return urlChannel;
    if (isClient) return clientChannelSlug;
    if (isAdmin || isTeamLead) return "all-pod-leads";
    return "pod-beta-team";
  });

  // Selected DM Contact ID
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

  // Active contact object
  const activeContact = useMemo(() => {
    return contactsList.find((contact) => contact.id === activeContactId) ?? null;
  }, [contactsList, activeContactId]);
  const superAdminContact = useMemo(
    () => contactsList.find((contact) => contact.is_super_admin) ?? null,
    [contactsList],
  );

  // Active channel object
  const activeChannel = useMemo(() => {
    return (
      channelsList.find((ch) => ch.id === activeChannelId) ||
      channelsList[0] || {
        id: "general",
        label: "general",
        desc: "Workspace standups, milestones, and announcements",
      }
    );
  }, [channelsList, activeChannelId]);

  // Mobile view toggle ('channels' or 'chat')
  const [mobileView, setMobileView] = useState<"channels" | "chat">("chat");

  const defaultPersona = user?.full_name || user?.email?.split("@")[0] || "Team Member";
  const [currentPersona, setCurrentPersona] = useState<string>(defaultPersona);

  useEffect(() => {
    if (user?.full_name) {
      setCurrentPersona(user.full_name);
    }
  }, [user?.full_name]);

  // Search input for sidebar
  const [searchFilter, setSearchFilter] = useState("");

  const filteredChannels = useMemo(() => {
    if (!searchFilter.trim()) return channelsList;
    const q = searchFilter.toLowerCase();
    return channelsList.filter((ch) => ch.label.toLowerCase().includes(q) || ch.desc.toLowerCase().includes(q));
  }, [channelsList, searchFilter]);

  const filteredContacts = useMemo(() => {
    if (!searchFilter.trim()) return contactsList;
    const q = searchFilter.toLowerCase();
    return contactsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contactsList, searchFilter]);

  // Input states
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("smileys");
  const [pickerTargetMsgId, setPickerTargetMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [assignTaskModalOpen, setAssignTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"P1 High" | "P2 Med" | "P3 Normal">("P1 High");
  const [taskDeadline, setTaskDeadline] = useState("Today by 05:00 PM PST");
  const [taskScope, setTaskScope] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Local reactions store
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string; count: number; users: string[] }[]>>({});

  // LocalStorage cached channel messages
  const [localChannelMessages, setLocalChannelMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return SEED_WORKSPACE_MESSAGES;
  });

  const saveLocalChannelMessage = (channelId: string, msg: ChatMessage) => {
    setLocalChannelMessages((prev) => {
      const updated = {
        ...prev,
        [channelId]: [...(prev[channelId] || []), msg],
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Live Messages Query (Polls every 2000ms with instant real-time sync)
  const { data: serverMessages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["chat_messages", activeMode, activeMode === "dm" ? activeContact?.id : activeChannelId],
    queryFn: async () => {
      let endpoint = "";
      if (activeMode === "dm") {
        if (!activeContact?.id) return [];
        endpoint = `/api/v1/chat/messages?other_user_id=${activeContact.id}`;
      } else {
        endpoint = `/api/v1/chat/messages?channel=${encodeURIComponent(activeChannelId)}`;
      }

      let serverItems: any[] = [];
      try {
        const res = await request<any[]>(endpoint);
        serverItems = Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn("Message fetch error, falling back to local cache:", err);
      }

      const formattedServer = serverItems.map((m: any) => {
        const isSelf = m.sender_id === user?.id;
        const senderName = isSelf ? (user?.full_name || "You") : (m.sender_name || (activeMode === "dm" ? activeContact.name : "Team Specialist"));
        const senderRole = isSelf
          ? (user?.role === "super_admin" || user?.role === "admin"
              ? "Super Admin"
              : user?.role === "client"
              ? "Client"
              : "Specialist")
          : (activeMode === "dm" ? (activeContact.role || "").replace(/Client Representative/gi, "Client") : "Creative Pod");

        return {
          id: m.id,
          sender: senderName,
          role: senderRole,
          avatar: (senderName || "U").slice(0, 2).toUpperCase(),
          avatarBg: isSelf ? "bg-[#7FA0D6]" : (activeMode === "dm" && activeContact.is_super_admin ? "bg-amber-500" : "bg-[#64748B]"),
          content: m.message,
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: messageReactions[m.id] || [],
        };
      });

      // If channel mode and server returned items, merge with initial seed messages if standard channel
      if (activeMode === "channel") {
        const seed = SEED_WORKSPACE_MESSAGES[activeChannelId] || [];
        const local = localChannelMessages[activeChannelId] || [];
        
        // Deduplicate by message content or ID
        const seen = new Set<string>();
        const merged: ChatMessage[] = [];

        // 1. Add seeds first for standard channels so history looks rich
        if (seed.length > 0 && formattedServer.length === 0) {
          for (const s of seed) {
            if (!seen.has(s.content)) {
              seen.add(s.content);
              merged.push(s);
            }
          }
        }

        // 2. Add local storage items
        for (const loc of local) {
          if (!seen.has(loc.content)) {
            seen.add(loc.content);
            merged.push(loc);
          }
        }

        // 3. Add actual backend synced messages
        for (const srv of formattedServer) {
          if (!seen.has(srv.content)) {
            seen.add(srv.content);
            merged.push(srv);
          }
        }

        return merged;
      }

      return formattedServer;
    },
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // WebSocket Live Real-Time Connection
  useEffect(() => {
    if (!user?.id || !canUseChat) return;
    const token = getAuthToken();
    if (!token) return;

    let ws: WebSocket | null = null;
    let pingInterval: any = null;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      ws = new WebSocket(`${protocol}//${host}/api/v1/chat/ws/${user.id}`, ["creo-chat", token]);

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
  }, [user?.id, canUseChat, queryClient, refetchMessages]);

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
  }, [serverMessages, activeMode, activeChannelId, activeContactId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    const text = messageText.trim();
    setMessageText("");
    setShowEmojiPicker(false);

    try {
      if (activeMode === "dm") {
        if (!activeContact?.id) return;
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            recipient_id: activeContact.id,
            message: text,
            thread_type: "direct",
          }),
        });
      } else {
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            channel: activeChannelId,
            message: text,
          }),
        });

        // Also buffer locally so it displays instantly even during offline/slow network
        saveLocalChannelMessage(activeChannelId, {
          id: `local-${Date.now()}`,
          sender: currentPersona,
          role: isClient ? (user?.company_name || "Client") : "Specialist",
          avatar: currentPersona.slice(0, 2).toUpperCase(),
          avatarBg: "bg-[#7FA0D6]",
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: [],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
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
    const contact = activeContact;
    if (!contact) return;

    const resolvedTitle = taskTitle || "Priority Sprint Request";
    const taskContent = `⚡ New Sprint Task: **${resolvedTitle}**\n- Priority: ${taskPriority}\n- Due: ${taskDeadline}${taskScope ? `\n- Scope: ${taskScope}` : ""}`;

    try {
      if (activeMode === "dm") {
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            recipient_id: activeContact.id,
            message: taskContent,
            thread_type: "direct",
          }),
        });
      } else {
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            channel: activeChannelId,
            message: taskContent,
          }),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      refetchMessages();
      showToast(`Task "${resolvedTitle}" posted!`);
      setTaskTitle("");
      setTaskScope("");
    } catch {
      showToast("Could not assign task", "info");
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 flex-1 overflow-hidden -mx-2 sm:-mx-4 -my-2 sm:-my-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-[99999] bg-[#161F2D]/95 backdrop-blur-xl border border-[#7FA0D6]/40 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2">
          <Sparkles className="size-4 text-[#7FA0D6]" />
          <span className="font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Slack Hub Shell */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3 min-h-0 h-full max-h-full"
      >
        {/* 1. SLACK SIDEBAR (CHANNELS & DIRECT MESSAGES) */}
        <aside
          className={`${
            mobileView === "channels" ? "flex w-full" : "hidden md:flex"
          } md:w-80 lg:w-88 flex-col shrink-0 bg-[#0B111C]/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl h-full max-h-full min-h-0`}
        >
          {/* Top Brand Bar */}
          <div className="p-3.5 border-b border-white/[0.08] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-gradient-to-br from-[#7FA0D6] to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <MessageSquare className="size-3.5" />
                </div>
                <div>
                  <span className="font-black text-sm text-white tracking-tight block">Slack Workspace Hub</span>
                  <span className="text-[10px] text-[#97A0B3] block -mt-0.5">Pod & Direct Communication</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 backdrop-blur-sm text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
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
                    ? "Client"
                    : "Creative Specialist"}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Message Super Admin Button for Clients */}
          {isClient && (
            <div className="px-3 pt-3 shrink-0">
              <button
                onClick={() => {
                  const sa = contactsList.find((c) => c.is_super_admin) || contactsList[0];
                  if (sa) {
                    setActiveMode("dm");
                    setActiveContactId(sa.id);
                    setMobileView("chat");
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-md ${
                  activeMode === "dm" && activeContact?.is_super_admin
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

          {/* Search Filter */}
          <div className="p-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-2.5 text-[#97A0B3]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search channels & DMs..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]/60 transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-2 text-[10px] text-[#97A0B3] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* SIDEBAR SCROLLABLE CONTENT (CHANNELS + DIRECT MESSAGES) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 text-xs">
            {/* SECTION 1: WORKSPACE & POD CHANNELS */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-[#97A0B3] flex items-center justify-between pb-1">
                <span className="flex items-center gap-1.5">
                  <Hash className="size-3 text-[#7FA0D6]" />
                  <span>Channels</span>
                </span>
                <span className="text-[#97A0B3]">{filteredChannels.length}</span>
              </div>

              {filteredChannels.map((channel) => {
                const isSelected = activeMode === "channel" && activeChannelId === channel.id;

                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveMode("channel");
                      setActiveChannelId(channel.id);
                      setMobileView("chat");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#7FA0D6]/25 via-blue-500/15 to-transparent backdrop-blur-xl border border-[#7FA0D6]/50 text-white shadow-[0_0_15px_rgba(127,160,214,0.15)] ring-1 ring-[#7FA0D6]/30"
                        : "text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`size-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected ? "bg-[#7FA0D6] text-[#0B111C]" : "bg-white/[0.06] text-[#97A0B3]"
                        }`}
                      >
                        <Hash className="size-3" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold truncate text-white leading-tight">
                          {channel.label}
                        </span>
                        <span className="block text-[10px] text-[#97A0B3] truncate leading-tight mt-0.5">
                          {channel.desc}
                        </span>
                      </div>
                    </div>
                    {channel.isPodChannel && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Pod
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SECTION 2: DIRECT MESSAGES */}
            <div className="space-y-1 pt-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-[#97A0B3] flex items-center justify-between pb-1">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3 text-blue-400" />
                  <span>Direct Messages</span>
                </span>
                <span className="text-[#97A0B3]">{filteredContacts.length}</span>
              </div>

              {filteredContacts.map((contact) => {
                const isSelected = activeMode === "dm" && activeContactId === contact.id;
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
                      setActiveMode("dm");
                      setActiveContactId(contact.id);
                      setMobileView("chat");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? isSA
                          ? "bg-gradient-to-r from-amber-500/25 via-amber-600/15 to-transparent backdrop-blur-xl border border-amber-400/50 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30"
                          : "bg-gradient-to-r from-[#7FA0D6]/25 via-blue-500/15 to-transparent backdrop-blur-xl border border-[#7FA0D6]/50 text-white shadow-[0_0_20px_rgba(127,160,214,0.2)] ring-1 ring-[#7FA0D6]/30"
                        : isSA
                        ? "bg-amber-500/[0.06] backdrop-blur-md text-white hover:bg-amber-500/[0.12] border border-amber-500/20"
                        : "text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-transform ${
                          isSA
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 shadow-md shadow-amber-500/25"
                            : isSelected
                            ? "bg-gradient-to-br from-[#7FA0D6] to-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "bg-white/[0.06] backdrop-blur-md text-white border border-white/10"
                        }`}
                      >
                        {isSA ? <Crown className="size-3.5" /> : initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate block">
                            {contact.name}
                          </span>
                          {isSA && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#97A0B3] truncate block mt-0.5">
                          {(contact.role || "").replace(/Client Representative/gi, "Client")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/50" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Callout */}
          <div className="p-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-[11px] text-[#97A0B3] shrink-0">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3.5 text-[#7FA0D6]" />
              End-to-End Encrypted
            </span>
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </aside>

        {/* 2. CHAT MAIN AREA (CHANNELS & DMS) */}
        <section
          className={`${
            mobileView === "chat" ? "flex w-full" : "hidden md:flex"
          } flex-1 flex-col min-w-0 bg-[#0B111C]/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl h-full max-h-full min-h-0`}
        >
          {/* Header Bar */}
          <div className="p-3 sm:p-4 border-b border-white/[0.08] bg-[#0B111C]/60 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Back button on mobile */}
              <button
                onClick={() => setMobileView("channels")}
                className="md:hidden p-1.5 rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.1] transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>

              {activeMode === "channel" ? (
                <>
                  <div className="size-8 sm:size-9 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#7FA0D6] to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
                    <Hash className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-black text-white truncate">
                        #{activeChannel.label}
                      </h2>
                      {activeChannel.isPodChannel && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Dedicated Pod Channel
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#97A0B3] truncate mt-0.5 font-medium">
                      {activeChannel.desc}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`size-8 sm:size-9 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shadow-md shrink-0 ${
                      activeContact?.is_super_admin
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 shadow-amber-500/25"
                        : "bg-gradient-to-br from-[#7FA0D6] to-blue-600 text-white shadow-blue-500/25"
                    }`}
                  >
                    {activeContact?.is_super_admin ? (
                      <Crown className="size-4 sm:size-4.5" />
                    ) : (
                      activeContact?.name?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-black text-white truncate">
                        {activeContact?.name}
                      </h2>
                      {activeContact?.is_super_admin ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          Executive Direct
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#7FA0D6]/20 text-[#BCCCE6] border border-[#7FA0D6]/30">
                          Direct 1-on-1
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#97A0B3] truncate mt-0.5 font-medium flex items-center gap-1.5">
                      <span>{(activeContact?.role || "").replace(/Client Representative/gi, "Client")}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online & Active
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions (Task) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAssignTaskModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-white text-[#0B111C] font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                title="Create sprint task in chat"
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">Assign Task</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 max-h-full overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-[#0B111C]/90 backdrop-blur-xl flex flex-col"
          >
            {!activeContact || serverMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div
                  className={`size-16 rounded-3xl flex items-center justify-center mb-4 border ${
                    activeMode === "dm" && activeContact?.is_super_admin
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-[#7FA0D6]/10 text-[#7FA0D6] border-[#7FA0D6]/20"
                  }`}
                >
                  {activeMode === "channel" ? (
                    <Hash className="size-8 text-[#7FA0D6]" />
                  ) : activeContact?.is_super_admin ? (
                    <Crown className="size-8 text-amber-400" />
                  ) : (
                    <MessageSquare className="size-8 text-[#7FA0D6]" />
                  )}
                </div>
                <h3 className="text-base font-black text-white">
                  {activeMode === "channel"
                    ? `Welcome to #${activeChannel.label}`
                    : activeContact?.is_super_admin
                    ? "Direct Channel with Creo Super Administration"
                    : `Direct Conversation with ${activeContact.name}`}
                </h3>
                <p className="text-xs text-[#97A0B3] max-w-md mt-1.5 leading-relaxed">
                  {activeMode === "channel"
                    ? `This is the start of the #${activeChannel.label} channel. Collaborate with your creative team, drop project notes, or review revisions in real time.`
                    : activeContact?.is_super_admin
                    ? "This is your private, direct thread with Creo Executive Super Administration. Inquire about your creative pod, retainer adjustments, SLA escalations, or custom requests."
                    : `This is the start of your direct 1-on-1 thread with ${activeContact.name}. Drop project feedback, creative directions, or collaborate in real time.`}
                </p>
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
                          {(msg.role || "").replace(/Client Representative/gi, "Client")}
                        </span>
                        <span className="text-[10px] text-[#97A0B3] ml-auto">{msg.timestamp}</span>
                      </div>

                      {/* Message Content */}
                      <div className="text-xs text-[#F1F5F9] leading-relaxed font-medium break-words whitespace-pre-wrap">
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
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}

                        {/* Quick Reaction Buttons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                          {["👍", "❤️", "🔥", "🚀", "✅"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="size-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs flex items-center justify-center transition cursor-pointer"
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
                            className="size-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#97A0B3] hover:text-white text-xs font-bold flex items-center justify-center transition cursor-pointer"
                            title="More reactions"
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

          {/* Bottom Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#0B111C]/80 backdrop-blur-xl relative shrink-0">
            {/* WhatsApp Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50 w-80 bg-[#161F2D]/95 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl border border-white/10 space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Smile className="size-4 text-[#7FA0D6]" />
                    <span className="text-xs font-black text-white">
                      {pickerTargetMsgId ? "React with Emoji" : "Emoji Suite"}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 rounded-lg text-[#97A0B3] hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Categories Bar */}
                <div className="flex items-center justify-between gap-1 pb-1">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEmojiCategory(cat.id)}
                      className={`p-1.5 rounded-xl text-base transition ${
                        emojiCategory === cat.id ? "bg-[#7FA0D6]/20 border border-[#7FA0D6]/40" : "hover:bg-white/[0.06]"
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Emojis Grid */}
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 bg-black/20 rounded-xl">
                  {EMOJI_CATEGORIES.find((c) => c.id === emojiCategory)?.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (pickerTargetMsgId) {
                          handleAddReaction(pickerTargetMsgId, emoji);
                          setShowEmojiPicker(false);
                          setPickerTargetMsgId(null);
                        } else {
                          setMessageText((prev) => prev + emoji);
                        }
                      }}
                      className="size-8 rounded-lg hover:bg-white/[0.1] text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled={!activeContact}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    activeMode === "channel"
                      ? `Message #${activeChannel.label}... (Enter to send)`
                      : `Message ${activeContact?.name || "Direct Message"}... (Enter to send)`
                  }
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-2xl pl-4 pr-32 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FA0D6] transition-colors"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!activeContact}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="p-1.5 text-[#97A0B3] hover:text-[#7FA0D6] rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    title="Add Emoji"
                  >
                    <Smile className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!activeContact}
                    onClick={() => showToast("Attachment upload ready", "info")}
                    className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    title="Attach file"
                  >
                    <Paperclip className="size-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!activeContact || !messageText.trim()}
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
                <h3 className="text-base font-black text-white">
                  {activeMode === "channel" ? `Post Task in #${activeChannel.label}` : `Send Task to ${activeContact?.name}`}
                </h3>
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
                  Post Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
