import { useState, useRef, useEffect, useMemo } from "react";
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
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { request } from "../../lib/http";
import { useSearchParams, useLocation, Link } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { ResumeOnboardingBanner } from "../../components/portal/ResumeOnboardingBanner";
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
  is_bde?: boolean;
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
  attachment?: { name: string; size: string; type: string; url?: string };
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: number;
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

  "bde-sales-hub": [
    {
      id: "seed-bde-1",
      sender: "Creo Super Admin",
      role: "Super Admin",
      avatar: "SA",
      avatarBg: "bg-amber-500",
      content: "💼 BDE Growth & Pipeline Command: Welcome BDE sales specialists! Use this channel to coordinate high-value client deals, custom retainers, and cross-rep sales coverage.",
      timestamp: "09:00 AM",
      reactions: [{ emoji: "🚀", count: 3, users: ["Admin"] }],
    },
  ],
};

const LOCAL_STORAGE_CHANNEL_MESSAGES_KEY = "creo_slack_channels_v3";
const LOCAL_STORAGE_DM_MESSAGES_KEY = "creo_local_dm_chat_messages_v1";

export function SlackChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // User role classification
  const roleStr = (user?.role || "").toLowerCase();
  const isClient = roleStr === "client";
  const gate = useOnboardingGate();
  const canUseChat = !isClient || gate.isComplete;
  const isFreelancer = ["freelancer", "freelance"].includes(roleStr);
  const isTeamLead = ["team_lead", "lead"].includes(roleStr);
  const isAdmin = ["admin", "super_admin", "ops_admin"].includes(roleStr);
  const isBde = ["sales", "bde"].includes(roleStr);
  const isTeamMember = !isClient && !isFreelancer && !isTeamLead && !isAdmin && !isBde;

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isWorkstation =
    location.pathname.startsWith("/workstation") ||
    location.pathname.startsWith("/member") ||
    location.pathname === "/slack";
  const locationState = location.state as { draft?: string; dm?: string; channel?: string; leadName?: string } | null;
  const urlDm = searchParams.get("dm");
  const urlChannel = searchParams.get("channel") || locationState?.channel || null;
  const urlDraft = searchParams.get("draft") || locationState?.draft || "";
  const targetDm = urlDm || locationState?.dm || null;

  // Client pod channel slug
  const clientChannelSlug = useMemo(() => {
    if (user?.full_name) {
      return `client-${user.full_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    }
    if (user?.company_name) {
      return `client-${user.company_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    }
    return user?.id ? `client-${user.id}` : "client-pod";
  }, [user]);

  // Fetch role-scoped channels from backend
  const { data: serverChannels = [] } = useQuery<WorkspaceChannel[]>({
    queryKey: ["chat_channels", user?.id],
    queryFn: () => request<WorkspaceChannel[]>("/api/v1/chat/channels"),
    enabled: !!user?.id && canUseChat,
    staleTime: 30_000,
  });

  // Channels definitions strictly filtered per user role:
  // - Freelancer: NONE (no channels at all)
  // - Client: ONLY their dedicated Pod Hub (#pod-creative-hub)
  // - Admin: Group with all leads (#all-pod-leads), BDE hub, each pod group with members, and agency channels
  // - TL: Group with all leads (#all-pod-leads), their own pod group, and agency channels
  // - Team Members: Their own pod group ONLY with lead & admin, and agency channels
  const channelsList: WorkspaceChannel[] = useMemo(() => {
    if (serverChannels && serverChannels.length > 0) {
      return serverChannels;
    }

    // 1. FREELANCER: NO CHANNELS
    if (isFreelancer) {
      return [];
    }

    const list: WorkspaceChannel[] = [];

    // 2. CLIENT: ONLY dedicated pod creative hub
    if (isClient) {
      list.push({
        id: clientChannelSlug,
        label: "pod-creative-hub",
        desc: "Your dedicated Creative Pod (Team Lead & Super Admin)",
        isPodChannel: true,
      });
      return list;
    }

    // 3. ADMIN: All Leads Group + BDE Hub + Each Pod Group with members + Global agency channels
    if (isAdmin) {
      list.push({
        id: "all-pod-leads",
        label: "all-pod-leads",
        desc: "Leadership Council: Executive Admin & All Pod Leads",
        isPodChannel: true,
      });

      list.push({
        id: "bde-sales-hub",
        label: "bde-sales-hub",
        desc: "BDE Commercial Outreach & Pipeline Command (Sales Reps & Admin)",
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

      list.push({
        id: "general",
        label: "general",
        desc: "Workspace standups, milestones, and announcements",
      });
      return list;
    }

    // 4. TEAM LEAD (TL): All Leads Group + Their Own Pod + Global agency channels
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

      list.push({
        id: "general",
        label: "general",
        desc: "Workspace standups, milestones, and announcements",
      });
      return list;
    }

    // 5. TEAM MEMBERS: Their Own Pod Group ONLY + Global channels
    if (isTeamMember) {
      list.push({
        id: "pod-beta-team",
        label: "pod-beta-team",
        desc: "Your Dedicated Pod Group (Team Lead, Specialists & Admin)",
        isPodChannel: true,
      });

      list.push({
        id: "general",
        label: "general",
        desc: "Workspace standups, milestones, and announcements",
      });
      return list;
    }

    // 6. BDE: BDE Sales Hub + Announcements
    if (isBde) {
      list.push(
        {
          id: "bde-sales-hub",
          label: "bde-sales-hub",
          desc: "BDE Commercial Outreach & Pipeline Sync (Sales Reps & Admin)",
          isPodChannel: true,
        },
        {
          id: "general",
          label: "general",
          desc: "Workspace standups, milestones, and announcements",
        }
      );
      return list;
    }

    return list;
  }, [serverChannels, isFreelancer, isClient, isAdmin, isTeamLead, isTeamMember, isBde, clientChannelSlug]);

  // Fetch DM contacts from backend
  const { data: serverContacts = [] } = useQuery<ChatContact[]>({
    queryKey: ["chat_contacts", user?.id],
    queryFn: () => request<ChatContact[]>("/api/v1/chat/contacts"),
    enabled: !!user?.id && canUseChat,
    staleTime: 15_000,
  });

  // Fallback contacts strictly enforcing role permissions:
  // - Freelancer: ONLY Admin
  // - Client: Admin & Pod Lead & BDE
  // - TL: Admin, Each member from own pod, and assigned clients
  // - Team Members: Admin and their own Pod Lead ONLY
  // - BDE: Clients, Admin, and other BDE members
  // - Admin: All Pod Leads, All Team Members, BDEs, Clients, Freelancers
  const fallbackContacts: ChatContact[] = useMemo(() => {
    const superAdmin: ChatContact = {
      id: "646f6d6e-3479-42c5-b275-9fcd212453f6",
      name: "Creo Super Admin",
      role: "Super Admin & Executive Support",
      email: "admin@creo.agency",
      is_super_admin: true,
      online: true,
    };
    const teamLeadSarah: ChatContact = {
      id: "9faa25ef-30e0-46cf-b9ac-f53dce1c0578",
      name: "Sarah Connor",
      role: "Team Lead & Account Director (Pod B)",
      email: "lead.beta@creo.agency",
      online: true,
    };
    const teamLeadVikram: ChatContact = {
      id: "e5cd3dc7-41fc-4ae5-9bb1-8314fcf8afa5",
      name: "Vikram Malhotra",
      role: "Team Lead & Account Director (Pod A)",
      email: "lead.alpha@creo.agency",
      online: true,
    };
    const teamLeadRohan: ChatContact = {
      id: "bd13b2f8-59a8-4bee-a2f9-fa5c1108d29b",
      name: "Rohan Mehta",
      role: "Team Lead & Account Director (Pod C)",
      email: "lead.gamma@creo.agency",
      online: true,
    };
    const memberRajini: ChatContact = {
      id: "44d7156f-f233-4bc7-9372-233bb9b7c1a1",
      name: "Rajini",
      role: "Lead Video Editor (Pod B)",
      email: "editor.beta@creo.agency",
      online: true,
    };
    const memberChloe: ChatContact = {
      id: "17e174a7-b1d5-4a61-b541-e945c7d8be64",
      name: "Chloe Bennett",
      role: "Lead Graphic Designer (Pod B)",
      email: "designer.beta@creo.agency",
      online: true,
    };
    const clientRep: ChatContact = {
      id: "1a5ef9ac-e43e-4fa0-918d-de31d44e8c7a",
      name: "127 Aravindan S",
      role: "Client",
      email: "aravindan20062006@gmail.com",
      is_client: true,
      online: true,
    };
    const bdeRep: ChatContact = {
      id: "00000000-0000-0000-0000-0000000000d1",
      name: "Alex Carter (BDE Specialist)",
      role: "BDE Specialist",
      email: "bde@creo.agency",
      is_bde: true,
      online: true,
    };
    const freelancerRep: ChatContact = {
      id: "00000000-0000-0000-0000-0000000000f1",
      name: "Freelance Creative Editor",
      role: "Freelancer",
      email: "freelancer@creo.agency",
      online: true,
    };

    if (isFreelancer) {
      // FREELANCER: ONLY ADMIN NONE ELSE
      return [superAdmin];
    }
    if (isClient) {
      // CLIENT: MESSAGES TL, ADMIN, AND BDE
      return [superAdmin, teamLeadSarah, bdeRep];
    }
    if (isTeamLead) {
      // TL: ADMIN, EACH POD MEMBER, AND THEIR CLIENTS
      return [superAdmin, memberRajini, memberChloe, clientRep];
    }
    if (isTeamMember) {
      // TEAM MEMBERS: ADMIN AND THEIR TL ONLY
      return [superAdmin, teamLeadSarah];
    }
    if (isBde) {
      // BDE: ONLY CLIENTS, ADMIN, AND OTHER BDE MEMBERS
      return [superAdmin, clientRep, bdeRep];
    }
    // ADMIN: ALL POD LEADS, ALL TEAM MEMBERS, BDEs, CLIENTS, FREELANCERS
    return [teamLeadSarah, teamLeadVikram, teamLeadRohan, memberRajini, memberChloe, bdeRep, clientRep, freelancerRep];
  }, [isFreelancer, isClient, isTeamLead, isTeamMember, isBde]);

  const contactsList: ChatContact[] = useMemo(() => {
    const rawList = serverContacts && serverContacts.length > 0 ? serverContacts : fallbackContacts;

    // Strict frontend filter ensuring no unauthorized contacts leak through
    return rawList
      .map((c: ChatContact) => ({
        ...c,
        role: (c.role || "").replace(/Client Representative/gi, "Client"),
      }))
      .filter((c: ChatContact) => {
        // Exclude self if somehow present
        if (c.id === user?.id || (c.email && c.email.toLowerCase() === (user?.email || "").toLowerCase())) {
          return false;
        }

        const cRole = (c.role || "").toLowerCase();
        const isTargetAdmin = Boolean(c.is_super_admin) || cRole.includes("admin");
        const isTargetTL = cRole.includes("lead") || cRole.includes("director");
        const isTargetClient = Boolean(c.is_client) || cRole.includes("client");
        const isTargetBde = Boolean(c.is_bde) || cRole.includes("bde") || cRole.includes("sales");

        if (isFreelancer) {
          // FREELANCER: ONLY ADMIN, NONE ELSE
          return isTargetAdmin;
        }
        if (isClient) {
          // CLIENT: ADMIN, POD LEAD, AND BDE
          return isTargetAdmin || isTargetTL || isTargetBde;
        }
        if (isTeamLead) {
          // TL: ADMIN, MEMBERS FROM OWN POD, AND ASSIGNED CLIENTS
          return isTargetAdmin || isTargetClient || (!isTargetBde && !cRole.includes("freelancer"));
        }
        if (isTeamMember) {
          // MEMBERS: ADMIN AND THEIR TL ONLY
          return isTargetAdmin || isTargetTL;
        }
        if (isBde) {
          // BDE: ONLY CLIENTS, ADMINS, AND OTHER BDE MEMBERS
          return isTargetAdmin || isTargetClient || isTargetBde;
        }
        if (isAdmin) {
          // ADMIN: TALK WITH CLIENTS, ALL TEAM LEADS, ALL TEAM MEMBERS, BDE MEMBERS, FREELANCERS
          // Exclude other admins
          if (isTargetAdmin) return false;
          return true;
        }
        return isTargetAdmin || isTargetTL;
      });
  }, [serverContacts, fallbackContacts, isFreelancer, isClient, isTeamLead, isTeamMember, isBde, isAdmin, user]);

  // Selection mode: "channel" | "dm"
  const [activeMode, setActiveMode] = useState<"channel" | "dm">(() => {
    if (urlDm || isFreelancer) return "dm";
    if (urlChannel) return "channel";
    return isFreelancer ? "dm" : "channel";
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
    if (targetDm) {
      const match = contactsList.find(
        (c) =>
          c.id === targetDm ||
          c.name.toLowerCase().includes(targetDm.toLowerCase()) ||
          (targetDm.toLowerCase() === "super-admin" && c.is_super_admin)
      );
      if (match) return match.id;
    }
    return contactsList[0]?.id || "646f6d6e-3479-42c5-b275-9fcd212453f6";
  });

  // Active contact object
  const activeContact = useMemo(() => {
    return contactsList.find((contact) => contact.id === activeContactId) ?? null;
  }, [contactsList, activeContactId]);

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

  // Synchronize active mode and channel/dm when URL parameters are explicitly present
  useEffect(() => {
    if (urlChannel) {
      setActiveMode("channel");
      setActiveChannelId(urlChannel);
      setMobileView("chat");
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
    } else if (targetDm) {
      setActiveMode("dm");
      const match = contactsList.find(
        (c) =>
          c.id === targetDm ||
          c.name.toLowerCase().includes(targetDm.toLowerCase()) ||
          (targetDm.toLowerCase() === "super-admin" && c.is_super_admin)
      );
      if (match) {
        setActiveContactId(match.id);
        setMobileView("chat");
        queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      }
    }
  }, [urlChannel, targetDm, queryClient]);

  // Mobile view toggle ('channels' or 'chat')
  const [mobileView, setMobileView] = useState<"channels" | "chat">(() => {
    return urlChannel || targetDm ? "chat" : "channels";
  });

  // Chat filter tabs: All, Pods & Groups, Direct Messages
  const [chatFilter, setChatFilter] = useState<"all" | "pods" | "dms">("all");

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

  const displayedChannels = useMemo(() => {
    if (chatFilter === "dms") return [];
    return filteredChannels;
  }, [chatFilter, filteredChannels]);

  const displayedContacts = useMemo(() => {
    if (chatFilter === "pods") return [];
    return filteredContacts;
  }, [chatFilter, filteredContacts]);

  const handleSelectChat = (mode: "channel" | "dm", id: string) => {
    setActiveMode(mode);
    if (mode === "channel") {
      setActiveChannelId(id);
    } else {
      setActiveContactId(id);
    }
    setMobileView("chat");
  };

  // Input states
  const [messageText, setMessageText] = useState(urlDraft);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlDraft) {
      setMessageText(urlDraft);
      const timer = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [urlDraft]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("smileys");
  const [pickerTargetMsgId, setPickerTargetMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);



  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        showToast("File size exceeds 50MB limit", "info");
        return;
      }
      setSelectedFile(file);
      e.target.value = "";
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Local reactions store
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string; count: number; users: string[] }[]>>({});

  const saveLocalChannelMessage = (channelId: string, msg: ChatMessage) => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[channelId] = [...(parsed[channelId] || []), msg];
      localStorage.setItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  };

  const saveLocalDMMessage = (contactId: string, msg: ChatMessage) => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DM_MESSAGES_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[contactId] = [...(parsed[contactId] || []), msg];
      localStorage.setItem(LOCAL_STORAGE_DM_MESSAGES_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
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
        const senderName = isSelf ? (user?.full_name || "You") : (m.sender_name || (activeMode === "dm" ? (activeContact?.name || "Teammate") : "Team Specialist"));
        const senderRole = isSelf
          ? (user?.role === "super_admin" || user?.role === "admin"
              ? "Super Admin"
              : user?.role === "client"
              ? "Client"
              : "Specialist")
          : (activeMode === "dm" ? ((activeContact?.role || "").replace(/Client Representative/gi, "Client")) : "Creative Pod");

        return {
          id: m.id,
          sender: senderName,
          role: senderRole,
          avatar: (senderName || "U").slice(0, 2).toUpperCase(),
          avatarBg: isSelf ? "bg-[#7FA0D6]" : (activeMode === "dm" && activeContact?.is_super_admin ? "bg-amber-500" : "bg-[#64748B]"),
          content: m.message,
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          attachment_url: m.attachment_url,
          attachment_name: m.attachment_name,
          attachment_type: m.attachment_type,
          attachment_size: m.attachment_size,
          attachment: m.attachment_url
            ? {
                name: m.attachment_name || "Attachment",
                size: m.attachment_size
                  ? `${(m.attachment_size / (1024 * 1024) > 1 ? (m.attachment_size / (1024 * 1024)).toFixed(1) + " MB" : Math.round(m.attachment_size / 1024) + " KB")}`
                  : "File",
                type: m.attachment_type || "file",
                url: m.attachment_url,
              }
            : undefined,
          reactions: messageReactions[m.id] || [],
        };
      });

      // If channel mode, merge initial seed messages at top, followed by chronological server messages, followed by any recent un-synced optimistic local messages
      if (activeMode === "channel") {
        const seed = SEED_WORKSPACE_MESSAGES[activeChannelId] || [];
        const seenIds = new Set<string>();
        const merged: ChatMessage[] = [];

        // 1. Seed messages always stay at the top as historical foundation
        for (const s of seed) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            merged.push(s);
          }
        }

        // 2. Real server messages from backend database appended in exact chronological order
        for (const srv of formattedServer) {
          if (!seenIds.has(srv.id)) {
            seenIds.add(srv.id);
            merged.push(srv);
          }
        }

        // 3. Any optimistic local message that hasn't appeared in server items yet
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const channelLocals = (parsed[activeChannelId] || []) as ChatMessage[];
            for (const loc of channelLocals) {
              // Only keep fresh optimistic messages (< 5 minutes old)
              const timeMatch = loc.id?.match(/local-(\d+)/);
              if (timeMatch && Date.now() - Number(timeMatch[1]) > 5 * 60 * 1000) {
                continue;
              }
              const alreadyInServer = formattedServer.some(
                (srv) => srv.id === loc.id || (srv.sender === loc.sender && srv.content === loc.content)
              );
              if (!alreadyInServer && !seenIds.has(loc.id)) {
                seenIds.add(loc.id);
                merged.push(loc);
              }
            }
          }
        } catch {
          // ignore
        }

        return merged;
      }

      if (activeMode === "dm" && activeContact?.id) {
        const seenIds = new Set<string>();
        const merged: ChatMessage[] = [];
        for (const srv of formattedServer) {
          if (!seenIds.has(srv.id)) {
            seenIds.add(srv.id);
            merged.push(srv);
          }
        }
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_DM_MESSAGES_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const dmLocals = (parsed[activeContact.id] || []) as ChatMessage[];
            for (const loc of dmLocals) {
              const timeMatch = loc.id?.match(/local-(\d+)/);
              if (timeMatch && Date.now() - Number(timeMatch[1]) > 5 * 60 * 1000) {
                continue;
              }
              const alreadyInServer = formattedServer.some(
                (srv) => srv.id === loc.id || (srv.sender === loc.sender && srv.content === loc.content)
              );
              if (!alreadyInServer && !seenIds.has(loc.id)) {
                seenIds.add(loc.id);
                merged.push(loc);
              }
            }
          }
        } catch {
          // ignore
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

  // Ensure fresh messages are refetched upon navigating into route or changing search params
  useEffect(() => {
    refetchMessages();
  }, [location.pathname, location.search, location.state, refetchMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    const scrollDown = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    scrollDown();
    const t1 = setTimeout(scrollDown, 80);
    const t2 = setTimeout(scrollDown, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [serverMessages.length, activeMode, activeChannelId, activeContactId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    const text = messageText.trim();
    const fileToUpload = selectedFile;
    setMessageText("");
    setSelectedFile(null);
    setShowEmojiPicker(false);
    setIsUploading(true);

    try {
      let attachmentPayload: {
        attachment_url?: string;
        attachment_name?: string;
        attachment_type?: string;
        attachment_size?: number;
      } = {};

      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        const uploadRes = await request<{
          attachment_url: string;
          attachment_name: string;
          attachment_type: string;
          attachment_size: number;
        }>("/api/v1/chat/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes?.attachment_url) {
          attachmentPayload = {
            attachment_url: uploadRes.attachment_url,
            attachment_name: uploadRes.attachment_name,
            attachment_type: uploadRes.attachment_type,
            attachment_size: uploadRes.attachment_size,
          };
        }
      }

      if (activeMode === "dm") {
        if (!activeContact?.id) return;
        saveLocalDMMessage(activeContact.id, {
          id: `local-${Date.now()}`,
          sender: currentPersona,
          role: isClient ? (user?.company_name || "Client") : "Specialist",
          avatar: currentPersona.slice(0, 2).toUpperCase(),
          avatarBg: "bg-[#7FA0D6]",
          content: text || (fileToUpload?.name || "Attachment"),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          attachment: fileToUpload ? {
            name: fileToUpload.name,
            size: `${Math.round(fileToUpload.size / 1024)} KB`,
            type: fileToUpload.type,
            url: attachmentPayload.attachment_url,
          } : undefined,
          reactions: [],
        });
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            recipient_id: activeContact.id,
            message: text,
            thread_type: "direct",
            ...attachmentPayload,
          }),
        });
      } else {
        await request("/api/v1/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            channel: activeChannelId,
            message: text,
            ...attachmentPayload,
          }),
        });

        // Also buffer locally so it displays instantly even during offline/slow network
        saveLocalChannelMessage(activeChannelId, {
          id: `local-${Date.now()}`,
          sender: currentPersona,
          role: isClient ? (user?.company_name || "Client") : "Specialist",
          avatar: currentPersona.slice(0, 2).toUpperCase(),
          avatarBg: "bg-[#7FA0D6]",
          content: text || (fileToUpload?.name || "Attachment"),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          attachment: fileToUpload ? {
            name: fileToUpload.name,
            size: `${Math.round(fileToUpload.size / 1024)} KB`,
            type: fileToUpload.type,
            url: attachmentPayload.attachment_url,
          } : undefined,
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
      setMessageText(text);
      if (fileToUpload) setSelectedFile(fileToUpload);
      console.error("Message send error:", err);
      showToast(err?.message || "Failed to send message. Please retry.", "info");
    } finally {
      setIsUploading(false);
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



  if (isClient && gate.error) {
    return (
      <div role="alert" className="p-6 text-sm text-[#BCCCE6]">
        Could not verify onboarding status.{" "}
        <button type="button" className="underline" onClick={() => void gate.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (isClient && !gate.isReady) {
    return <CreoLoadingScreen fullScreen={false} label="Checking workspace access" className="min-h-[45vh]" />;
  }

  if (isClient && !gate.isComplete) {
    return (
      <div className="flex flex-1 min-h-0 flex-col py-2 sm:py-4">
        <ResumeOnboardingBanner variant="compact" />
        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <SubscriptionLockedState
            title="Direct Chat Locked"
            description="Your private chat with the assigned creative pod unlocks after you complete workspace setup. Resume setup above to continue where you left off."
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${
        isClient
          ? "flex-1 min-h-0 h-full"
          : isWorkstation
          ? "flex-1 min-h-0 h-full lg:pt-2 lg:px-4 lg:pb-2"
          : "flex-1 min-h-0 h-full"
      } overflow-hidden bg-[#0B111C] text-white font-sans antialiased`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 sm:right-8 z-[99999] bg-[#161F2D]/95 backdrop-blur-xl border border-[#7FA0D6]/40 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2">
          <Sparkles className="size-4 text-[#7FA0D6]" />
          <span className="font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Slack Layout Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 h-full w-full">
        {/* ========================================================================= */}
        {/* 1. CHATS LIST (LEFT PANE)                                                 */}
        {/* ========================================================================= */}
        <aside
          className={`${
            mobileView === "channels" ? "flex w-full" : "hidden md:flex"
          } md:w-[350px] lg:w-[380px] xl:w-[410px] flex-col shrink-0 bg-[#161F2D] border-r border-[#2A3446] overflow-hidden h-full max-h-full min-h-0 z-10`}
        >
          {/* Top Bar with Dashboard Link */}
          <div className="h-14 px-4 bg-[#161F2D] border-b border-[#2A3446] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                to={isWorkstation ? "/workstation" : isClient ? "/portal" : "/admin"}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#97A0B3] hover:text-white transition-colors shrink-0"
                aria-label="Back to dashboard"
                title="Back to dashboard"
              >
                <ArrowLeft className="size-4.5" />
              </Link>
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-[#7FA0D6]" />
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide">Creo Slack Hub</h1>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#7FA0D6] animate-pulse" />
              Live
            </span>
          </div>

          {/* Search Bar & Filter Tabs */}
          <div className="p-2.5 bg-[#161F2D] space-y-2 shrink-0 border-b border-[#2A3446]">
            {/* Search Input */}
            <div className="relative flex items-center bg-[#0B111C] rounded-xl px-3 py-1.5 border border-[#2A3446] focus-within:border-[#7FA0D6] transition-colors">
              <Search className="size-4 text-[#97A0B3] shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search channels or contacts..."
                className="w-full bg-transparent text-xs text-white placeholder-[#97A0B3] focus:outline-none"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="text-xs text-[#97A0B3] hover:text-white ml-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs (All, Pods / Groups, Direct) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setChatFilter("all")}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  chatFilter === "all"
                    ? "bg-[#7FA0D6] text-white font-bold shadow-xs"
                    : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
                }`}
              >
                All
              </button>
              {filteredChannels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatFilter("pods")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                    chatFilter === "pods"
                      ? "bg-[#7FA0D6] text-white font-bold shadow-xs"
                      : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
                  }`}
                >
                  Pods & Groups ({filteredChannels.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setChatFilter("dms")}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  chatFilter === "dms"
                    ? "bg-[#7FA0D6] text-white font-bold shadow-xs"
                    : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
                }`}
              >
                Direct Messages ({filteredContacts.length})
              </button>
            </div>
          </div>

          {/* Scrollable Chats List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2A3446]/40">
            {/* WORKSPACE & POD CHANNELS (GROUPS) */}
            {displayedChannels.map((channel) => {
              const isSelected = activeMode === "channel" && activeChannelId === channel.id;

              return (
                <div
                  key={channel.id}
                  onClick={() => handleSelectChat("channel", channel.id)}
                  className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#7FA0D6]/15 border-l-2 border-[#7FA0D6]" : "hover:bg-[#1E293B]/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold shadow-sm">
                      <Hash className="size-5" />
                    </div>
                    {channel.isPodChannel && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] flex items-center justify-center text-[8px] font-black text-white">
                        P
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        #{channel.label}
                      </span>
                      <span className="text-[10px] text-[#97A0B3] shrink-0 font-medium ml-2">
                        Group
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-[#97A0B3] truncate leading-tight">
                        {channel.desc}
                      </p>
                      {channel.isPodChannel && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-blue-500/20 text-[#7FA0D6] border border-blue-500/30 shrink-0">
                          Pod
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* DIRECT MESSAGES (CONTACTS) */}
            {displayedContacts.map((contact) => {
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
                <div
                  key={contact.id}
                  onClick={() => handleSelectChat("dm", contact.id)}
                  className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#7FA0D6]/15 border-l-2 border-[#7FA0D6]" : "hover:bg-[#1E293B]/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`size-11 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm ${
                        isSA
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950"
                          : "bg-gradient-to-br from-[#7FA0D6] to-blue-700 text-white"
                      }`}
                    >
                      {isSA ? <Crown className="size-5" /> : initials}
                    </div>
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-400 border-2 border-[#161F2D]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                          {contact.name}
                        </span>
                        {isSA && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#97A0B3] shrink-0 font-medium ml-2">
                        Online
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#97A0B3]">
                      <CheckCheck className="size-3.5 text-[#7FA0D6] shrink-0" />
                      <span className="truncate">
                        {(contact.role || "").replace(/Client Representative/gi, "Client")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedChannels.length === 0 && displayedContacts.length === 0 && (
              <div className="p-8 text-center text-xs text-[#97A0B3]">
                No matching conversations found
              </div>
            )}
          </div>

          {/* Left Bottom Status Bar */}
          <div className="h-10 px-4 bg-[#161F2D] border-t border-[#2A3446] flex items-center justify-between text-[11px] text-[#97A0B3] shrink-0">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3.5 text-[#7FA0D6]" />
              Creo Ops Network Active
            </span>
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. ACTIVE CONVERSATION (RIGHT PANE)                                        */}
        {/* ========================================================================= */}
        <section
          className={`${
            mobileView === "chat" ? "flex w-full" : "hidden md:flex"
          } flex-1 min-w-0 flex-col overflow-hidden h-full max-h-full min-h-0 relative bg-[#0B111C]`}
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Chat Top Header Bar */}
          <div className="h-16 px-3 sm:px-4 bg-[#161F2D] border-b border-[#2A3446] flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Prominent Back Button on Mobile */}
              <button
                type="button"
                onClick={() => setMobileView("channels")}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 text-[#97A0B3] hover:text-white transition-colors shrink-0 cursor-pointer"
                aria-label="Back to all chats"
                title="Back to all chats"
              >
                <ArrowLeft className="size-5" />
              </button>

              {activeMode === "channel" ? (
                <>
                  <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                    <Hash className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                      #{activeChannel.label}
                    </h2>
                    <p className="text-[11px] text-[#7FA0D6] font-medium truncate mt-0.5">
                      {activeChannel.isPodChannel ? "Dedicated Creative Pod Channel" : "Workspace Hub"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0 ${
                      activeContact?.is_super_admin
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950"
                        : "bg-gradient-to-br from-[#7FA0D6] to-blue-700 text-white"
                    }`}
                  >
                    {activeContact?.is_super_admin ? (
                      <Crown className="size-5" />
                    ) : (
                      activeContact?.name?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                        {activeContact?.name || "Direct Message"}
                      </h2>
                      {activeContact?.is_super_admin && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Online</span>
                      <span className="text-[#97A0B3]">•</span>
                      <span className="text-[#97A0B3] truncate">
                        {(activeContact?.role || "").replace(/Client Representative/gi, "Client")}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Clean Status Badge - Call Buttons Removed Per Request */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active</span>
              </span>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 max-h-full overflow-y-auto p-3 sm:p-5 space-y-2.5 flex flex-col overscroll-contain"
          >
            {/* Centered Encryption / Info Pill */}
            <div className="mx-auto my-1 px-3 py-1 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[10px] sm:text-[11px] font-semibold text-[#97A0B3] shadow-sm uppercase tracking-wider flex items-center gap-1.5 select-none shrink-0">
              <Shield className="size-3 text-[#7FA0D6]" />
              <span>Creo Encrypted Secure Channel</span>
            </div>

            {(activeMode === "dm" && !activeContact) || serverMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="size-16 rounded-2xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center mb-3 text-[#7FA0D6]">
                  <MessageSquare className="size-8" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {activeMode === "channel"
                    ? `Welcome to #${activeChannel.label}`
                    : `Direct Chat with ${activeContact?.name || "Teammate"}`}
                </h3>
                <p className="text-xs text-[#97A0B3] max-w-sm mt-1">
                  Start the conversation! Share project files, creative notes, or ask questions in real time.
                </p>
              </div>
            ) : (
              <>
                {serverMessages.map((msg) => {
                  const isUser = msg.sender === currentPersona || msg.sender === (user?.full_name || "You");

                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} group relative`}
                    >
                      {/* Speech Bubble */}
                      <div
                        className={`relative px-3.5 py-2 max-w-[85%] sm:max-w-[70%] md:max-w-[65%] shadow-md text-xs sm:text-sm leading-relaxed transition-all select-text ${
                          isUser
                            ? "bg-[#1E3A8A] text-white border border-blue-500/30 rounded-2xl rounded-tr-xs"
                            : "bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446] rounded-2xl rounded-tl-xs"
                        }`}
                      >
                        {/* Sender Label (in group channels) */}
                        {!isUser && activeMode === "channel" && (
                          <div className="text-[11px] font-bold text-[#7FA0D6] mb-1 flex items-center justify-between gap-2">
                            <span>{msg.sender}</span>
                            <span className="text-[9px] font-medium text-[#97A0B3]">
                              {(msg.role || "").replace(/Client Representative/gi, "Client")}
                            </span>
                          </div>
                        )}

                        {/* Message Content */}
                        {msg.content && (
                          <div className="whitespace-pre-wrap break-words font-normal">
                            {msg.content}
                          </div>
                        )}

                        {/* Attachment Rendering */}
                        {(msg.attachment_url || msg.attachment?.url || msg.attachment) && (() => {
                          const fileUrl = msg.attachment_url || msg.attachment?.url;
                          const fileName = msg.attachment_name || msg.attachment?.name || "Attachment";
                          const fileType = (msg.attachment_type || msg.attachment?.type || "").toLowerCase();
                          const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
                          const isVideo = fileType.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(fileName);
                          const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(fileName);

                          return (
                            <div className="mt-2">
                              {isImage && fileUrl ? (
                                <div className="relative group/media rounded-xl overflow-hidden border border-black/20 bg-black/40 max-h-64 inline-block">
                                  <img
                                    src={fileUrl}
                                    alt={fileName}
                                    className="max-h-60 rounded-xl object-contain hover:scale-[1.02] transition-transform cursor-pointer"
                                    onClick={() => window.open(fileUrl, "_blank")}
                                    loading="lazy"
                                  />
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={fileName}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white opacity-0 group-hover/media:opacity-100 transition-opacity"
                                    title="Download image"
                                  >
                                    <Download className="size-3.5" />
                                  </a>
                                </div>
                              ) : isVideo && fileUrl ? (
                                <video
                                  controls
                                  src={fileUrl}
                                  className="max-h-60 rounded-xl border border-black/20 w-full bg-black"
                                />
                              ) : isAudio && fileUrl ? (
                                <audio
                                  controls
                                  src={fileUrl}
                                  className="w-full max-w-xs rounded-lg mt-1"
                                />
                              ) : (
                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 border border-white/10">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-white/10 text-white shrink-0">
                                      <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-white truncate">{fileName}</p>
                                      <p className="text-[10px] text-[#97A0B3]">
                                        {msg.attachment_size
                                          ? `${(msg.attachment_size / (1024 * 1024) > 1 ? (msg.attachment_size / (1024 * 1024)).toFixed(1) + " MB" : Math.round(msg.attachment_size / 1024) + " KB")}`
                                          : (msg.attachment?.size || "Attachment")}
                                      </p>
                                    </div>
                                  </div>
                                  {fileUrl && (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={fileName}
                                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                                      title="Download file"
                                    >
                                      <Download className="size-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Timestamp & Checkmarks */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#97A0B3] select-none">
                          <span>{msg.timestamp}</span>
                          {isUser && <CheckCheck className="size-3.5 text-[#7FA0D6] ml-0.5 shrink-0" />}
                        </div>

                        {/* Reactions Badge */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="absolute -bottom-2.5 right-2 bg-[#161F2D] border border-[#2A3446] rounded-full px-1.5 py-0.5 text-[11px] shadow-md flex items-center gap-1 z-10">
                            {msg.reactions.map((r, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleAddReaction(msg.id, r.emoji)}
                                className="flex items-center gap-0.5 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span className="text-[10px] font-bold text-[#97A0B3]">{r.count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Hover Quick Reaction Bar */}
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 ${
                            isUser ? "right-0" : "left-0"
                          } bg-[#161F2D] border border-[#2A3446] rounded-full px-1.5 py-0.5 shadow-lg flex items-center gap-1 z-20`}
                        >
                          {["👍", "❤️", "😂", "🔥", "✅"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="size-5 hover:scale-125 transition-transform text-xs flex items-center justify-center cursor-pointer"
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
                            className="size-5 hover:scale-125 transition-transform text-[#97A0B3] hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                            title="More reactions"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Bottom Input Bar */}
          <div className="bg-[#161F2D] p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-[#2A3446] flex flex-col gap-2 shrink-0 z-20">
            {/* FULL EMOJI PICKER POPOVER */}
            {showEmojiPicker && (
              <div className="absolute bottom-18 left-3 sm:left-4 z-50 w-80 bg-[#161F2D] rounded-2xl p-3 shadow-2xl border border-[#2A3446] space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A3446]">
                  <div className="flex items-center gap-2">
                    <Smile className="size-4 text-[#7FA0D6]" />
                    <span className="text-xs font-bold text-white">
                      {pickerTargetMsgId ? "React with Emoji" : "Emojis"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 rounded-lg text-[#97A0B3] hover:text-white cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Categories Bar */}
                <div className="flex items-center justify-between gap-1 pb-1">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEmojiCategory(cat.id)}
                      className={`p-1.5 rounded-xl text-base transition cursor-pointer ${
                        emojiCategory === cat.id ? "bg-[#7FA0D6]/20 border border-[#7FA0D6]/40" : "hover:bg-white/[0.06]"
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Emojis Grid */}
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 bg-[#0B111C] rounded-xl">
                  {EMOJI_CATEGORIES.find((c) => c.id === emojiCategory)?.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
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
              {/* Attachment Staging Chip */}
              {selectedFile && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0B111C] border border-[#7FA0D6]/40 rounded-xl text-xs text-white shadow-md">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[#7FA0D6]/20 text-[#7FA0D6] shrink-0">
                      {selectedFile.type.startsWith("image/") ? (
                        <ImageIcon className="size-4" />
                      ) : selectedFile.type.startsWith("video/") ? (
                        <Film className="size-4" />
                      ) : selectedFile.type.startsWith("audio/") ? (
                        <Music className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-[#97A0B3]">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                    className="p-1.5 rounded-lg hover:bg-[#161F2D] text-[#97A0B3] hover:text-white cursor-pointer transition-colors"
                    title="Remove attachment"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx,.txt"
              />

              {/* Input Row */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Emoji Button */}
                <button
                  type="button"
                  disabled={activeMode === "dm" && !activeContact}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2 text-[#97A0B3] hover:text-[#7FA0D6] rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  title="Emoji"
                >
                  <Smile className="size-5" />
                </button>

                {/* Attachment Paperclip Button */}
                <button
                  type="button"
                  disabled={(activeMode === "dm" && !activeContact) || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                    selectedFile ? "text-[#7FA0D6] bg-[#7FA0D6]/15" : "text-[#97A0B3] hover:text-white"
                  }`}
                  title={selectedFile ? "Change attachment" : "Attach media or document"}
                >
                  <Paperclip className="size-5" />
                </button>

                {/* Text Input */}
                <div className="flex-1 min-w-0">
                  <input
                    ref={chatInputRef}
                    type="text"
                    disabled={activeMode === "dm" && !activeContact}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-[#0B111C] rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-[#97A0B3] focus:outline-none border border-[#2A3446] focus:border-[#7FA0D6] transition-colors"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(activeMode === "dm" && !activeContact) || (!messageText.trim() && !selectedFile) || isUploading}
                  className="px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="Send message"
                >
                  {isUploading ? (
                    <Loader2 className="size-4.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
