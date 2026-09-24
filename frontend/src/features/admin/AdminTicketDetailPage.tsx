import { useState, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  Paperclip,
  Download,
  Copy,
  ExternalLink,
  MoreVertical,
  UserCheck,
  Zap,
  FileText,
  Bold,
  Italic,
  Code,
  Link2,
  List,
  X,
  Check,
  BellOff,
  Share2,
  Archive,
  Sparkles,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

interface MessageEntry {
  id: string;
  author: string;
  role: string;
  avatar: string;
  avatarBg: string;
  timestamp: string;
  text: string;
  isInternal?: boolean;
  isSystemAudit?: boolean;
}

export function AdminTicketDetailPage() {
  const { ticketId = "1039" } = useParams();
  const [activeTab, setActiveTab] = useState<"public" | "internal">("public");
  const [replyText, setReplyText] = useState("");
  const [isResolved, setIsResolved] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [alarmSilenced, setAlarmSilenced] = useState(false);
  const [tags, setTags] = useState(["webhook", "deliverables-sync", "api-timeout", "high-priority"]);
  const [newTag, setNewTag] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  // Modals & Menus
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Form states for modals
  const [selectedLead, setSelectedLead] = useState({
    name: "Maya Lin",
    pod: "Pod A (Core Infra)",
    initials: "ML",
    role: "Pod Lead",
  });
  const [reassignReason, setReassignReason] = useState("");

  const [escalateTarget, setEscalateTarget] = useState("Edge Gateway & CDN Fleet");
  const [escalatePriority, setEscalatePriority] = useState<"P0" | "P1" | "P2">("P0");
  const [escalateNotes, setEscalateNotes] = useState(
    "Automated ingest failing with 504 Gateway Timeout on 4K Reel digest commit. Sentry trace indicates edge ingress socket timeout."
  );
  const [notifyPagerDuty, setNotifyPagerDuty] = useState(true);

  // Attached files in composer
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversation history
  const [messages, setMessages] = useState<MessageEntry[]>([
    {
      id: "msg-1",
      author: "David K.",
      role: "VP Operations • Northwind Labs",
      avatar: "DK",
      avatarBg: "bg-slate-800",
      timestamp: "Today at 09:42 AM (42 mins ago)",
      text: "Payload dropped after 4 retries via US-East Gateway during automated delivery sync of 4× 4K Reels. The client webhook endpoint returned 504 Gateway Timeout on asset digest verification.\n\nDeliverable batch identifier: #DL-8821. Client edge ingress closed the connection after reaching the 30-second handshake limit before SHA256 checksums were committed.",
    },
  ]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddMacro = (macroText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${macroText}` : macroText));
    showToast("Macro template inserted into composer", "info");
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
      setShowAddTag(false);
      showToast(`Added tag "${newTag.trim()}"`, "success");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    showToast(`Removed tag "${tagToRemove}"`, "info");
  };

  // Reassign confirm handler
  const handleConfirmReassign = () => {
    const auditMsg: MessageEntry = {
      id: `audit-${Date.now()}`,
      author: "Creo System Audit",
      role: "Workflow Automation",
      avatar: "⚙️",
      avatarBg: "bg-slate-700",
      timestamp: "Just now",
      text: `🔄 Ticket reassigned to ${selectedLead.name} (${selectedLead.pod}). Reason: ${reassignReason || "Workload rebalancing"}`,
      isSystemAudit: true,
    };
    setMessages((prev) => [...prev, auditMsg]);
    setReassignModalOpen(false);
    showToast(`Ticket #${ticketId} successfully reassigned to ${selectedLead.name}`, "success");
  };

  // Escalate confirm handler
  const handleConfirmEscalate = () => {
    setIsEscalated(true);
    const auditMsg: MessageEntry = {
      id: `audit-${Date.now()}`,
      author: "Core Infrastructure Desk",
      role: "Incident SRE Bridge",
      avatar: "🚨",
      avatarBg: "bg-rose-700",
      timestamp: "Just now",
      text: `🚨 ESCALATED TO CORE (${escalatePriority} Incident #INC-9204)\nTarget: ${escalateTarget}\nSummary: ${escalateNotes}\n${notifyPagerDuty ? "✓ PagerDuty On-Call engineer alerted via automated bridge." : ""}`,
      isSystemAudit: true,
    };
    setMessages((prev) => [...prev, auditMsg]);
    setEscalateModalOpen(false);
    showToast(`Incident #INC-9204 dispatched to ${escalateTarget}`, "success");
  };

  // Toggle resolve
  const handleToggleResolve = () => {
    const nextState = !isResolved;
    setIsResolved(nextState);
    const auditMsg: MessageEntry = {
      id: `audit-${Date.now()}`,
      author: "Creo System Audit",
      role: "Status Update",
      avatar: nextState ? "✅" : "⚠️",
      avatarBg: nextState ? "bg-emerald-700" : "bg-blue-700",
      timestamp: "Just now",
      text: nextState
        ? `✅ Ticket marked as RESOLVED by Lead Admin. All SHA256 checksums verified.`
        : `⚠️ Ticket REOPENED by Lead Admin for further diagnostic verification.`,
      isSystemAudit: true,
    };
    setMessages((prev) => [...prev, auditMsg]);
    showToast(
      nextState
        ? `Ticket #${ticketId} marked as Resolved. SLA guarantee met.`
        : `Ticket #${ticketId} reopened.`,
      "success"
    );
  };

  // Send message
  const handleSendMessage = () => {
    if (!replyText.trim() && attachedFiles.length === 0) return;

    const newMsg: MessageEntry = {
      id: `msg-${Date.now()}`,
      author: selectedLead.name,
      role: `${selectedLead.role} • ${selectedLead.pod}`,
      avatar: selectedLead.initials,
      avatarBg: activeTab === "internal" ? "bg-amber-600" : "bg-blue-600",
      timestamp: "Just now",
      text: replyText.trim() + (attachedFiles.length > 0 ? `\n\n📎 Attached: ${attachedFiles.join(", ")}` : ""),
      isInternal: activeTab === "internal",
    };

    setMessages((prev) => [...prev, newMsg]);
    setReplyText("");
    setAttachedFiles([]);
    showToast(activeTab === "internal" ? "Internal note posted to team." : "Reply dispatched to client.", "success");
  };

  // Format insertion
  const handleInsertFormat = (prefix: string, suffix: string = prefix) => {
    setReplyText((prev) => `${prev} ${prefix}text${suffix} `);
  };

  // Attach mock file
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setAttachedFiles((prev) => [...prev, fileName]);
      showToast(`Attached ${fileName}`, "info");
    }
  };

  // Download raw trace log
  const handleDownloadTraceLog = () => {
    const logContent = `--- CREO SENTRY DIAGNOSTICS LOG ---
Trace ID: trc_98812_useast_prod
Timestamp: ${new Date().toISOString()}
Ticket: #${ticketId} (API Webhook Timeout on Deliverables Sync)
Client: Northwind Labs (#DL-8821)
Target Endpoint: https://api.northwindlabs.co/v1/deliverables/sync
Status: 504 Gateway Timeout
Payload: 1.48 GB (4 assets: 4K Reels)
Socket: Ingress connection closed after 30000ms limit before SHA256 commit.
Retries: 4/4 exhausted.
TLS Handshake: 14ms
Resolution Path: Re-route via US-Central High-Bandwidth Gateway with 60s handshake allowance.
`;
    const blob = new Blob([logContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sync_failure_trace_ticket_${ticketId}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded sync_failure_trace.log", "success");
  };

  // Download payload dump
  const handleDownloadPayloadDump = () => {
    const payloadData = {
      batch_id: "BATCH-DL-8821",
      ticket_id: ticketId,
      timestamp: new Date().toISOString(),
      client_id: "cli_northwind",
      client_name: "Northwind Labs",
      target_uri: "https://api.northwindlabs.co/v1/deliverables/sync",
      assets: [
        { id: "asset_01", title: "Fintech Reel Ad Set 1", format: "mp4", resolution: "3840x2160", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
        { id: "asset_02", title: "Fintech Reel Ad Set 2", format: "mp4", resolution: "3840x2160", sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb" },
        { id: "asset_03", title: "Fintech Reel Ad Set 3", format: "mp4", resolution: "3840x2160", sha256: "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969" },
        { id: "asset_04", title: "Fintech Reel Ad Set 4", format: "mp4", resolution: "3840x2160", sha256: "36a92651e299a6491fa807503709e6f0b6ee9a900b9e1fed4428d95af6b42b51" },
      ],
      failure_reason: "504 Gateway Timeout during SHA256 checksum handshake",
    };
    const blob = new Blob([JSON.stringify(payloadData, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `webhook_payload_dump_ticket_${ticketId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded webhook_payload_dump.json", "success");
  };

  // Download full incident audit CSV
  const handleDownloadAuditCSV = () => {
    const headers = ["Ticket ID", "Client", "Priority", "Status", "Assigned Lead", "Ingress", "Created", "Resolved", "SLA Compliance"];
    const rows = [
      [`"#${ticketId}"`, `"Northwind Labs"`, `"${isEscalated ? "P0 (Escalated)" : "P1 Urgent"}"`, `"${isResolved ? "Resolved" : "Open"}"`, `"${selectedLead.name} (${selectedLead.pod})"`, `"Automated Sentry & Webhook"`, `"Today 09:42 AM"`, `"${isResolved ? "Completed" : "In Progress"}"`, `"99.98% Met"`],
    ];
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Incident_Audit_Report_Ticket_${ticketId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded Incident Audit CSV for Ticket #${ticketId}`, "success");
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader activeTab="Support" />

      {/* Sub-header Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-8 py-3.5">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Link
              to="/admin/support"
              className="inline-flex items-center gap-1.5 hover:text-[#2B7BC4] transition-colors font-semibold"
            >
              <ArrowLeft className="size-3.5" />
              Support Tickets
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">Ticket #{ticketId}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Deliverables Pipeline</span>
          </div>

          <div className="flex items-center gap-2">
            {alarmSilenced && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                <BellOff className="size-3.5 text-slate-500" />
                Alarms Silenced (1h)
              </span>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
              <Shield className="size-3.5 text-amber-600" />
              <span>Enterprise Gold SLA Active</span>
              <span className="text-amber-400">•</span>
              <span className="font-mono text-amber-700">BATCH-DL-8821</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 lg:px-8 py-6 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : toastMessage.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* Ticket Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                API Webhook Timeout on Deliverables Sync
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isResolved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-100 text-rose-700 border-rose-200"
                }`}
              >
                <span className={`size-1.5 rounded-full ${isResolved ? "bg-emerald-600" : "bg-rose-600 animate-pulse"}`} />
                {isResolved ? "RESOLVED" : "OPEN"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500 text-white shadow-xs">
                <Zap className="size-3" />
                {isEscalated ? "P0 (CRITICAL BLOCKER)" : "URGENT (P1)"}
              </span>
              {isEscalated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white shadow-xs animate-pulse">
                  <AlertTriangle className="size-3" />
                  CORE ESCALATED (#INC-9204)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
              <span>
                Client: <strong className="text-slate-800 font-bold">Northwind Labs</strong>
              </span>
              <span>•</span>
              <span>
                Reported via: <strong className="text-slate-800">Automated Sentry & Email</strong>
              </span>
              <span>•</span>
              <span>
                Assigned Lead: <strong className="text-blue-700 font-bold">{selectedLead.name} ({selectedLead.pod})</strong>
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative">
            <button
              type="button"
              onClick={() => setReassignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            >
              <UserCheck className="size-3.5 text-slate-500" />
              Reassign
            </button>
            <button
              type="button"
              onClick={() => setEscalateModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isEscalated
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <AlertTriangle className={`size-3.5 ${isEscalated ? "text-indigo-600" : "text-rose-600"}`} />
              {isEscalated ? "Escalation Active" : "Escalate to Core"}
            </button>
            <button
              type="button"
              onClick={handleToggleResolve}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                isResolved
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              {isResolved ? "Reopen Ticket" : "Mark as Resolved"}
            </button>

            {/* More Options Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                title="More Actions"
              >
                <MoreVertical className="size-4" />
              </button>

              {moreMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      handleDownloadAuditCSV();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="size-4 text-blue-600" />
                    Download Incident Audit (CSV)
                  </button>
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      handleDownloadPayloadDump();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="size-4 text-purple-600" />
                    Export Telemetry Logs (JSON)
                  </button>
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setAlarmSilenced(!alarmSilenced);
                      showToast(
                        alarmSilenced ? "SLA alarms reactivated." : "SLA breach alarms silenced for 1 hour.",
                        "info"
                      );
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BellOff className="size-4 text-amber-600" />
                    {alarmSilenced ? "Unsilence SLA Alarms" : "Silence SLA Alarms (1h)"}
                  </button>
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      navigator.clipboard?.writeText(window.location.href);
                      showToast("Ticket link copied to clipboard!", "success");
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="size-4 text-slate-500" />
                    Copy Ticket Link
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      showToast(`Ticket #${ticketId} archived to compliance vault.`, "info");
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Archive className="size-4 text-rose-500" />
                    Archive Incident
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Left 2/3 Content, Right 1/3 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation / Audit Timeline Stream */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`bg-white border rounded-2xl p-6 shadow-xs space-y-4 transition-all ${
                    msg.isSystemAudit
                      ? "border-amber-200/80 bg-gradient-to-r from-amber-50/40 to-white"
                      : msg.isInternal
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-slate-200"
                  }`}
                >
                  {/* Reporter / Author Info */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-full ${msg.avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0`}
                      >
                        {msg.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{msg.author}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              msg.isSystemAudit
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : msg.isInternal
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}
                          >
                            {msg.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{msg.timestamp}</p>
                      </div>
                    </div>

                    {msg.id === "msg-1" && (
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        Node: US-East-09
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {msg.text}
                  </div>

                  {/* Diagnostic Box inside first message */}
                  {msg.id === "msg-1" && (
                    <>
                      {/* Diagnostics Telemetry & Trace Log */}
                      <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden text-slate-200 font-mono text-xs mt-3">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-2">
                            <FileText className="size-3.5 text-rose-400" />
                            Diagnostics Telemetry & Trace Log
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                "trc_98812_useast_prod\n[ERROR 504] Webhook delivery failed: https://api.northwindlabs.co/v1/deliverables/sync\nConnection timed out after 30000ms. Retries exhausted (4/4)."
                              );
                              showToast("Copied raw trace log to clipboard!", "success");
                            }}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors capitalize text-[10px] cursor-pointer"
                          >
                            <Copy className="size-3" />
                            Copy Raw Log
                          </button>
                        </div>
                        <div className="p-4 space-y-1.5 text-[11px] leading-relaxed overflow-x-auto text-slate-300">
                          <div className="text-slate-500"># Gateway trace capture ID: trc_98812_useast_prod</div>
                          <div className="text-rose-400 font-semibold">
                            <span className="bg-rose-500/20 px-1 py-0.5 rounded text-rose-300 font-bold mr-1">
                              [ERROR 504]
                            </span>
                            Webhook delivery failed: https://api.northwindlabs.co/v1/deliverables/sync
                          </div>
                          <div className="text-slate-400">Connection timed out after 30000ms. Retries exhausted (4/4).</div>
                          <div className="text-emerald-400 pt-1">
                            &gt; TLS Handshake: 14ms | Payload Size: 1.48 GB (4 assets) | Socket Hangup: Digest Verification
                          </div>
                        </div>
                      </div>

                      {/* Attachments with direct download triggers */}
                      <div className="pt-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          Attachments (2)
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={handleDownloadPayloadDump}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            <FileText className="size-4 text-blue-600" />
                            <span>webhook_payload_dump.json</span>
                            <span className="text-[10px] text-slate-400 font-mono">(24 KB)</span>
                            <Download className="size-3.5 text-slate-400 ml-1" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadTraceLog}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <FileText className="size-4 text-rose-600" />
                            <span>sync_failure_trace.log</span>
                            <span className="text-[10px] text-slate-400 font-mono">(110 KB)</span>
                            <Download className="size-3.5 text-slate-400 ml-1" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Reply Editor Box */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Tab Selector */}
              <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("public")}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
                    activeTab === "public"
                      ? "bg-white text-blue-700 border-slate-200 shadow-2xs"
                      : "text-slate-500 border-transparent hover:text-slate-800"
                  }`}
                >
                  ✉️ Public Reply to Client
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("internal")}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
                    activeTab === "internal"
                      ? "bg-white text-amber-700 border-slate-200 shadow-2xs"
                      : "text-slate-500 border-transparent hover:text-slate-800"
                  }`}
                >
                  🔒 Internal Note (Team only)
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick Macros */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500" />
                    Quick Macros:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMacro(
                        "We have identified the payload digest mismatch on US-East Gateway. The engineering pod is re-dispatching batch #DL-8821 with extended 60s timeout."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 transition-colors cursor-pointer"
                  >
                    SLA Status Update
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMacro(
                        "Patch deployed to edge ingress router. Asset checksums verified successfully across all 4 Reels. Ticket resolved."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
                  >
                    Resolved with Patch
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMacro(
                        "Could you please confirm if your destination webhook server accepts chunked transfer encoding for assets over 1GB?"
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Request Info
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-slate-100 pb-2 text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("**")}
                    title="Bold"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <Bold className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("*")}
                    title="Italic"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <Italic className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("`")}
                    title="Code snippet"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <Code className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("[Link Title](", ")")}
                    title="Insert Link"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <Link2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyText((prev) => `${prev}\n- Item 1\n- Item 2`)}
                    title="Bullet List"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <List className="size-3.5" />
                  </button>
                  <label
                    title="Attach File"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    <Paperclip className="size-3.5" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttach}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Attached file chips */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachedFiles.map((file, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <FileText className="size-3 text-blue-500" />
                        {file}
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                          className="hover:text-rose-600 cursor-pointer ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeTab === "public"
                      ? "Type your reply to David K. and Northwind Labs team, or insert a macro above..."
                      : "Type an internal engineering note (visible only to Creo Pod team and Admins)..."
                  }
                  className="w-full text-xs sm:text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
                />

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!replyText.trim()) {
                        showToast("Reply box is empty", "error");
                        return;
                      }
                      showToast("Draft response saved locally.", "info");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    {activeTab === "internal" ? "Post Internal Note" : "Send Reply & Keep Open"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar (1 Col) */}
          <div className="space-y-6">
            {/* Client Context Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Client Context
                </h3>
                <Link
                  to="/admin/clients"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Profile <ExternalLink className="size-3" />
                </Link>
              </div>

              {/* Brand Summary */}
              <div className="flex items-center gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <div className="size-11 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  NL
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Northwind Labs</h4>
                  <p className="text-xs text-blue-700 font-semibold">Enterprise Domination • ₹95,000/mo</p>
                </div>
              </div>

              {/* Details List */}
              <div className="text-xs space-y-2.5 pt-1 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Primary Contact:</span>
                  <span className="font-bold text-slate-900">David K. (VP Ops)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Direct Channel:</span>
                  <span className="font-mono text-slate-800">ops@northwindlabs.co</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Pod:</span>
                  <span className="font-bold text-blue-700">{selectedLead.pod}</span>
                </div>
              </div>

              {/* Quota Progress */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Current Cycle Deliverables</span>
                  <span className="font-extrabold text-blue-700">19 / 20 Active</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-900 text-xs font-black">12/12</div>
                    <div className="text-slate-400 uppercase tracking-tighter">FEED POSTS</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                    <div className="text-blue-900 text-xs font-black">4/4</div>
                    <div className="text-blue-600 uppercase tracking-tighter">4K REELS</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-900 text-xs font-black">3/4</div>
                    <div className="text-slate-400 uppercase tracking-tighter">STORIES</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Metadata Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                Ticket Metadata
              </h3>

              <div className="text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ticket ID</span>
                  <span className="font-mono font-bold text-slate-900">#{ticketId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ingress Channel</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Zap className="size-3 text-blue-600" /> Webhook / Sentry
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Specialist</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="size-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {selectedLead.initials}
                    </span>
                    {selectedLead.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Pod</span>
                  <span className="font-semibold text-slate-800">{selectedLead.pod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="font-semibold text-slate-800">Today, 09:42 AM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last Ingress Probe</span>
                  <span className="font-semibold text-emerald-600">9 mins ago</span>
                </div>
              </div>

              {/* Tags Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Incident Tags
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tg) => (
                    <span
                      key={tg}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-1"
                    >
                      {tg}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tg)}
                        className="hover:text-rose-600 cursor-pointer opacity-70 hover:opacity-100"
                        title="Remove tag"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {showAddTag ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                        placeholder="Tag..."
                        className="w-20 px-2 py-0.5 text-[10px] border border-blue-400 rounded focus:outline-none font-bold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddTag(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddTag(true)}
                      className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      + Add Tag
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. REASSIGN TICKET MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {reassignModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reassign Ticket #{ticketId}</h3>
                  <p className="text-xs text-slate-500 font-medium">Re-route ticket owner & creative pod responsibility</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Pod & Lead Specialist</label>
                <div className="space-y-2">
                  {[
                    { name: "Maya Lin", pod: "Pod A (Core Infra)", initials: "ML", role: "Pod Lead" },
                    { name: "Omar V.", pod: "Pod B (Creative Sync)", initials: "OV", role: "Creative Lead" },
                    { name: "Lena Ortiz", pod: "Pod C (Finance & SLA)", initials: "LO", role: "Operations Lead" },
                    { name: "Theo Clark", pod: "Pod D (Video Rendering)", initials: "TC", role: "Technical Lead" },
                    { name: "Core DevOps", pod: "Infrastructure Fleet", initials: "DV", role: "SRE Lead" },
                  ].map((lead) => (
                    <div
                      key={lead.name}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedLead.name === lead.name
                          ? "border-blue-600 bg-blue-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          {lead.initials}
                        </span>
                        <div>
                          <p className="font-black text-slate-900">{lead.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{lead.pod}</p>
                        </div>
                      </div>
                      {selectedLead.name === lead.name && (
                        <Check className="size-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Reassignment Reason</label>
                <input
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Requires video codec transcoding expertise"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. ESCALATE TO CORE MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {escalateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Escalate to Core Engineering</h3>
                  <p className="text-xs text-slate-500 font-medium">Create critical incident bridge and notify SRE on-call</p>
                </div>
              </div>
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Priority Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Priority Override</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["P0", "P1", "P2"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEscalatePriority(p)}
                      className={`py-2 px-3 rounded-xl font-bold border text-center cursor-pointer transition-all ${
                        escalatePriority === p
                          ? p === "P0"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p === "P0" ? "P0 (Blocker)" : p === "P1" ? "P1 (Urgent)" : "P2 (Elevated)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Engineering Unit */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Target Engineering Unit</label>
                <select
                  value={escalateTarget}
                  onChange={(e) => setEscalateTarget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-medium bg-white"
                >
                  <option value="Edge Gateway & CDN Fleet">Edge Gateway & CDN Fleet (504 Timeout)</option>
                  <option value="Media Transcoding Engine">Media Transcoding Engine (HEVC/ProRes)</option>
                  <option value="Webhook Broker & Queue">Webhook Broker & Queue Ingress</option>
                  <option value="Billing & Token Metering">Billing & Token Metering</option>
                </select>
              </div>

              {/* Escalation Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Incident Summary & SRE Brief</label>
                <textarea
                  rows={3}
                  value={escalateNotes}
                  onChange={(e) => setEscalateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>

              {/* Notify Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={notifyPagerDuty}
                  onChange={(e) => setNotifyPagerDuty(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold text-slate-700">Dispatch immediate PagerDuty on-call page & Slack alert</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEscalate}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="size-3.5" />
                Dispatch Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
