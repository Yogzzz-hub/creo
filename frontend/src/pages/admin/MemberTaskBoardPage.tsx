import { useState } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Activity,
  Plus,
  Play,
  Pause,
  Sparkles,
  ShieldCheck,
  Eye,
  Check,
  ArrowRight,
  Sliders,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

interface TaskDeliverable {
  id: string;
  title: string;
  client: string;
  clientColor: string;
  clientBadgeBg: string;
  format: string;
  estimatedHours: number;
  timeSpentHours?: number;
  priority: "High" | "Normal" | "Low";
  status: "assigned" | "production" | "qa" | "dispatched";
  deadline: string;
  description: string;
  tags: string[];
  progress?: number;
  renderInfo?: {
    node?: string;
    frame?: string;
    pass?: string;
  };
  reviewData?: {
    reviewer?: string;
    reviewerRole?: string;
    reviewerAvatar?: string;
    slaRemaining?: string;
    status: "Under Review" | "Revision Pending" | "Approved";
    revisionNote?: string;
    rubricChecks: {
      colorSpace: boolean;
      resolution: boolean;
      audioLoudness: boolean;
      transparency: boolean;
      namingConvention: boolean;
    };
    masterAssetUrl?: string;
    specialistNotes?: string;
    reviewTimestamp?: string;
  };
  dispatchedAt?: string;
  rating?: number;
}

const INITIAL_TASKS: TaskDeliverable[] = [
  // COLUMN 1: Assigned & Queued
  {
    id: "task-1",
    title: "TikTok Storyboard Asset Prep",
    client: "Northwind Labs",
    clientColor: "text-blue-600",
    clientBadgeBg: "bg-blue-50 text-blue-700",
    format: "9:16 Storyboard Layout",
    estimatedHours: 3.0,
    priority: "Normal",
    status: "assigned",
    deadline: "Tomorrow at 12:00 PM",
    description: "Slice 9:16 layout vectors, isolate motion depth channels, and sync Figma variants for pod motion team.",
    tags: ["Figma tokens", "3D Assets"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead",
      reviewerAvatar: "ML",
      status: "Under Review",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: false,
        transparency: true,
        namingConvention: true,
      },
      masterAssetUrl: "https://figma.com/@northwind/storyboards-v1",
      specialistNotes: "Figma vector tokens organized into 9:16 artboards.",
    },
  },
  {
    id: "task-2",
    title: "Q4 Promo Bumper Lower Thirds",
    client: "Atlas Commerce",
    clientColor: "text-purple-600",
    clientBadgeBg: "bg-purple-50 text-purple-700",
    format: "MOGRT Pack",
    estimatedHours: 4.0,
    priority: "Normal",
    status: "assigned",
    deadline: "Friday at 04:00 PM",
    description: "Prepare customizable dynamic MOGRT templates for retail clearance overlays and animated price tags.",
    tags: ["MOGRT Pack", "Pod A Library"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead",
      reviewerAvatar: "ML",
      status: "Under Review",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      },
      specialistNotes: "Dynamic text boxes and color controllers linked to Premiere Pro mogrt schema.",
    },
  },

  // COLUMN 2: In Active Production
  {
    id: "task-3",
    title: "Render 3D Product Teaser (15s Reel)",
    client: "Northwind Labs",
    clientColor: "text-blue-600",
    clientBadgeBg: "bg-blue-50 text-blue-700",
    format: "15s Kinetic Reel 4K",
    estimatedHours: 4.5,
    timeSpentHours: 3.2,
    priority: "High",
    status: "production",
    progress: 75,
    deadline: "Today in 2h",
    renderInfo: {
      node: "Node #04 Rendering",
      frame: "3840 / 5120",
      pass: "Octane cinematic pass · ACEScg profile",
    },
    description: "Render 15s kinetic cut with high-contrast text overlays and audio normalize to -14 LUFS.",
    tags: ["Cinema4D", "Octane Pass"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      status: "Under Review",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: false,
        namingConvention: true,
      },
      masterAssetUrl: "s3://creo-vault/northwind/3d-teaser-v1.4.mov",
      specialistNotes: "Frame render at 75%. Clean ACEScg pass. Motion blur calibrated at 180 degrees.",
    },
  },
  {
    id: "task-4",
    title: "Audio Stem Sync & Color Grade",
    client: "Atlas Commerce",
    clientColor: "text-purple-600",
    clientBadgeBg: "bg-purple-50 text-purple-700",
    format: "Multi-track VO & Master LUT",
    estimatedHours: 2.5,
    timeSpentHours: 1.5,
    priority: "Normal",
    status: "production",
    progress: 40,
    deadline: "Today by 06:00 PM",
    description: "Conforming multi-track VO mix, spatial SFX risers, and rec.709 LUT passes in After Effects.",
    tags: ["After Effects CC", "Rec.709"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      status: "Under Review",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      },
      specialistNotes: "Integrated Dolby Atmos downmix to stereo -14 LUFS with crisp dynamic range.",
    },
  },

  // COLUMN 3: Submitted for Lead QA
  {
    id: "task-5",
    title: "Fintech Ad Set - High Conversion",
    client: "Northwind Labs",
    clientColor: "text-blue-600",
    clientBadgeBg: "bg-blue-50 text-blue-700",
    format: "5x 6s Motion Ads",
    estimatedHours: 3.0,
    priority: "Normal",
    status: "qa",
    deadline: "Today by 05:30 PM",
    description: "5 variations of 6s animated UI mockups showcasing instant ledger settle features.",
    tags: ["Lottie", "Figma Web"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      slaRemaining: "in 45m left",
      status: "Under Review",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      },
      masterAssetUrl: "https://creo.studio/vault/northwind/fintech-ad-set-v1.2.zip",
      specialistNotes: "All 5 variations generated with clean JSON export & vector SVG layers.",
    },
  },
  {
    id: "task-6",
    title: "Brand Identity Motion Logo Lottie Export",
    client: "Northwind Labs",
    clientColor: "text-blue-600",
    clientBadgeBg: "bg-blue-50 text-blue-700",
    format: "Lottie JSON + SVG",
    estimatedHours: 2.0,
    priority: "High",
    status: "qa",
    deadline: "Today by 04:30 PM",
    description: "Vector clean-up of geometric icon reveal for production web header.",
    tags: ["Lottie", "SVG Vector"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      slaRemaining: "Revision required",
      status: "Revision Pending",
      revisionNote: "Ease out on final logo anchor needs to settle 4 frames faster to sync with the primary CTA glow.",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: false,
        transparency: true,
        namingConvention: true,
      },
      masterAssetUrl: "https://creo.studio/vault/northwind/motion-logo-v1.1.json",
      specialistNotes: "Adjusted spline tangents and exported bodymovin JSON with embedded raster assets.",
    },
  },

  // COLUMN 4: Signed Off & Dispatched
  {
    id: "task-7",
    title: "Hero 3D Visual Loop",
    client: "Northwind Labs",
    clientColor: "text-blue-600",
    clientBadgeBg: "bg-blue-50 text-blue-700",
    format: "4K ProRes 4444 Master",
    estimatedHours: 5.0,
    priority: "High",
    status: "dispatched",
    deadline: "Delivered",
    dispatchedAt: "Today at 09:42 AM",
    rating: 5.0,
    description: "Looping 4K Pro-Res render package & optimized webm fallbacks delivered to client vault.",
    tags: ["ProRes 4444", "4K HDR"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      status: "Approved",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      },
      masterAssetUrl: "https://creo.studio/vault/northwind/Northwind_Hero_3D_Visual_Loop_4K.mov",
      specialistNotes: "Signed off with 5.0 client satisfaction rating.",
    },
  },
  {
    id: "task-8",
    title: "Social Carousel Micro-animations",
    client: "Atlas Commerce",
    clientColor: "text-purple-600",
    clientBadgeBg: "bg-purple-50 text-purple-700",
    format: "6x Instagram Story Swipe Cues",
    estimatedHours: 4.0,
    priority: "Normal",
    status: "dispatched",
    deadline: "Delivered",
    dispatchedAt: "Yesterday · 4.0h",
    description: "Set of 6 swipe cue animations for mobile Instagram Stories and LinkedIn Feed ads.",
    tags: ["Stories", "Feed Ads"],
    reviewData: {
      reviewer: "Maya Lin",
      reviewerRole: "Pod Lead Reviewer",
      reviewerAvatar: "ML",
      status: "Approved",
      rubricChecks: {
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      },
      masterAssetUrl: "https://creo.studio/vault/atlas/social-carousel-pack.zip",
      specialistNotes: "Optimized for mobile load times under 350KB per animation.",
    },
  },
];

export function MemberTaskBoardPage() {
  // Tasks state
  const [tasks, setTasks] = useState<TaskDeliverable[]>(INITIAL_TASKS);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("All Clients");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [highSlaActive, setHighSlaActive] = useState(false);
  const [mobileKanbanTab, setMobileKanbanTab] = useState<"all" | "assigned" | "production" | "qa" | "dispatched">("production");

  // Daily tracker state
  const [loggedHours, setLoggedHours] = useState(6.5);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Interactive Card Modals
  const [logTimeModalCard, setLogTimeModalCard] = useState<TaskDeliverable | null>(null);
  const [logTimeInput, setLogTimeInput] = useState("0.5");

  const [updateProgressModalCard, setUpdateProgressModalCard] = useState<TaskDeliverable | null>(null);
  const [progressInput, setProgressInput] = useState(75);

  const [revisionModalCard, setRevisionModalCard] = useState<TaskDeliverable | null>(null);

  // 1. ADD DELIVERABLE MODAL STATE
  const [addDeliverableModalOpen, setAddDeliverableModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("Northwind Labs");
  const [newFormat, setNewFormat] = useState("9:16 Vertical Video (Reels/TikTok)");
  const [newEstimatedHours, setNewEstimatedHours] = useState("3.0");
  const [newPriority, setNewPriority] = useState<"High" | "Normal" | "Low">("Normal");
  const [newStatus, setNewStatus] = useState<"assigned" | "production">("assigned");
  const [newDeadline, setNewDeadline] = useState("Today by 06:00 PM");
  const [newDescription, setNewDescription] = useState("");
  const [newTagsInput, setNewTagsInput] = useState("Motion, After Effects");

  // 2. IN-TASK REVIEW & QA MODAL STATE
  const [reviewModalCard, setReviewModalCard] = useState<TaskDeliverable | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewScrub, setPreviewScrub] = useState(65);
  const [specialistNotesInput, setSpecialistNotesInput] = useState("");
  const [masterUrlInput, setMasterUrlInput] = useState("");
  const [rubricState, setRubricState] = useState({
    colorSpace: true,
    resolution: true,
    audioLoudness: true,
    transparency: true,
    namingConvention: true,
  });

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleQuickLog30m = () => {
    setLoggedHours((prev) => {
      const next = Math.min(8.0, Number((prev + 0.5).toFixed(1)));
      showToast(`+30m logged! Total today: ${next} / 8.0 hrs`);
      return next;
    });
  };

  const handleConfirmLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTimeModalCard) return;
    const added = parseFloat(logTimeInput) || 0.5;
    setLoggedHours((prev) => Number((prev + added).toFixed(1)));
    setTasks((prev) =>
      prev.map((t) =>
        t.id === logTimeModalCard.id
          ? { ...t, timeSpentHours: Number(((t.timeSpentHours || 0) + added).toFixed(1)) }
          : t
      )
    );
    showToast(`Logged ${added}h to "${logTimeModalCard.title}"!`);
    setLogTimeModalCard(null);
  };

  const handleConfirmUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateProgressModalCard) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updateProgressModalCard.id ? { ...t, progress: progressInput } : t
      )
    );
    showToast(`Progress for "${updateProgressModalCard.title}" updated to ${progressInput}%!`);
    setUpdateProgressModalCard(null);
  };

  // Handle Add Deliverable Submission
  const handleCreateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const clientColors: Record<string, { color: string; bg: string }> = {
      "Northwind Labs": { color: "text-blue-600", bg: "bg-blue-50 text-blue-700" },
      "Atlas Commerce": { color: "text-purple-600", bg: "bg-purple-50 text-purple-700" },
      "Bloom Studio": { color: "text-pink-600", bg: "bg-pink-50 text-pink-700" },
      "Apex Digital": { color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700" },
    };

    const clientStyling = clientColors[newClient] || {
      color: "text-blue-600",
      bg: "bg-blue-50 text-blue-700",
    };

    const parsedTags = newTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newTask: TaskDeliverable = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      client: newClient,
      clientColor: clientStyling.color,
      clientBadgeBg: clientStyling.bg,
      format: newFormat,
      estimatedHours: parseFloat(newEstimatedHours) || 3.0,
      priority: newPriority,
      status: newStatus,
      deadline: newDeadline,
      description: newDescription.trim() || `Production deliverable for ${newClient} (${newFormat}).`,
      tags: parsedTags.length > 0 ? parsedTags : ["Motion", "Deliverable"],
      progress: newStatus === "production" ? 10 : 0,
      reviewData: {
        reviewer: "Maya Lin",
        reviewerRole: "Pod Lead Reviewer",
        reviewerAvatar: "ML",
        status: "Under Review",
        rubricChecks: {
          colorSpace: true,
          resolution: true,
          audioLoudness: true,
          transparency: true,
          namingConvention: true,
        },
        specialistNotes: newDescription.trim() || "Asset created for sprint queue.",
      },
    };

    setTasks((prev) => [newTask, ...prev]);
    showToast(`✨ Deliverable "${newTask.title}" added to sprint board!`);
    setAddDeliverableModalOpen(false);

    // Reset Form
    setNewTitle("");
    setNewDescription("");
    setNewEstimatedHours("3.0");
  };

  // Open In-Task Review Modal
  const handleOpenReviewModal = (task: TaskDeliverable) => {
    setReviewModalCard(task);
    setIsPlayingPreview(false);
    setPreviewScrub(task.progress || 60);
    setSpecialistNotesInput(task.reviewData?.specialistNotes || "");
    setMasterUrlInput(task.reviewData?.masterAssetUrl || "https://creo.studio/vault/renders/" + task.id + ".mov");
    if (task.reviewData?.rubricChecks) {
      setRubricState(task.reviewData.rubricChecks);
    } else {
      setRubricState({
        colorSpace: true,
        resolution: true,
        audioLoudness: true,
        transparency: true,
        namingConvention: true,
      });
    }
  };

  // Submit Task to Lead QA via In-Task Review
  const handleSubmitToLeadQA = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "qa",
              reviewData: {
                ...t.reviewData,
                status: "Under Review",
                reviewer: "Maya Lin",
                reviewerRole: "Pod Lead Reviewer",
                reviewerAvatar: "ML",
                slaRemaining: "in 1h 15m",
                specialistNotes: specialistNotesInput,
                masterAssetUrl: masterUrlInput,
                rubricChecks: rubricState,
                reviewTimestamp: "Submitted just now",
              },
            }
          : t
      )
    );
    showToast(`🚀 "${reviewModalCard?.title}" submitted to Pod Lead Maya Lin for QA!`);
    setReviewModalCard(null);
  };

  // Fast-Track Approval / Dispatch
  const handleFastTrackDispatch = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "dispatched",
              dispatchedAt: "Just now",
              rating: 5.0,
              reviewData: {
                ...t.reviewData,
                status: "Approved",
                rubricChecks: rubricState,
                specialistNotes: specialistNotesInput,
                masterAssetUrl: masterUrlInput,
              },
            }
          : t
      )
    );
    showToast(`🎉 "${reviewModalCard?.title}" signed off and dispatched to client vault!`);
    setReviewModalCard(null);
  };

  // Move Task to Next Status
  const handleMoveStatus = (taskId: string, targetStatus: TaskDeliverable["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    showToast(`Task moved to ${targetStatus.toUpperCase()}!`);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      task.format.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient =
      selectedClient === "All Clients" || task.client.toLowerCase().includes(selectedClient.toLowerCase());

    const matchesUrgency =
      urgencyFilter === "All" || task.priority.toLowerCase() === urgencyFilter.toLowerCase();

    const matchesHighSla = !highSlaActive || task.priority === "High";

    return matchesSearch && matchesClient && matchesUrgency && matchesHighSla;
  });

  const assignedTasks = filteredTasks.filter((t) => t.status === "assigned");
  const productionTasks = filteredTasks.filter((t) => t.status === "production");
  const qaTasks = filteredTasks.filter((t) => t.status === "qa");
  const dispatchedTasks = filteredTasks.filter((t) => t.status === "dispatched");

  const rubricPassedCount = Object.values(rubricState).filter(Boolean).length;

  return (
    <div data-surface="ops" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="My Tasks" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Header Filter & Action Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-100 shadow-2xs sm:shadow-none">
          <div className="flex flex-1 items-center gap-2.5 w-full xl:max-w-xl">
            <div className="relative w-full">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks by client, format, tag, or title..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Client Filter Pills */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200/80 shadow-2xs text-xs font-bold overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "All Clients", count: tasks.length },
                { label: "Northwind", count: tasks.filter((t) => t.client.includes("Northwind")).length },
                { label: "Atlas", count: tasks.filter((t) => t.client.includes("Atlas")).length },
                { label: "Bloom", count: tasks.filter((t) => t.client.includes("Bloom")).length },
              ].map((c) => (
                <button
                  key={c.label}
                  onClick={() =>
                    setSelectedClient(
                      c.label === "Northwind"
                        ? "Northwind Labs"
                        : c.label === "Atlas"
                        ? "Atlas Commerce"
                        : c.label === "Bloom"
                        ? "Bloom Studio"
                        : "All Clients"
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 text-xs ${
                    (selectedClient === "All Clients" && c.label === "All Clients") ||
                    selectedClient.includes(c.label)
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Urgency Selector */}
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="All">Urgency: All</option>
                <option value="High">High Urgency</option>
                <option value="Normal">Normal Sprint</option>
              </select>

              <button
                onClick={() => {
                  setHighSlaActive(!highSlaActive);
                  showToast(
                    highSlaActive ? "Disabled High SLA Filter" : "Filtered to High SLA Urgency tasks",
                    "info"
                  );
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  highSlaActive
                    ? "bg-rose-500 text-white border-rose-500 shadow-2xs"
                    : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50 shadow-2xs"
                }`}
              >
                <span>+ High SLA</span>
              </button>

              {/* + ADD DELIVERABLE PRIMARY ACTION */}
              <button
                onClick={() => setAddDeliverableModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Plus className="size-3.5" />
                <span>+ Add Deliverable</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Kanban Tab Selector (< md) */}
        <div className="flex md:hidden items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setMobileKanbanTab("all")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "all" ? "bg-slate-900 text-white shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            All ({filteredTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("assigned")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "assigned" ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            Queued ({assignedTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("production")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "production" ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            Active ({productionTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("qa")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "qa" ? "bg-amber-500 text-white shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            Lead QA ({qaTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("dispatched")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "dispatched" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            Dispatched ({dispatchedTasks.length})
          </button>
        </div>

        {/* 2. Four Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-start">
          {/* COLUMN 1: Assigned & Queued */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "assigned" ? "block" : "hidden md:block"
            } bg-slate-100/60 rounded-2xl p-3 border border-slate-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Assigned & Queued
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setNewStatus("assigned");
                    setAddDeliverableModalOpen(true);
                  }}
                  className="size-5 rounded-md bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center border border-slate-200 transition-colors cursor-pointer"
                  title="Add Deliverable to Queue"
                >
                  <Plus className="size-3" />
                </button>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white text-slate-700 border border-slate-200">
                  {assignedTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {assignedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    <span className="text-slate-400 font-mono">⏱ {task.estimatedHours}h</span>
                  </div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">{task.format}</span>
                    {task.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium">📅 {task.deadline}</span>
                    <button
                      onClick={() => handleMoveStatus(task.id, "production")}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight className="size-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {assignedTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-medium bg-white/50 rounded-xl border border-dashed border-slate-200">
                  No queued deliverables
                </div>
              )}

              <button
                onClick={() => {
                  setNewStatus("assigned");
                  setAddDeliverableModalOpen(true);
                }}
                className="w-full text-center py-2 text-[10px] text-slate-500 hover:text-blue-600 font-bold border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="size-3" />
                <span>+ Add to Queue</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: In Active Production */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "production" ? "block" : "hidden md:block"
            } bg-slate-100/60 rounded-2xl p-3 border border-slate-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  In Production
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white text-slate-700 border border-slate-200">
                {productionTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {productionTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    {task.priority === "High" ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[8px] font-black">
                        ⏱ {task.deadline}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">⏱ {task.estimatedHours}h</span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>

                  {/* Optional Render Graphic Preview */}
                  {task.renderInfo ? (
                    <div className="h-14 rounded-lg bg-slate-900 flex items-center justify-center relative overflow-hidden border border-slate-800">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 via-blue-600/20 to-purple-600/30" />
                      <div className="z-10 text-center text-cyan-300 text-[9px] font-mono">
                        <div className="font-bold">{task.renderInfo.node}</div>
                        <div className="text-[8px] opacity-80">{task.renderInfo.frame}</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Progress Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>Progress</span>
                      <span className="text-blue-600">{task.progress || 50}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${task.progress || 50}%` }}
                      />
                    </div>
                  </div>

                  {/* In-Task Actions */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={() => setLogTimeModalCard(task)}
                      className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Clock className="size-2.5 text-slate-500" />
                      <span>Log Time</span>
                    </button>
                    <button
                      onClick={() => {
                        setProgressInput(task.progress || 50);
                        setUpdateProgressModalCard(task);
                      }}
                      className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sliders className="size-2.5 text-slate-500" />
                      <span>Progress</span>
                    </button>
                  </div>

                  {/* Primary In-Task Review Action */}
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="size-3" />
                      <span>In-Task Review & Submit</span>
                    </button>
                  </div>
                </div>
              ))}

              {productionTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-medium bg-white/50 rounded-xl border border-dashed border-slate-200">
                  No deliverables in production
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: Submitted for Lead QA */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "qa" ? "block" : "hidden md:block"
            } bg-slate-100/60 rounded-2xl p-3 border border-slate-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Submitted for QA
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white text-slate-700 border border-slate-200">
                {qaTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {qaTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl p-3 border shadow-2xs hover:shadow-xs transition-all space-y-2 ${
                    task.reviewData?.status === "Revision Pending"
                      ? "border-amber-300 ring-1 ring-amber-200/50"
                      : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    {task.reviewData?.status === "Revision Pending" ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9px] font-bold">
                        Revision Pending
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px]">
                        Under Review
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>

                  {/* Reviewer Lead Badge */}
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 text-xs font-bold text-slate-700">
                    <div className="size-5 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                      {task.reviewData?.reviewerAvatar || "ML"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px]">{task.reviewData?.reviewer || "Maya Lin"}</div>
                      <span className="text-[9px] text-slate-400 block font-normal">
                        {task.reviewData?.reviewerRole || "Lead Reviewer"}
                      </span>
                    </div>
                  </div>

                  {/* Revision Note Box if Active */}
                  {task.reviewData?.revisionNote && (
                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-xs space-y-0.5">
                      <div className="flex justify-between font-bold text-amber-900 text-[10px]">
                        <span>1 Tweak Required</span>
                        <span className="text-amber-700">Feedback</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-snug italic">
                        "{task.reviewData.revisionNote}"
                      </p>
                    </div>
                  )}

                  {/* In-Task Review Action */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className="flex-1 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="size-3" />
                      <span>Inspect Rubric</span>
                    </button>
                    <button
                      onClick={() => handleFastTrackDispatch(task.id)}
                      className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                      title="Fast-Track Sign-off"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {qaTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-medium bg-white/50 rounded-xl border border-dashed border-slate-200">
                  No deliverables waiting in QA
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 4: Signed Off & Dispatched */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "dispatched" ? "block" : "hidden md:block"
            } bg-slate-100/60 rounded-2xl p-3 border border-slate-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Signed Off
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {dispatchedTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {dispatchedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold flex items-center gap-0.5">
                      <Check className="size-2.5" /> Approved
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>{task.dispatchedAt || "Today"}</span>
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className="font-bold text-blue-600 hover:text-blue-800 text-[10px] cursor-pointer flex items-center gap-0.5"
                    >
                      <span>QA Ledger</span>
                      <ArrowRight className="size-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {dispatchedTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-medium bg-white/50 rounded-xl border border-dashed border-slate-200">
                  No dispatched deliverables yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Bottom Widget: Personal Daily Time Tracker & Productivity Pulse */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                <Clock className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-black text-[#0F172A]">
                    Personal Daily Time Tracker & Productivity Pulse
                  </h3>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Pacing on Track
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Workstation timers & production sprint pacing
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#0F172A]">{loggedHours}</span>
                <span className="text-xs font-bold text-slate-400">/ 8.0 hrs</span>
              </div>
              <button
                onClick={handleQuickLog30m}
                className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                + Log 30m
              </button>
            </div>
          </div>

          {/* Segmented Timeline */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <span className="size-2 rounded-full bg-blue-600" />
                3D Rendering (3.5h)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <span className="size-2 rounded-full bg-indigo-500" />
                AE Compositing (2.0h)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <span className="size-2 rounded-full bg-sky-400" />
                Pod Standup (1.0h)
              </span>
              <span className="text-slate-400 ml-auto text-[10px] sm:text-[11px]">
                Remaining: {(8.0 - loggedHours).toFixed(1)}h
              </span>
            </div>

            <div className="w-full h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-600" style={{ width: "43.75%" }} />
              <div className="h-full bg-indigo-500" style={{ width: "25%" }} />
              <div className="h-full bg-sky-400" style={{ width: "12.5%" }} />
            </div>

            <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono pt-1">
              <span>09:00 AM</span>
              <span>11:00 AM</span>
              <span>01:00 PM</span>
              <span>03:00 PM</span>
              <span className="text-slate-700 font-bold">05:00 PM (Target)</span>
            </div>
          </div>

          {/* Bottom 3 Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <div className="font-bold text-slate-900">Sprint Velocity</div>
                <div className="text-[11px] text-slate-500">104% of Pod Baseline</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="font-bold text-slate-900">QA Pass Rate First Run</div>
                <div className="text-[11px] text-slate-500">92.4% (Quarter to Date)</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                ❄️
              </div>
              <div>
                <div className="font-bold text-slate-900">Active Pod Sync</div>
                <div className="text-[11px] text-slate-500">3 Hand-offs Pending Sync</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">creo.</span>
            <span>Team Member Workstation – Pod A Studio Operations</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>© 2025 Creo Design Systems. Confidential</span>
            <span className="hover:underline cursor-pointer">Security & Compliance</span>
          </div>
        </footer>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          1. MODAL: ADD DELIVERABLE DIRECTLY TO TASK BOARD
      ───────────────────────────────────────────────────────────── */}
      {addDeliverableModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setAddDeliverableModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Deliverable</h3>
                  <p className="text-xs text-slate-500">Create and queue a creative asset on the board</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddDeliverableModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deliverable Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 3D Hologram Logo Animation 4K"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Allocation</label>
                  <select
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="Northwind Labs">Northwind Labs</option>
                    <option value="Atlas Commerce">Atlas Commerce</option>
                    <option value="Bloom Studio">Bloom Studio</option>
                    <option value="Apex Digital">Apex Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deliverable Format / Type</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="9:16 Vertical Video (Reels/TikTok)">9:16 Vertical Video (Reels/TikTok)</option>
                    <option value="16:9 4K Master Render (ProRes 4444)">16:9 4K Master Render (ProRes 4444)</option>
                    <option value="MOGRT Motion Graphics Template">MOGRT Motion Graphics Template</option>
                    <option value="Lottie JSON / SVG Animation">Lottie JSON / SVG Animation</option>
                    <option value="Figma Design Tokens & Artboards">Figma Design Tokens & Artboards</option>
                    <option value="3D Cinema4D / Octane Render Pass">3D Cinema4D / Octane Render Pass</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Est. Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="40"
                    required
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sprint Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="High">P1 - High SLA Urgency</option>
                    <option value="Normal">P2 - Normal Sprint</option>
                    <option value="Low">P3 - Low / Backlog</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Column</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="assigned">Assigned & Queued</option>
                    <option value="production">In Active Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Delivery Deadline</label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  placeholder="e.g. Today by 06:00 PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deliverable Scope & Brief Notes</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specific render resolution, color profile, audio loudness specs, or asset guidelines..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                  placeholder="e.g. Cinema4D, Octane, 4K ProRes, MOGRT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddDeliverableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Create Deliverable</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. MODAL: IN-TASK REVIEW & QA INSPECTION SYSTEM
      ───────────────────────────────────────────────────────────── */}
      {reviewModalCard && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setReviewModalCard(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4.5 animate-scale-up max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <ShieldCheck className="size-5.5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${reviewModalCard.clientBadgeBg}`}>
                      {reviewModalCard.client}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {reviewModalCard.format}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                      Status: {reviewModalCard.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {reviewModalCard.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalCard(null)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Interactive Master Render Preview Screen */}
            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] text-cyan-300 font-bold">MASTER RENDER INSPECTION</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">ACEScg • 4K 3840x2160 @ 60 FPS</span>
              </div>

              {/* Video Inspection Simulation Canvas */}
              <div className="h-32 sm:h-40 rounded-xl bg-slate-900 relative overflow-hidden flex items-center justify-center border border-slate-800/80">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 via-blue-900/30 to-purple-900/40 animate-pulse" />
                <div className="z-10 text-center space-y-1.5 p-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="size-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center mx-auto transition-all cursor-pointer active:scale-95 shadow-lg"
                  >
                    {isPlayingPreview ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
                  </button>
                  <div className="text-[11px] font-mono text-slate-300 font-bold">
                    {isPlayingPreview ? "Live Playback Active" : "Click to Preview Master Motion Playback"}
                  </div>
                  <div className="text-[9px] font-mono text-cyan-400">
                    Frame {Math.round((previewScrub / 100) * 5120)} / 5120 • 00:0{Math.floor((previewScrub / 100) * 15)}:12
                  </div>
                </div>

                {/* Waveform preview at bottom */}
                <div className="absolute bottom-2 inset-x-3 flex items-center justify-between gap-1 opacity-60 pointer-events-none">
                  {[20, 45, 80, 60, 90, 40, 75, 100, 65, 30, 85, 95, 40, 70, 50, 90, 60, 30, 80, 50].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-cyan-400/80 rounded-full"
                        style={{ height: `${(h * (previewScrub / 100) + 15) % 24}px` }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Playhead Scrub Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>00:00:00</span>
                  <span className="text-cyan-400 font-bold">Timeline Scrub: {previewScrub}%</span>
                  <span>00:15:00</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={previewScrub}
                  onChange={(e) => setPreviewScrub(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* QA Quality Rubric Checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-blue-600" />
                  <span className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    Studio QA Quality Rubric
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  {rubricPassedCount}/5 Passed ({Math.round((rubricPassedCount / 5) * 100)}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.colorSpace}
                    onChange={(e) => setRubricState({ ...rubricState, colorSpace: e.target.checked })}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">ACEScg / Rec.709 Color Space</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.resolution}
                    onChange={(e) => setRubricState({ ...rubricState, resolution: e.target.checked })}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">Resolution & Framerate Locked</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.audioLoudness}
                    onChange={(e) => setRubricState({ ...rubricState, audioLoudness: e.target.checked })}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">Audio -14 LUFS (No Clipping)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.transparency}
                    onChange={(e) => setRubricState({ ...rubricState, transparency: e.target.checked })}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">Alpha Transparency & Motion Blur</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-blue-50/50 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={rubricState.namingConvention}
                    onChange={(e) => setRubricState({ ...rubricState, namingConvention: e.target.checked })}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">
                    Clean Naming Convention (`{reviewModalCard.client.split(" ")[0]}_Master_v1.0.mov`)
                  </span>
                </label>
              </div>
            </div>

            {/* Master Asset File Link / Dropzone */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Master Asset S3 / Vault Package URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={masterUrlInput}
                  onChange={(e) => setMasterUrlInput(e.target.value)}
                  placeholder="https://creo.studio/vault/northwind/master-render.mov"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-[11px] text-blue-600"
                />
                <button
                  type="button"
                  onClick={() => showToast("Validated asset URL hash!")}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Specialist Delivery Remarks */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Specialist Notes for Pod Lead (Maya Lin)</label>
              <textarea
                rows={2}
                value={specialistNotesInput}
                onChange={(e) => setSpecialistNotesInput(e.target.value)}
                placeholder="Detail any key visual decisions, alpha channels, or render layer caches..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Revision feedback note if existing */}
            {reviewModalCard.reviewData?.revisionNote && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-amber-900 text-[11px]">
                  <span>Prior Lead Review Feedback</span>
                  <span className="text-amber-700">Maya Lin</span>
                </div>
                <p className="text-amber-800 leading-relaxed font-medium italic">
                  "{reviewModalCard.reviewData.revisionNote}"
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setReviewModalCard(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close Window
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleFastTrackDispatch(reviewModalCard.id)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="size-3.5" />
                  <span>Direct Sign-Off</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitToLeadQA(reviewModalCard.id)}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="size-3.5" />
                  <span>Submit to Pod Lead QA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL: LOG TIME ON TASK
      ───────────────────────────────────────────────────────────── */}
      {logTimeModalCard && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLogTimeModalCard(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Task Sprint Time</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{logTimeModalCard.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogTimeModalCard(null)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLogTime} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hours to Add</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={logTimeInput}
                  onChange={(e) => setLogTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLogTimeModalCard(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Confirm & Log Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL: UPDATE TASK PROGRESS
      ───────────────────────────────────────────────────────────── */}
      {updateProgressModalCard && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setUpdateProgressModalCard(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Activity className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Update Render Progress</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{updateProgressModalCard.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpdateProgressModalCard(null)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdateProgress} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Completion Percentage</span>
                  <span className="text-blue-600">{progressInput}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressInput}
                  onChange={(e) => setProgressInput(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateProgressModalCard(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: VIEW REVISION REQUEST
      ───────────────────────────────────────────────────────────── */}
      {revisionModalCard && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setRevisionModalCard(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Lead QA Revision Request</h3>
                  <p className="text-xs text-slate-500">Maya Lin · Pod A Motion Lead</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModalCard(null)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
              <div className="font-bold text-amber-900">{revisionModalCard.title}</div>
              <p className="text-amber-800 leading-relaxed font-medium italic">
                "{revisionModalCard.reviewData?.revisionNote}"
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevisionModalCard(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const card = revisionModalCard;
                  setRevisionModalCard(null);
                  handleOpenReviewModal(card);
                }}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Eye className="size-3.5" />
                <span>Open In-Task Review Canvas &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
