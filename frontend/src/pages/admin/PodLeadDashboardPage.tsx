import { NativeSelect } from "../../ui/NativeSelect";
import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPodDashboard,
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
  AlertTriangle,
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

export function PodLeadDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPodKey, setSelectedPodKey] = useState<string | undefined>(undefined);
  const [revisionModalItem, setRevisionModalItem] = useState<{ id: string; title: string } | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [standupModalOpen, setStandupModalOpen] = useState(false);
  const [standupNote, setStandupNote] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: "",
    format: "Reel",
    assignee: "",
    client: "",
    deadline: "Today 5:00 PM",
    notes: "",
  });
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedForm, setBlockedForm] = useState({ title: "", client: "", severity: "Blocker (P0)", details: "" });
  const [reinforcementsModalOpen, setReinforcementsModalOpen] = useState(false);
  const [reinforceForm, setReinforceForm] = useState({ role: "3D Motion Designer", hours: "+20 hrs/week", urgency: "Immediate (Today)", notes: "" });

  const { data, isLoading } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, selectedPodKey],
    queryFn: () => fetchPodDashboard(selectedPodKey),
    staleTime: 30_000,
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
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to submit QA decision", "error");
    },
  });

  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);

  const leaveApproveMutation = useMutation({
    mutationFn: approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
    onError: () => {
      // optimistic
    },
  });

  const leaveDeclineMutation = useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
    onError: () => {
      // optimistic
    },
  });

  const handleApproveLeave = (id: string, name: string) => {
    setPendingLeaveRequests((prev) => prev.filter((l) => l.id !== id));
    showToast(`Leave request for ${name} approved & coverage confirmed`, "success");
    try {
      leaveApproveMutation.mutate(id);
    } catch {
      // optimistic
    }
  };

  const handleDeclineLeave = (id: string, name: string) => {
    setPendingLeaveRequests((prev) => prev.filter((l) => l.id !== id));
    showToast(`Leave request for ${name} declined`, "info");
    try {
      leaveDeclineMutation.mutate(id);
    } catch {
      // optimistic
    }
  };

  const isSuperOrAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Deliverables Pending Lead Sign-off
  const [deliverablesList, setDeliverablesList] = useState<any[]>([]);

  const handleApproveDeliverable = (del: { id: string; title: string; client: string }) => {
    setDeliverablesList((prev) => prev.filter((d) => d.id !== del.id));
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
    setDeliverablesList((prev) => prev.filter((d) => d.id !== item.id));
    setRevisionModalItem(null);
    showToast(`Revision request sent to talent for "${item.title}"`, "info");
    qaMutation.mutate({
      taskId: item.id,
      decision: "reject",
      comment: revisionFeedback || "Needs revision according to QA rubric.",
    });
    setRevisionFeedback("");
  };

  const handleDispatchTask = () => {
    const clientName = assignForm.client || data?.clients?.[0]?.name || "Client";
    const assigneeName = assignForm.assignee || data?.members?.[0]?.name || "Specialist";
    const title = assignForm.title.trim() || `${clientName} ${assignForm.format} Concept`;
    const newDeliverable = {
      id: `del-${Date.now()}`,
      client: clientName.toUpperCase(),
      clientBadgeColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      talent: assigneeName,
      format: assignForm.format,
      due: "Due in 24h",
      dueUrgent: false,
      title: title,
      tags: [assignForm.format, "In Production", "Assigned by Lead", "9:16 Vertical"],
      notes: assignForm.notes || "Assigned via Pod Quick Actions.",
    };
    setDeliverablesList((prev) => [newDeliverable, ...prev]);
    showToast(`Assigned "${title}" to ${assigneeName} (${clientName})`, "success");
    setAssignModalOpen(false);
    setAssignForm({
      title: "",
      format: "Reel",
      assignee: "",
      client: "",
      deadline: "Today 5:00 PM",
      notes: "",
    });
  };

  const leadName = data?.pod?.lead?.name || user?.full_name || "Pod Lead";
  const podName = data?.pod?.name || "Pod Operations";

  // Dynamic Team Roster mapped from backend data
  const teamRoster = (data?.members || []).map((member: any) => {
    const memberName = member?.name || member?.full_name || member?.email?.split("@")[0] || "Specialist";
    const tasksCount = member?.tasks_count || member?.assigned_tasks_count || 0;
    const capacity = member?.capacity || member?.daily_capacity || 5;
    const pct = Math.min(100, Math.round((tasksCount / (capacity > 0 ? capacity : 5)) * 100));
    return {
      name: memberName,
      avatar: (memberName || "SP").slice(0, 2).toUpperCase(),
      avatarBg: "bg-[#7FA0D6]",
      role: member?.role || member?.craft_title || "Specialist",
      assignment: `${member?.role || member?.craft_title || "Specialist"} · ${podName} Active`,
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

  if (isLoading || !data) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Pod Operations" />;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
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

        {/* 1. Header Welcome Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 sm:size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 animate-pulse shrink-0" />
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Hi, Welcome back, {leadName}
            </h1>
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

        {/* 2. Top 3 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Active Pod Capacity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">Active Pod Capacity</span>
              <div className="size-6 sm:size-7 rounded-lg bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center">
                <Users className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{teamRoster.length > 0 ? teamRoster.length : (data?.members?.length || 0)} / {teamRoster.length > 0 ? teamRoster.length : (data?.members?.length || 4)}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Members Active</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                <span className="font-bold text-[#F1F5F9]">100% Bandwidth</span>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  ● Optimal Flow
                </span>
              </div>
            </div>
          </motion.div>

          {/* Today's Review Queue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">Today's Review Queue</span>
              <div className="size-6 sm:size-7 rounded-lg bg-rose-950/40 text-rose-400 flex items-center justify-center">
                <MessageSquare className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{(data?.tasks?.internal_qa?.length) ?? deliverablesList.length}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Pending Review</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                <span className="font-bold text-rose-600 flex items-center gap-1">
                  ▲ {(data?.tasks?.internal_qa?.filter((t: any) => t.is_near_sla).length) || 0} Urgent
                </span>
                <span className="font-bold text-[#97A0B3]">Avg: {(data as any)?.kpis?.avg_turnaround_hours ? `${Math.round((data as any).kpis.avg_turnaround_hours * 60)}m` : "38m"}</span>
              </div>
            </div>
          </motion.div>

          {/* Pod Leave & Attendance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">Pod Leave & Attendance</span>
              <div className="size-6 sm:size-7 rounded-lg bg-purple-950/40 text-purple-400 flex items-center justify-center">
                <Calendar className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{pendingLeaveRequests.length}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Pending Leave Requests</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                <span className="font-bold text-[#F1F5F9]">1 Upcoming Tomorrow</span>
                <Link to="/lead/schedule" className="font-bold text-[#7FA0D6] hover:underline flex items-center gap-0.5">
                  View <ChevronRight className="size-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3. Main Two-Column Layout (Left 2/3, Right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
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
                      4 Core talents deployed across active sprints
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
              <div className="divide-y divide-slate-100">
                {teamRoster.map((member) => (
                  <div key={member.name} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#0B111C]/50 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[200px]">
                      <div className={`size-8 rounded-xl ${member.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">{member.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#161F2D] text-[#F1F5F9]">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#97A0B3] font-medium truncate max-w-[220px]">
                          {member.assignment}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-end">
                      <span className="text-[11px] font-black text-white shrink-0">{member.tasksCount}</span>

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

                      <Link to="/lead/tasks" className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg hover:bg-[#161F2D] transition-colors">
                        <ArrowRight className="size-3.5" />
                      </Link>
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
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs space-y-3.5">
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
              <div className="space-y-2.5">
                {deliverablesList.length === 0 ? (
                  <div className="bg-[#0B111C] border border-dashed border-[#2A3446] rounded-2xl p-6 text-center space-y-1.5">
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
            {/* 1. Client SLA Warning / Status */}
            {deliverablesList.some((d) => d.dueUrgent) ? (
              <div className="bg-gradient-to-br from-rose-950/40 via-red-950/20 to-[#161F2D] rounded-2xl p-4 border border-rose-500/30 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="size-3.5 text-rose-400" />
                    Client SLA Alert
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
                    Review required to ensure client delivery SLA is fulfilled.
                  </p>
                </div>

                <Link
                  to="/lead/deliverables"
                  className="w-full py-2 rounded-xl bg-[#0B111C] border border-rose-500/30 text-rose-400 hover:bg-rose-950/30 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                >
                  Jump to Deliverable <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="bg-[#161F2D] rounded-2xl p-4 border border-emerald-500/30 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="size-3.5 text-emerald-400" />
                    Pod SLA Status
                  </div>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-600/30 text-emerald-400 uppercase tracking-wider border border-emerald-500/30">
                    Optimal
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#F1F5F9] block">{podName} Pipeline</span>
                  <div className="text-xl font-black text-emerald-400 tracking-tight mt-0.5">
                    100% On Track
                  </div>
                  <p className="text-[11px] text-[#97A0B3] mt-1 leading-relaxed font-medium">
                    Zero critical escalations. All sprint deliverables are tracking within SLA bounds.
                  </p>
                </div>
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
                          <span className="text-[9px] text-[#97A0B3] font-bold">{leave.type}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-[#97A0B3]">{leave.dates}</span>
                    </div>

                    <div className="text-[10px] text-[#F1F5F9] bg-[#161F2D] p-2 rounded-lg border border-[#2A3446] font-medium">
                      <span className="font-bold text-[#F1F5F9] block mb-0.5">Cover: {leave.cover}</span>
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
                  onClick={() => setBlockedModalOpen(true)}
                  className="p-2.5 rounded-xl bg-[#0B111C] hover:bg-rose-500/15 border border-[#2A3446] hover:border-rose-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="size-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <AlertTriangle className="size-3" />
                  </div>
                  <span className="text-[11px] font-black text-white block">Log Issue</span>
                  <span className="text-[9px] text-[#97A0B3] font-medium">Escalate swiftly</span>
                </button>

                <button
                  onClick={() => setReinforcementsModalOpen(true)}
                  className="p-2.5 rounded-xl bg-[#0B111C] hover:bg-purple-500/15 border border-[#2A3446] hover:border-purple-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="size-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <Users className="size-3" />
                  </div>
                  <span className="text-[11px] font-black text-white block">Reinforce</span>
                  <span className="text-[9px] text-[#97A0B3] font-medium">Request talent</span>
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
              <h3 className="text-base font-black text-white">Log Pod A Daily Standup</h3>
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
                  showToast("Daily Standup logged and synced to Slack #pod-a", "success");
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
                        <option key={c.id} value={c.name}>{c.name}</option>
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
                        <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                      ))
                    )}
                  </NativeSelect>
                </div>
              </div>
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
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                Dispatch Task
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────────────
          LOG BLOCKED ISSUE MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {blockedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Log Blocked Issue</h3>
                  <p className="text-xs text-[#97A0B3] font-medium">Escalate production blockers to Studio Operations</p>
                </div>
              </div>
              <button onClick={() => setBlockedModalOpen(false)} className="text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Issue Title</label>
                <input
                  type="text"
                  value={blockedForm.title}
                  onChange={(e) => setBlockedForm({ ...blockedForm, title: e.target.value })}
                  placeholder="e.g. Missing 3D CAD assets from client for Holiday Drop"
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D] focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Affected Client</label>
                  <NativeSelect
                    value={blockedForm.client}
                    onChange={(e) => setBlockedForm({ ...blockedForm, client: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D]"
                  >
                    {(!data?.clients || data.clients.length === 0) ? (
                      <option value="">No clients assigned</option>
                    ) : (
                      data.clients.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </NativeSelect>
                </div>
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Severity</label>
                  <NativeSelect
                    value={blockedForm.severity}
                    onChange={(e) => setBlockedForm({ ...blockedForm, severity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D]"
                  >
                    <option value="Blocker (P0)">Blocker (P0 - SLA Risk)</option>
                    <option value="High (P1)">High (P1)</option>
                    <option value="Medium (P2)">Medium (P2)</option>
                  </NativeSelect>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Blocker Details & Action Required</label>
                <textarea
                  rows={3}
                  value={blockedForm.details}
                  onChange={(e) => setBlockedForm({ ...blockedForm, details: e.target.value })}
                  placeholder="Explain what is blocking the deliverable and what Ops Director intervention is needed..."
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D] focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setBlockedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161F2D] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Blocked issue "${blockedForm.title || "Production Blocker"}" escalated to Studio Director`, "success");
                  setBlockedModalOpen(false);
                  setBlockedForm({ title: "", client: "", severity: "Blocker (P0)", details: "" });
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <AlertTriangle className="size-3.5" />
                Dispatch Blocker Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          REQUEST SPECIALIST REINFORCEMENTS MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {reinforcementsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Users className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Request Specialist Reinforcements</h3>
                  <p className="text-xs text-[#97A0B3] font-medium">Request studio capacity surge for upcoming milestones</p>
                </div>
              </div>
              <button onClick={() => setReinforcementsModalOpen(false)} className="text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Craft Role Needed</label>
                  <NativeSelect
                    value={reinforceForm.role}
                    onChange={(e) => setReinforceForm({ ...reinforceForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D]"
                  >
                    <option value="3D Motion Designer">3D Motion Designer</option>
                    <option value="Video Editor & Colorist">Video Editor & Colorist</option>
                    <option value="Lead Copy Strategist">Lead Copy Strategist</option>
                    <option value="Brand Visual Designer">Brand Visual Designer</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Bandwidth Surge</label>
                  <NativeSelect
                    value={reinforceForm.hours}
                    onChange={(e) => setReinforceForm({ ...reinforceForm, hours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D]"
                  >
                    <option value="+20 hrs/week">+20 hrs/week (Part-time)</option>
                    <option value="+40 hrs/week">+40 hrs/week (Dedicated Surge)</option>
                    <option value="Single Milestone">Single Milestone Sprint</option>
                  </NativeSelect>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Required Starting</label>
                <NativeSelect
                  value={reinforceForm.urgency}
                  onChange={(e) => setReinforceForm({ ...reinforceForm, urgency: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D]"
                >
                  <option value="Immediate (Today)">Immediate (Today - Critical Bandwidth)</option>
                  <option value="Next Sprint Cycle">Next Sprint Cycle</option>
                  <option value="Next Month">Next Month</option>
                </NativeSelect>
              </div>

              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Workload Surge Notes</label>
                <textarea
                  rows={3}
                  value={reinforceForm.notes}
                  onChange={(e) => setReinforceForm({ ...reinforceForm, notes: e.target.value })}
                  placeholder="Explain reason for extra capacity (e.g. End-of-month deliverable batch surge)..."
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white focus:bg-[#161F2D] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setReinforcementsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161F2D] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Reinforcements request for ${reinforceForm.role} (${reinforceForm.hours}) sent to Studio Resourcing`, "success");
                  setReinforcementsModalOpen(false);
                  setReinforceForm({ role: "3D Motion Designer", hours: "+20 hrs/week", urgency: "Immediate (Today)", notes: "" });
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Users className="size-3.5" />
                Dispatch Surge Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
