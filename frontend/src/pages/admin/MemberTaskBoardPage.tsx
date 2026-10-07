import { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Activity,
  Plus,
  Sparkles,
  ShieldCheck,
  Eye,
  Check,
  ArrowRight,
  Sliders,
  Upload,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { CustomSelect } from "../../components/ui/CustomSelect";

import { useAuth } from "../../lib/auth-context";

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

const INITIAL_TASKS: TaskDeliverable[] = [];

export function MemberTaskBoardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
  });
  const podName = data?.pod?.name || "Pod A";
  const members = data?.members || [];
  const leadMember = members.find((m) => m.role?.toLowerCase().includes("lead"));
  const leadName = leadMember?.full_name || "Pod Lead";
  const clients = data?.clients || [];

  // Tasks state
  const [tasks, setTasks] = useState<TaskDeliverable[]>(INITIAL_TASKS);

  useEffect(() => {
    if (isAdmin) {
      // 0 Tasks for Admin as requested
      setTasks([]);
      return;
    }
    if (data?.tasks) {
      const mapped: TaskDeliverable[] = [
        ...(data.tasks.backlog || []).map((t) => ({
          id: t.id,
          title: t.blueprint?.concept_name || t.deliverable_type || "Sprint Task",
          client: t.client_name || "Client",
          clientColor: "text-[#7FA0D6]",
          clientBadgeBg: "bg-[#7FA0D6]/15 text-[#7FA0D6]",
          format: t.deliverable_type || "Format",
          estimatedHours: 4.0,
          priority: "Normal" as const,
          status: "assigned" as const,
          deadline: "Active Sprint",
          description: `Sprint task assigned to ${t.assignee?.full_name || t.assignee_name || "specialist"}.`,
          tags: [t.deliverable_type || "Deliverable"],
          reviewData: {
            reviewer: leadName,
            reviewerRole: "Pod Lead",
            reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
            status: "Under Review" as const,
            rubricChecks: { colorSpace: true, resolution: true, audioLoudness: true, transparency: true, namingConvention: true },
            specialistNotes: "Assigned for sprint cadence.",
          },
        })),
        ...(data.tasks.in_production || []).map((t) => ({
          id: t.id,
          title: t.blueprint?.concept_name || t.deliverable_type || "Production Task",
          client: t.client_name || "Client",
          clientColor: "text-blue-500",
          clientBadgeBg: "bg-blue-500/15 text-blue-400",
          format: t.deliverable_type || "Format",
          estimatedHours: 4.0,
          priority: "High" as const,
          status: "production" as const,
          deadline: "In Progress",
          description: `In active production with ${t.assignee?.full_name || t.assignee_name || "specialist"}.`,
          tags: [t.deliverable_type || "Deliverable"],
          progress: 50,
          reviewData: {
            reviewer: leadName,
            reviewerRole: "Pod Lead",
            reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
            status: "Under Review" as const,
            rubricChecks: { colorSpace: true, resolution: true, audioLoudness: true, transparency: true, namingConvention: true },
            specialistNotes: "Rendering and active editing.",
          },
        })),
        ...(data.tasks.internal_qa || []).map((t) => ({
          id: t.id,
          title: t.blueprint?.concept_name || t.deliverable_type || "QA Review Task",
          client: t.client_name || "Client",
          clientColor: "text-amber-500",
          clientBadgeBg: "bg-amber-500/15 text-amber-400",
          format: t.deliverable_type || "Format",
          estimatedHours: 4.0,
          priority: "High" as const,
          status: "qa" as const,
          deadline: "Under QA Review",
          description: `Pending lead sign-off by ${leadName}.`,
          tags: [t.deliverable_type || "Deliverable"],
          progress: 90,
          reviewData: {
            reviewer: leadName,
            reviewerRole: "Pod Lead",
            reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
            status: "Under Review" as const,
            rubricChecks: { colorSpace: true, resolution: true, audioLoudness: true, transparency: true, namingConvention: true },
            specialistNotes: "Ready for quality rubric check.",
          },
        })),
        ...(data.tasks.ready_to_publish || []).map((t) => ({
          id: t.id,
          title: t.blueprint?.concept_name || t.deliverable_type || "Delivered Asset",
          client: t.client_name || "Client",
          clientColor: "text-emerald-500",
          clientBadgeBg: "bg-emerald-500/15 text-emerald-400",
          format: t.deliverable_type || "Format",
          estimatedHours: 4.0,
          priority: "Normal" as const,
          status: "dispatched" as const,
          deadline: "Completed",
          description: "Approved and ready for client handoff.",
          tags: [t.deliverable_type || "Deliverable"],
          progress: 100,
          reviewData: {
            reviewer: leadName,
            reviewerRole: "Pod Lead",
            reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
            status: "Approved" as const,
            rubricChecks: { colorSpace: true, resolution: true, audioLoudness: true, transparency: true, namingConvention: true },
            specialistNotes: "Sign-off complete.",
          },
        })),
      ];
      setTasks(mapped);
    }
  }, [data, leadName, isAdmin]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("All Clients");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [highSlaActive, setHighSlaActive] = useState(false);
  const [mobileKanbanTab, setMobileKanbanTab] = useState<"all" | "assigned" | "production" | "qa" | "dispatched">("production");

  // Daily tracker state
  
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
  const [newClient, setNewClient] = useState("Pod Client Workspace");
  const [newFormat, setNewFormat] = useState("9:16 Vertical Video (Reels/TikTok)");
  const [newEstimatedHours, setNewEstimatedHours] = useState("3.0");
  const [newPriority, setNewPriority] = useState<"High" | "Normal" | "Low">("Normal");
  const [newStatus, setNewStatus] = useState<"assigned" | "production">("assigned");
  const [newDeadline, setNewDeadline] = useState("Today by 06:00 PM");
  const [newDescription, setNewDescription] = useState("");
  const [newTagsInput, setNewTagsInput] = useState("Motion, After Effects");

  // 2. IN-TASK REVIEW & QA MODAL STATE
  const [reviewModalCard, setReviewModalCard] = useState<TaskDeliverable | null>(null);
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

  

  const handleConfirmLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTimeModalCard) return;
    const added = parseFloat(logTimeInput) || 0.5;
    
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

    const clientStyling = {
      color: "text-[#7FA0D6]",
      bg: "bg-[#7FA0D6]/15 text-[#7FA0D6]",
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
        reviewer: leadName,
        reviewerRole: "Pod Lead Reviewer",
        reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
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
                reviewer: leadName,
                reviewerRole: "Pod Lead Reviewer",
                reviewerAvatar: leadName.slice(0, 2).toUpperCase(),
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
    showToast(`🚀 "${reviewModalCard?.title}" submitted to Pod Lead ${leadName} for QA!`);
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
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="My Tasks" />

      {/* Main Container */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-blue-800"
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-[#161F2D] sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#2A3446] shadow-2xs sm:shadow-none">
          <div className="flex flex-1 items-center gap-2.5 w-full xl:max-w-xl">
            <div className="relative w-full">
              <Search className="size-3.5 text-[#97A0B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks by client, format, tag, or title..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 text-xs font-medium placeholder:text-[#97A0B3] focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Client Filter Pills */}
            <div className="flex items-center gap-1 bg-[#161F2D] p-0.5 rounded-xl border border-[#2A3446]/80 shadow-2xs text-xs font-bold overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "All Clients", value: "All Clients", count: tasks.length },
                ...clients.map((c) => ({
                  label: c.name,
                  value: c.name,
                  count: tasks.filter((t) => t.client.toLowerCase() === c.name.toLowerCase()).length,
                })),
              ].map((c) => (
                <button
                  key={c.label}
                  onClick={() => setSelectedClient(c.value)}
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 text-xs ${
                    selectedClient === c.value
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "text-[#F1F5F9] hover:text-white"
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Urgency Selector with Curved Dropdown */}
              <CustomSelect
                value={urgencyFilter}
                onChange={setUrgencyFilter}
                options={[
                  { value: "All", label: "Urgency: All" },
                  { value: "High", label: "High Urgency" },
                  { value: "Normal", label: "Normal Sprint" },
                ]}
              />

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
                    : "bg-[#161F2D] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shadow-2xs"
                }`}
              >
                <span>+ High SLA</span>
              </button>

              {/* ADD DELIVERABLE PRIMARY ACTION (Single Plus Symbol) */}
              <button
                onClick={() => setAddDeliverableModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Plus className="size-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Kanban Tab Selector (< md) */}
        <div className="flex md:hidden items-center bg-[#161F2D] p-1 rounded-xl border border-[#2A3446] shadow-2xs text-xs font-bold overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setMobileKanbanTab("all")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "all" ? "bg-slate-900 text-white shadow-2xs font-bold" : "text-[#F1F5F9]"
            }`}
          >
            All ({filteredTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("assigned")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "assigned" ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-[#F1F5F9]"
            }`}
          >
            Queued ({assignedTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("production")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "production" ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-[#F1F5F9]"
            }`}
          >
            Active ({productionTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("qa")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "qa" ? "bg-amber-500 text-white shadow-2xs font-bold" : "text-[#F1F5F9]"
            }`}
          >
            Lead QA ({qaTasks.length})
          </button>
          <button
            onClick={() => setMobileKanbanTab("dispatched")}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              mobileKanbanTab === "dispatched" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "text-[#F1F5F9]"
            }`}
          >
            Dispatched ({dispatchedTasks.length})
          </button>
        </div>

        {/* 2. Four Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch h-[560px] sm:h-[600px] lg:h-[calc(100vh-270px)] min-h-[500px]">
          {/* COLUMN 1: Assigned & Queued */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "assigned" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D]/60 rounded-2xl p-3 border border-[#2A3446]/70 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">
                  Assigned & Queued
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setNewStatus("assigned");
                    setAddDeliverableModalOpen(true);
                  }}
                  className="size-5 rounded-md bg-[#161F2D] hover:bg-[#7FA0D6]/15 text-[#97A0B3] hover:text-[#7FA0D6] flex items-center justify-center border border-[#2A3446] transition-colors cursor-pointer"
                  title="Add Deliverable to Queue"
                >
                  <Plus className="size-3" />
                </button>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446]">
                  {assignedTasks.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {assignedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    <span className="text-[#97A0B3] font-mono">⏱ {task.estimatedHours}h</span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-[#97A0B3] line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
                    <span className="px-1.5 py-0.2 rounded bg-[#7FA0D6]/15 text-[#7FA0D6]">{task.format}</span>
                    {task.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.2 rounded bg-[#161F2D] text-[#F1F5F9]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[10px]">
                    <span className="text-[#97A0B3] font-medium">📅 {task.deadline}</span>
                    <button
                      onClick={() => handleMoveStatus(task.id, "production")}
                      className="px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight className="size-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {assignedTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-[#97A0B3] font-medium bg-[#161F2D]/50 rounded-xl border border-dashed border-[#2A3446]">
                  No queued deliverables
                </div>
              )}

              <button
                onClick={() => {
                  setNewStatus("assigned");
                  setAddDeliverableModalOpen(true);
                }}
                className="w-full text-center py-2 text-[10px] sm:text-xs text-[#97A0B3] hover:text-[#7FA0D6] font-bold border border-dashed border-[#2A3446] hover:border-blue-300 hover:bg-[#7FA0D6]/15/40 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="size-3.5" />
                <span>Add to Queue</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: In Active Production */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "production" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D]/60 rounded-2xl p-3 border border-[#2A3446]/70 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">
                  In Production
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446]">
                {productionTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {productionTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    {task.priority === "High" ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[8px] font-black">
                        ⏱ {task.deadline}
                      </span>
                    ) : (
                      <span className="text-[#97A0B3] font-mono">⏱ {task.estimatedHours}h</span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-white leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-[#97A0B3] line-clamp-2">{task.description}</p>

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
                    <div className="flex justify-between text-[9px] font-bold text-[#97A0B3]">
                      <span>Progress</span>
                      <span className="text-[#7FA0D6]">{task.progress || 50}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#161F2D] rounded-full overflow-hidden">
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
                      className="py-1 px-1.5 rounded-lg bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Clock className="size-2.5 text-[#97A0B3]" />
                      <span>Log Time</span>
                    </button>
                    <button
                      onClick={() => {
                        setProgressInput(task.progress || 50);
                        setUpdateProgressModalCard(task);
                      }}
                      className="py-1 px-1.5 rounded-lg bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sliders className="size-2.5 text-[#97A0B3]" />
                      <span>Progress</span>
                    </button>
                  </div>

                  {/* Primary In-Task Review Action */}
                  <div className="pt-1.5 border-t border-[#2A3446]">
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
                <div className="text-center py-4 text-xs text-[#97A0B3] font-medium bg-[#161F2D]/50 rounded-xl border border-dashed border-[#2A3446]">
                  No deliverables in production
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: Submitted for Lead QA */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "qa" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D]/60 rounded-2xl p-3 border border-[#2A3446]/70 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">
                  Submitted for QA
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446]">
                {qaTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {qaTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-[#161F2D] rounded-xl p-3 border shadow-2xs hover-card-innovative space-y-2 ${
                    task.reviewData?.status === "Revision Pending"
                      ? "border-amber-300 ring-1 ring-amber-200/50"
                      : "border-[#2A3446]/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    {task.reviewData?.status === "Revision Pending" ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9px] font-bold">
                        Revision Pending
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-[#7FA0D6]/15 text-[#7FA0D6] text-[9px]">
                        Under Review
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-white leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-[#97A0B3] line-clamp-2">{task.description}</p>

                  {/* Reviewer Lead Badge */}
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#0B111C] text-xs font-bold text-[#F1F5F9]">
                    <div className="size-5 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                      {task.reviewData?.reviewerAvatar || "ML"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px]">{task.reviewData?.reviewer || leadName}</div>
                      <span className="text-[9px] text-[#97A0B3] block font-normal">
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
                  <div className="pt-1.5 border-t border-[#2A3446] flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className="flex-1 py-1 rounded-lg border border-[#7FA0D6]/30 text-[#7FA0D6] hover:bg-[#7FA0D6]/15 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
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
                <div className="text-center py-4 text-xs text-[#97A0B3] font-medium bg-[#161F2D]/50 rounded-xl border border-dashed border-[#2A3446]">
                  No deliverables waiting in QA
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 4: Signed Off & Dispatched */}
          <div
            className={`${
              mobileKanbanTab === "all" || mobileKanbanTab === "dispatched" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D]/60 rounded-2xl p-3 border border-[#2A3446]/70 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 pt-0.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">
                  Signed Off
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {dispatchedTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {dispatchedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={task.clientColor}>{task.client.toUpperCase()}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold flex items-center gap-0.5">
                      <Check className="size-2.5" /> Approved
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white leading-snug">{task.title}</h4>
                  <p className="text-[11px] text-[#97A0B3] line-clamp-2">{task.description}</p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[10px] text-[#97A0B3]">
                    <span>{task.dispatchedAt || "Today"}</span>
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className="font-bold text-[#7FA0D6] hover:text-blue-800 text-[10px] cursor-pointer flex items-center gap-0.5"
                    >
                      <span>QA Ledger</span>
                      <ArrowRight className="size-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {dispatchedTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-[#97A0B3] font-medium bg-[#161F2D]/50 rounded-xl border border-dashed border-[#2A3446]">
                  No dispatched deliverables yet
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.main>

      {/* ─────────────────────────────────────────────────────────────
          1. MODAL: ADD DELIVERABLE DIRECTLY TO TASK BOARD
      ───────────────────────────────────────────────────────────── */}
      {addDeliverableModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setAddDeliverableModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#161F2D] rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Add New Deliverable</h3>
                  <p className="text-xs text-[#97A0B3]">Create and queue a creative asset on the board</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddDeliverableModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Deliverable Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 3D Hologram Logo Animation 4K"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Client Allocation</label>
                  <select
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#161F2D]"
                  >
                    {clients.length > 0 ? (
                      clients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <option value="Pod Client Workspace">Pod Client Workspace</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Format / Type</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#161F2D]"
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
                  <label className="block font-bold text-[#F1F5F9] mb-1">Est. Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="40"
                    required
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Sprint Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#161F2D]"
                  >
                    <option value="High">P1 - High SLA Urgency</option>
                    <option value="Normal">P2 - Normal Sprint</option>
                    <option value="Low">P3 - Low / Backlog</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Initial Column</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#161F2D]"
                  >
                    <option value="assigned">Assigned & Queued</option>
                    <option value="production">In Active Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Target Delivery Deadline</label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  placeholder="e.g. Today by 06:00 PM"
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Scope & Brief Notes</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specific render resolution, color profile, audio loudness specs, or asset guidelines..."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                  placeholder="e.g. Cinema4D, Octane, 4K ProRes, MOGRT"
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setAddDeliverableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
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
            className="w-full max-w-2xl bg-[#161F2D] rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4.5 animate-scale-up max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#2A3446] pb-3 gap-2">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <ShieldCheck className="size-5.5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${reviewModalCard.clientBadgeBg}`}>
                      {reviewModalCard.client}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#161F2D] text-[#F1F5F9]">
                      {reviewModalCard.format}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#7FA0D6]/20 text-blue-800">
                      Status: {reviewModalCard.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {reviewModalCard.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalCard(null)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Deliverable Creative Requirements & Specs Card */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-2">
                <span className="text-xs font-black text-[#7FA0D6] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Deliverable Requirements & Creative Specifications
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#161F2D] text-[#BCCCE6] border border-[#2A3446]">
                  {reviewModalCard.format === "reel" || reviewModalCard.format.toLowerCase().includes("reel")
                    ? "9:16 Vertical Video (1080x1920)"
                    : reviewModalCard.format.toLowerCase().includes("story")
                    ? "9:16 Vertical Story (1080x1920)"
                    : "4:5 Portrait / 1:1 Static (1080x1350)"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446]">
                  <span className="text-[10px] font-bold text-[#97A0B3] block">Format & Aspect</span>
                  <span className="font-extrabold text-white">
                    {reviewModalCard.format.toUpperCase()} • 60 FPS
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446]">
                  <span className="text-[10px] font-bold text-[#97A0B3] block">Color & Audio Spec</span>
                  <span className="font-extrabold text-white">
                    Rec.709 • -14 LUFS Audio
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446]">
                  <span className="text-[10px] font-bold text-[#97A0B3] block">Client Brand Guidelines</span>
                  <span className="font-extrabold text-white">
                    {reviewModalCard.client} Kit v2
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#F1F5F9] font-medium leading-relaxed p-3 rounded-xl bg-[#161F2D]/60 border border-[#2A3446]/60">
                <span className="font-bold text-[#7FA0D6] block mb-0.5">Brief & Concept Notes:</span>
                {reviewModalCard.description || "High-conversion product showcase highlighting key features, bold kinetic typography, and smooth transitions."}
              </div>
            </div>

            {/* QA Quality Rubric Checklist */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#7FA0D6]" />
                  <span className="font-black text-xs text-white uppercase tracking-wider">
                    Studio QA Quality Rubric
                  </span>
                </div>
                <span className="text-xs font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30/60">
                  {rubricPassedCount}/5 Passed ({Math.round((rubricPassedCount / 5) * 100)}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer hover:bg-[#7FA0D6]/15/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.colorSpace}
                    onChange={(e) => setRubricState({ ...rubricState, colorSpace: e.target.checked })}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-[#F1F5F9]">ACEScg / Rec.709 Color Space</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer hover:bg-[#7FA0D6]/15/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.resolution}
                    onChange={(e) => setRubricState({ ...rubricState, resolution: e.target.checked })}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-[#F1F5F9]">Resolution & Framerate Locked</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer hover:bg-[#7FA0D6]/15/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.audioLoudness}
                    onChange={(e) => setRubricState({ ...rubricState, audioLoudness: e.target.checked })}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-[#F1F5F9]">Audio -14 LUFS (No Clipping)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer hover:bg-[#7FA0D6]/15/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rubricState.transparency}
                    onChange={(e) => setRubricState({ ...rubricState, transparency: e.target.checked })}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-[#F1F5F9]">Alpha Transparency & Motion Blur</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer hover:bg-[#7FA0D6]/15/50 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={rubricState.namingConvention}
                    onChange={(e) => setRubricState({ ...rubricState, namingConvention: e.target.checked })}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-[#F1F5F9]">
                    Clean Naming Convention (`{reviewModalCard.client.split(" ")[0]}_Master_v1.0.mov`)
                  </span>
                </label>
              </div>
            </div>

            {/* Direct Computer File Upload Dropzone for Deliverable (Reel, Post, Story) */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-black text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Upload className="size-3.5 text-[#7FA0D6]" />
                  Upload Deliverable File from Computer (.mp4, .mov, .png, .jpg, .gif)
                </label>
                <span className="text-[10px] font-bold text-[#97A0B3]">Max size: 2 GB</span>
              </div>

              <div className="relative border-2 border-dashed border-[#2A3446] hover:border-[#7FA0D6] bg-[#161F2D]/60 hover:bg-[#161F2D] rounded-2xl p-5 text-center transition-all cursor-pointer group">
                <input
                  type="file"
                  accept="video/*,image/*,.mp4,.mov,.png,.jpg,.jpeg,.gif,.figma"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setMasterUrlInput(`uploaded://${file.name}`);
                      showToast(`Selected file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-1.5 pointer-events-none">
                  <div className="size-10 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="size-5" />
                  </div>
                  <div className="font-bold text-white text-xs">
                    {masterUrlInput.startsWith("uploaded://")
                      ? `Selected: ${masterUrlInput.replace("uploaded://", "")}`
                      : "Drag and drop deliverable video / image here, or click to browse files"}
                  </div>
                  <p className="text-[10px] text-[#97A0B3]">
                    Supports 9:16 Reels (MP4/MOV), 4:5 Posts (PNG/JPG), and Stories (GIF/MP4)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={masterUrlInput}
                  onChange={(e) => setMasterUrlInput(e.target.value)}
                  placeholder="Or paste S3 / Figma / Cloud Package URL..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#2A3446] font-mono text-[11px] text-[#7FA0D6] bg-[#0B111C]"
                />
              </div>
            </div>

            {/* Specialist Delivery Remarks */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-[#F1F5F9]">Specialist Notes for Pod Lead ({leadName})</label>
              <textarea
                rows={2}
                value={specialistNotesInput}
                onChange={(e) => setSpecialistNotesInput(e.target.value)}
                placeholder="Detail any key visual decisions, alpha channels, or render layer caches..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Revision feedback note if existing */}
            {reviewModalCard.reviewData?.revisionNote && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-amber-900 text-[11px]">
                  <span>Prior Lead Review Feedback</span>
                  <span className="text-amber-700">{leadName}</span>
                </div>
                <p className="text-amber-800 leading-relaxed font-medium italic">
                  "{reviewModalCard.reviewData.revisionNote}"
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#2A3446] text-xs">
              <button
                type="button"
                onClick={() => setReviewModalCard(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
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
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Clock className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Log Task Sprint Time</h3>
                  <p className="text-xs text-[#97A0B3] truncate max-w-[280px]">{logTimeModalCard.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogTimeModalCard(null)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLogTime} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Hours to Add</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={logTimeInput}
                  onChange={(e) => setLogTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setLogTimeModalCard(null)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Activity className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Update Render Progress</h3>
                  <p className="text-xs text-[#97A0B3] truncate max-w-[280px]">{updateProgressModalCard.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpdateProgressModalCard(null)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdateProgress} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-bold text-[#F1F5F9] mb-1">
                  <span>Completion Percentage</span>
                  <span className="text-[#7FA0D6]">{progressInput}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressInput}
                  onChange={(e) => setProgressInput(Number(e.target.value))}
                  className="w-full h-2 bg-[#161F2D] rounded-lg cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setUpdateProgressModalCard(null)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Lead QA Revision Request</h3>
                  <p className="text-xs text-[#97A0B3]">{leadName} · {podName} Lead</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModalCard(null)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setRevisionModalCard(null)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
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
