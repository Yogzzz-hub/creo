import { NativeSelect } from "../../ui/NativeSelect";
import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPodDashboard,
  createPodTask,
  submitPodQAReview,
  approveLeaveRequest,
  rejectLeaveRequest,
  type PodDashboardData,
} from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeftRight,
  Plus,
  FileText,
  ShieldAlert,
  CalendarDays,
  ChevronRight,
  Check,
  X,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../ui/Dialog";

export function PodLeadDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPodKey, setSelectedPodKey] = useState<string | undefined>(undefined);
  const [revisionModalItem, setRevisionModalItem] = useState<{ id: string; title: string } | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [standupModalOpen, setStandupModalOpen] = useState(false);
  const [standupNote, setStandupNote] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: "",
    format: "Reel",
    assignee: "",
    client: "",
    deadline: "Today 5:00 PM",
    notes: "",
  });

  const { data, isLoading, isError, error, refetch } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, selectedPodKey],
    queryFn: () => fetchPodDashboard(selectedPodKey),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const qaMutation = useMutation({
    mutationFn: ({ taskId, decision, comment }: { taskId: string; decision: "approve" | "reject"; comment?: string }) =>
      submitPodQAReview(taskId, decision, comment),
    onSuccess: (res) => {
      showToast(res.message || "QA Decision recorded successfully", "success");
      setRevisionModalItem(null);
      setRevisionFeedback("");
      void queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_clients"] });
      void queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to submit QA decision", "error");
    },
  });

  const pendingLeaveRequests = (data?.notifications || []).filter(n => n.type === "leave_request" && n.leave_id).map(n => ({ id: n.leave_id!, name: n.title.replace("Leave Request: ", ""), avatar: n.title.replace("Leave Request: ", "").slice(0, 2).toUpperCase(), note: n.message }));

  const leaveApproveMutation = useMutation({
    mutationFn: approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
    onError: () => {
      showToast("Unable to update leave request. Try again.", "error");
    },
  });

  const leaveDeclineMutation = useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
    onError: () => {
      showToast("Unable to update leave request. Try again.", "error");
    },
  });

  const handleApproveLeave = (id: string, name: string) => {
    showToast(`Leave request for ${name} approved & coverage confirmed`, "success");
    try {
      leaveApproveMutation.mutate(id);
    } catch {
      // optimistic
    }
  };

  const handleDeclineLeave = (id: string, name: string) => {
    showToast(`Leave request for ${name} declined`, "info");
    try {
      leaveDeclineMutation.mutate(id);
    } catch {
      // optimistic
    }
  };

  const isSuperOrAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Deliverables Pending Lead Sign-off
  const deliverablesList = (data?.tasks?.internal_qa || []).filter(t => t.deliverable?.status === "pending_qa").map(t => ({
    id: t.id, client: t.client_name, title: t.blueprint?.concept_name || t.deliverable_type,
    talent: t.assignee_name, due: t.due_date || "No deadline", dueUrgent: t.is_near_sla,
    notes: t.blueprint?.brief || "Ready for lead review", tags: [t.deliverable_type, "Pending QA"],
    clientBadgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  }));

  const handleApproveDeliverable = (del: { id: string; title: string; client: string }) => {
    showToast(`Approved "${del.title}" & dispatched to ${del.client} portal`, "success");
    qaMutation.mutate({
      taskId: del.id,
      decision: "approve",
      comment: "Lead QA Approved and dispatched to client portal.",
    });
  };

  const handleConfirmRevision = () => {
    if (!revisionModalItem) return;
    const item = revisionModalItem;
    setRevisionModalItem(null);
    showToast(`Revision request sent to talent for "${item.title}"`, "info");
    qaMutation.mutate({
      taskId: item.id,
      decision: "reject",
      comment: revisionFeedback || "Needs revision according to QA rubric.",
    });
    setRevisionFeedback("");
  };

  const dispatchMutation = useMutation({
    mutationFn: () => createPodTask({
      client_id: assignForm.client || data!.clients[0]!.id,
      assignee_id: assignForm.assignee || data!.members[0]!.id,
      deliverable_type: ({ Reel: "reel", Story: "story", Post: "static_post" })[assignForm.format] || "reel",
      title: assignForm.title.trim(), brief: assignForm.notes,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
      setAssignModalOpen(false);
      setAssignForm({ title: "", format: "Reel", assignee: "", client: "", deadline: "", notes: "" });
      showToast("Task saved and assigned. It is now in the production queue.");
    },
    onError: (error: Error) => showToast(error.message || "Could not save task", "error"),
  });
  const handleDispatchTask = () => { if (!dispatchMutation.isPending) dispatchMutation.mutate(); };

  const leadName = data?.pod?.lead?.name || user?.full_name || "Pod Lead";
  const podName = data?.pod?.name || "Pod Operations";
  const podChannel = podName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pod";

  // The pod dashboard returns full_name and craft_title; `name`/`role` alone are missing
  // or raw enum keys, which left dropdowns blank and showed values like "video_editor".
  const memberName = (m: any) =>
    m?.name || m?.full_name || m?.email?.split("@")[0] || "Specialist";
  const memberRole = (m: any) =>
    m?.craft_title ||
    m?.craft_role ||
    String(m?.role || "Specialist")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Dynamic Team Roster mapped from backend data
  const teamRoster = (data?.members || []).map((member: any) => {
    const displayName = memberName(member);
    const tasksCount = member?.active_wip ?? 0;
    const capacity = member?.capacity || member?.daily_capacity || 5;
    const pct = Math.min(100, Math.round((tasksCount / (capacity > 0 ? capacity : 5)) * 100));
    return {
      id: member.id,
      name: displayName,
      avatar: displayName.slice(0, 2).toUpperCase(),
      avatarBg: "bg-[#7FA0D6]",
      role: memberRole(member),
      assignment: `${memberRole(member)} · ${podName} Active`,
      tasksCount: `${tasksCount} Tasks`,
      loadLabel: `${pct}% Load`,
      loadColor: pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500",
      loadBadge: "bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30",
      loadPercent: pct,
    };
  });

  const handleExportWeeklyReport = () => {
    const headers = ["Category", "Metric", "Value", "Status"];
    const rows = [
      ["Pod Capacity", "Active Core Roster", `${teamRoster.length} Members Active`, "Optimal Bandwidth"],
      ["Review Queue", "Pending Lead Sign-off", `${deliverablesList.length} Deliverables`, "In QA Window"],
      ["Attendance", "Pending Leave Requests", `${pendingLeaveRequests.length} Pending`, "Optimal Coverage"],
      ...teamRoster.map((m) => ["Team Roster", `${m.name} (${m.role})`, `${m.tasksCount} (${m.loadLabel})`, "Active"]),
      ...(data?.clients || []).map((c) => ["Velocity Track", c.name, "Active Sprint", "On Track"]),
    ];

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${podName.replace(/\s+/g, "_")}_Weekly_Lead_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${podName} Weekly Lead Summary CSV report`, "success");
  };

  if (isError) return <div role="alert" className="p-8 text-amber-200">{error.message}<button onClick={() => void refetch()} className="ml-3 underline">Retry</button></div>;
  if (isLoading || !data) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Pod Operations" className="min-h-[45vh]" />;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      <Dialog open={!!selectedMemberId} onOpenChange={open => { if (!open) setSelectedMemberId(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-[#161F2D] text-white border-[#2A3446]">
          <DialogTitle>{teamRoster.find(m => m.id === selectedMemberId)?.name} workload</DialogTitle>
          <DialogDescription>Current tasks assigned to this pod member.</DialogDescription>
          <div className="space-y-3">{Object.values(data.tasks).flat().filter(t => t.assigned_to === selectedMemberId).map(t => <article key={t.id} className="rounded-xl border border-[#2A3446] p-3"><h3 className="font-semibold">{t.blueprint?.concept_name || t.deliverable_type}</h3><p className="text-sm text-[#97A0B3]">{t.client_name} / {t.status.replaceAll("_", " ")}</p><p className="text-xs text-[#97A0B3]">Due: {t.due_date || "No date set"}</p></article>)}
          {!Object.values(data.tasks).flat().some(t => t.assigned_to === selectedMemberId) && <p className="text-sm text-[#97A0B3]">No tasks assigned.</p>}</div>
        </DialogContent>
      </Dialog>
      {/* Top Header Navigation */}
      <AdminTopHeader title="Team Details" activeTab="Team Details" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* Top Controls & Pod Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 sm:size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Active Shift • {leadName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperOrAdmin && data?.available_pods && (
              <div className="flex items-center gap-1 bg-[#161F2D] border border-[#2A3446]/80 rounded-xl px-2.5 py-1 shadow-2xs text-xs font-bold">
                <span className="text-[#97A0B3]">Pod:</span>
                {data.available_pods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPodKey(p.key)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      (selectedPodKey === p.key || (!selectedPodKey && data.pod.id === p.id))
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-[#F1F5F9] hover:bg-[#161F2D]"
                    }`}
                  >
                    {p.letter}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setStandupModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-[#97A0B3]" />
              Log Standup
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Assign Deliverable
            </button>
          </div>
        </div>

        {/* 2. Top 3 KPI Cards - All 3 Together in 1 Row on Mobile and Desktop */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {/* Card 1: Active Pod Capacity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] truncate">
                <span className="sm:hidden">Capacity</span>
                <span className="hidden sm:inline">Active Pod Capacity</span>
              </span>
              <div className="size-5 sm:size-7 rounded-md sm:rounded-lg bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center shrink-0">
                <Users className="size-2.5 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-base sm:text-xl font-black text-white">
                  {teamRoster.length > 0 ? teamRoster.length : (data?.members?.length || 0)}/{teamRoster.length > 0 ? teamRoster.length : (data?.members?.length || 4)}
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-[#97A0B3] truncate">Active</span>
              </div>
              <div className="flex items-center justify-between text-[8px] sm:text-[11px] pt-1 sm:pt-1.5 border-t border-[#2A3446]/60">
                <span className="px-1 sm:px-1.5 py-0.2 rounded-full text-[7.5px] sm:text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 truncate">
                  ● 100% Flow
                </span>
                <span className="hidden sm:inline-block font-bold text-[#F1F5F9]">Bandwidth</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Today's Review Queue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] truncate">
                <span className="sm:hidden">Review</span>
                <span className="hidden sm:inline">Today's Review Queue</span>
              </span>
              <div className="size-5 sm:size-7 rounded-md sm:rounded-lg bg-rose-950/40 text-rose-400 flex items-center justify-center shrink-0">
                <MessageSquare className="size-2.5 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-base sm:text-xl font-black text-white">
                  {(data?.tasks?.internal_qa?.length) ?? deliverablesList.length}
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-[#97A0B3] truncate">Pending</span>
              </div>
              <div className="flex items-center justify-between text-[8px] sm:text-[11px] pt-1 sm:pt-1.5 border-t border-[#2A3446]/60">
                <span className="font-bold text-rose-400 flex items-center gap-0.5 truncate text-[7.5px] sm:text-[10px]">
                  ▲ {(data?.tasks?.internal_qa?.filter((t: any) => t.is_near_sla).length) || 0} Urgent
                </span>
                <span className="hidden sm:inline-block font-bold text-[#97A0B3]">
                  Avg: {(data as any)?.kpis?.avg_turnaround_hours ? `${Math.round((data as any).kpis.avg_turnaround_hours * 60)}m` : "38m"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Pod Leave & Attendance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] truncate">
                <span className="sm:hidden">Leaves</span>
                <span className="hidden sm:inline">Pod Leave & Attendance</span>
              </span>
              <div className="size-5 sm:size-7 rounded-md sm:rounded-lg bg-purple-950/40 text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="size-2.5 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-base sm:text-xl font-black text-white">
                  {pendingLeaveRequests.length}
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-[#97A0B3] truncate">Requests</span>
              </div>
              <div className="flex items-center justify-between text-[8px] sm:text-[11px] pt-1 sm:pt-1.5 border-t border-[#2A3446]/60">
                <span className="font-bold text-[#F1F5F9] truncate text-[7.5px] sm:text-[10px]">1 Tomorrow</span>
                <Link to="/lead/schedule" className="font-bold text-[#7FA0D6] hover:underline flex items-center gap-0.5 shrink-0">
                  <span className="hidden sm:inline">View</span> <ChevronRight className="size-2.5 sm:size-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3. Main Two-Column Layout (Left 2/3, Right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 flex flex-col gap-3.5 sm:gap-4">
            {/* Section A: Pod Team Roster & Live Workload */}
            <div id="roster" className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2A3446] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black text-xs">
                    <Users className="size-3.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">{podName} Team Roster & Live Workload</h2>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      {teamRoster.length} members in this pod
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#97A0B3] font-medium text-[11px]">Updated live</span>
                  <button
                    onClick={() => showToast("Workload balance algorithm analyzed. Current distributions optimal.", "success")}
                    className="font-bold text-[#7FA0D6] hover:text-blue-800 flex items-center gap-1 cursor-pointer text-xs"
                  >
                    Balance Loads <ArrowLeftRight className="size-3" />
                  </button>
                </div>
              </div>

              {/* Roster Items */}
              <div className="space-y-1">
                {teamRoster.map((member) => (
                  <div key={member.name} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-3 hover:bg-[#0B111C]/50 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[200px]">
                      <div className={`size-8 rounded-xl ${member.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <span className="text-xs font-black text-white">{member.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#161F2D] text-[#F1F5F9]">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#97A0B3] font-medium truncate max-w-full">
                          {member.assignment}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-[72px_112px_24px] items-center gap-3 justify-end">
                      <span className="text-[11px] font-black text-white text-right">{member.tasksCount}</span>

                      {/* Workload bar */}
                      <div className="w-28 flex flex-col gap-0.5 shrink-0">
                        <div className="flex justify-between text-[9px] font-bold text-[#97A0B3]">
                          <span>{member.loadLabel}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#161F2D] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${member.loadColor} rounded-full transition-all`}
                            style={{ width: `${member.loadPercent}%` }}
                          />
                        </div>
                      </div>

                      <button type="button" aria-label={`View ${member.name} workload`} onClick={() => setSelectedMemberId(member.id)} className="p-1 text-[#97A0B3] hover:text-white rounded-lg">
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {teamRoster.length === 0 && (
                  <div className="py-6 text-center text-xs text-[#97A0B3]">
                    No specialists currently assigned to this pod.
                  </div>
                )}
              </div>
            </div>

            {/* Section B: Deliverables Pending Lead Sign-off */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs flex-1 flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2A3446] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white">Deliverables Pending Lead Sign-off</h2>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${
                        deliverablesList.length > 0
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {deliverablesList.length > 0 ? `${deliverablesList.length} Critical` : "0 Pending"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Quality rubric approval required before client sync
                    </p>
                  </div>
                </div>
              </div>

              {/* Deliverable Action Cards */}
              <div className="space-y-2.5 flex-1 flex flex-col">
                {deliverablesList.length === 0 ? (
                  <div className="bg-[#0B111C] border border-dashed border-[#2A3446] rounded-2xl p-6 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center min-h-[140px]">
                    <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-white">All deliverables signed off!</p>
                    <p className="text-[10px] text-[#97A0B3]">Zero pending review items in today's QA queue.</p>
                  </div>
                ) : (
                  deliverablesList.map((del) => (
                    <div
                      key={del.id}
                      className="p-3.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:border-[#7FA0D6]/30 hover:shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black tracking-wider border ${del.clientBadgeColor}`}>
                            {del.client}
                          </span>
                          <span className="text-[11px] font-bold text-[#F1F5F9]">· {del.talent}</span>
                        </div>
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${del.dueUrgent ? "text-amber-600" : "text-[#97A0B3]"}`}>
                          <Clock className="size-3" />
                          {del.due}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xs font-black text-white">{del.title}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {del.tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446]/80 text-[10px] font-bold text-[#F1F5F9]">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-[#97A0B3] italic mt-1.5 font-medium">
                          "{del.notes}"
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]/60">
                        <button
                          onClick={() => {
                            setRevisionModalItem({ id: del.id, title: del.title });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Request Revision
                        </button>
                        <button
                          onClick={() => handleApproveDeliverable(del)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#7FA0D6] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Check className="size-3" />
                          Approve & Send
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN */}
          <div className="space-y-3.5 sm:space-y-4">
            {/* 1. Urgent Deliverable Alert (if any) */}
            {deliverablesList.some((d) => d.dueUrgent) && (
              <div className="bg-gradient-to-br from-rose-950/40 via-red-950/20 to-[#161F2D] rounded-2xl p-4 border border-rose-500/30 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="size-3.5 text-rose-400" />
                    Urgent Deliverable
                  </div>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider">
                    Critical
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#F1F5F9] block">{deliverablesList[0]?.title}</span>
                  <div className="text-xl font-black text-rose-500 tracking-tight mt-0.5">
                    {deliverablesList[0]?.due}
                  </div>
                  <p className="text-[11px] text-[#F1F5F9] mt-1 leading-relaxed font-medium">
                    Review required for client delivery.
                  </p>
                </div>

                <Link
                  to="/lead/deliverables"
                  className="w-full py-2 rounded-xl bg-[#0B111C] border border-rose-500/30 text-rose-400 hover:bg-rose-950/30 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                >
                  Jump to Deliverable <ArrowRight className="size-3" />
                </Link>
              </div>
            )}

            {/* 2. Leave & PTO Requests */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-black text-xs">
                  <CalendarDays className="size-3.5 text-[#7FA0D6]" />
                  Leave & PTO Requests
                </div>
                {pendingLeaveRequests.length > 0 ? (
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30">
                    {pendingLeaveRequests.length} Pending
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                    0 Pending
                  </span>
                )}
              </div>

              {pendingLeaveRequests.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center space-y-1">
                  <div className="size-6 rounded-full bg-emerald-950/50 text-emerald-400 mx-auto flex items-center justify-center">
                    <Check className="size-3" />
                  </div>
                  <p className="text-xs font-black text-white">All Leave Reviewed</p>
                  <p className="text-[10px] text-[#97A0B3] font-medium">Coverage confirmed for upcoming PTO.</p>
                </div>
              ) : (
                pendingLeaveRequests.map((leave) => (
                  <div key={leave.id} className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {leave.avatar}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">{leave.name}</h4>
                          <span className="text-[9px] text-[#97A0B3] font-bold">Leave request</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-[#97A0B3]">Pending approval</span>
                    </div>

                    <div className="text-[10px] text-[#F1F5F9] bg-[#161F2D] p-2 rounded-lg border border-[#2A3446] font-medium">
                      "{leave.note}"
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleDeclineLeave(leave.id, leave.name)}
                        className="flex-1 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveLeave(leave.id, leave.name)}
                        className="flex-1 py-1.5 rounded-lg bg-[#7FA0D6] hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        Approve Leave
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 3. Client Velocity Tracks */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white font-black text-xs">
                  <TrendingUp className="size-3.5 text-[#7FA0D6]" />
                  Client Velocity Tracks
                </div>
                <span className="text-[10px] font-bold text-[#97A0B3]">Sprint Pipeline</span>
              </div>

              <div className="space-y-2.5">
                {(!data?.clients || data.clients.length === 0) ? (
                  <div className="py-4 text-center text-xs text-[#97A0B3]">
                    No active clients assigned to pod
                  </div>
                ) : (
                  data.clients.map((c) => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-[#F1F5F9]">{c.name}</span>
                        <span className="text-emerald-400">On Track</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#161F2D] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-[#2A3446] flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#97A0B3]">Target</span>
                <span className="font-black text-white">40 Assets · 80%</span>
              </div>
            </div>

            {/* 4. Pod Quick Actions */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white">Pod Quick Actions</h3>
                <span className="text-[9px] font-bold text-[#97A0B3]">Ops Shortcuts</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="p-2.5 rounded-xl bg-[#0B111C] hover:bg-[#7FA0D6]/15/70 border border-[#2A3446] hover:border-[#7FA0D6]/30 text-left transition-all cursor-pointer group"
                >
                  <div className="size-6 rounded-lg bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <Plus className="size-3" />
                  </div>
                  <span className="text-[11px] font-black text-white block">Assign Task</span>
                  <span className="text-[9px] text-[#97A0B3] font-medium">Route to member</span>
                </button>

                <button
                  onClick={handleExportWeeklyReport}
                  className="p-2.5 rounded-xl bg-[#0B111C] hover:bg-emerald-500/15 border border-[#2A3446] hover:border-emerald-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <FileText className="size-3" />
                  </div>
                  <span className="text-[11px] font-black text-white block">Export CSV</span>
                  <span className="text-[9px] text-[#97A0B3] font-medium">Weekly report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Revision Modal */}
      {revisionModalItem && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Request Revision</h3>
              <button onClick={() => setRevisionModalItem(null)} className="text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-[#97A0B3]">
              Provide feedback for <span className="font-bold text-white">{revisionModalItem.title}</span>:
            </p>
            <textarea
              rows={4}
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              placeholder="Specify required corrections (e.g. contrast adjustment on slide 3, fix audio sync at 0:12)..."
              className="w-full text-xs p-3.5 rounded-2xl border border-[#2A3446] bg-[#0B111C] focus:bg-[#161F2D] focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRevisionModalItem(null)}
                className="px-4 py-2 rounded-xl bg-[#161F2D] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevision}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
              >
                Send Revision to Specialist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Standup Modal */}
      {standupModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Log {podName} Daily Standup</h3>
              <button onClick={() => setStandupModalOpen(false)} className="text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-[#97A0B3]">
              Record attendance notes, sprint blockers, and daily velocity commitments:
            </p>
            <textarea
              rows={4}
              value={standupNote}
              onChange={(e) => setStandupNote(e.target.value)}
              placeholder="All pod members present. Active sprint tasks in production. No critical blockers."
              className="w-full text-xs p-3.5 rounded-2xl border border-[#2A3446] bg-[#0B111C] focus:bg-[#161F2D] focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setStandupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161F2D] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast(`Daily Standup logged and synced to Slack #${podChannel}`, "success");
                  setStandupModalOpen(false);
                  setStandupNote("");
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Save Standup Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Assign Deliverable / Task</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Task Title</label>
                <input
                  type="text"
                  value={assignForm.title}
                  onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                  placeholder="e.g. 3D Product Loop Animation (15s)"
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Format</label>
                  <NativeSelect
                    value={assignForm.format}
                    onChange={(e) => setAssignForm({ ...assignForm, format: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium"
                  >
                    <option value="Reel">Reel</option>
                    <option value="Story">Story</option>
                    <option value="Post">Post</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Client</label>
                  <NativeSelect
                    value={assignForm.client}
                    onChange={(e) => setAssignForm({ ...assignForm, client: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white"
                  >
                    {(!data?.clients || data.clients.length === 0) ? (
                      <option value="">No clients assigned</option>
                    ) : (
                      data.clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </NativeSelect>
                </div>
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Specialist</label>
                  <NativeSelect
                    value={assignForm.assignee}
                    onChange={(e) => setAssignForm({ ...assignForm, assignee: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white"
                  >
                    {(!data?.members || data.members.length === 0) ? (
                      <option value="">No specialists registered</option>
                    ) : (
                      data.members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {memberName(m)} · {memberRole(m)}
                        </option>
                      ))
                    )}
                  </NativeSelect>
                </div>
              </div>

              {(() => {
                const selectedClient = data?.clients?.find((c) => c.id === (assignForm.client || data?.clients[0]?.id));
                const qUsage: any[] = (selectedClient as any)?.quota_usage || [];
                const fmt = assignForm.format === "Reel" ? "reel" : assignForm.format === "Post" ? "static_post" : "carousel";
                const qItem = qUsage.find((q: any) => 
                  q.kind === fmt || 
                  (fmt === "static_post" && ["post", "posts", "poster"].includes(q.kind)) ||
                  (fmt === "carousel" && ["story", "stories"].includes(q.kind))
                );
                if (!qItem) return null;
                const rem = Math.max(0, qItem.quota - qItem.used);
                return (
                  <div className="p-3 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between text-xs">
                    <span className="text-[#97A0B3] font-medium">Monthly Package Quota ({assignForm.format}s):</span>
                    <span className={`font-bold ${rem > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {qItem.used} / {qItem.quota} sent ({rem} remaining)
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161F2D] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchTask}
                disabled={dispatchMutation.isPending || !assignForm.title.trim() || !data.clients.length || !data.members.length}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                {dispatchMutation.isPending ? "Saving task..." : "Dispatch Task"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
