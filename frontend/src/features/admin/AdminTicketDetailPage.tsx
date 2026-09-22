import { useState } from "react";
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
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

export function AdminTicketDetailPage() {
  const { ticketId = "1042" } = useParams();
  const [activeTab, setActiveTab] = useState<"public" | "internal">("public");
  const [replyText, setReplyText] = useState("");
  const [isResolved, setIsResolved] = useState(false);
  const [tags, setTags] = useState(["webhook", "deliverables-sync", "api-timeout", "high-priority"]);
  const [newTag, setNewTag] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  const handleAddMacro = (macroText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${macroText}` : macroText));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
      setShowAddTag(false);
    }
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

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
            <Shield className="size-3.5 text-amber-600" />
            <span>Enterprise Gold SLA Active</span>
            <span className="text-amber-400">•</span>
            <span className="font-mono text-amber-700">BATCH-DL-8821</span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 lg:px-8 py-6 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Ticket Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                API Webhook Timeout on Deliverables Sync
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-200">
                <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
                {isResolved ? "RESOLVED" : "OPEN"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500 text-white shadow-xs">
                <Zap className="size-3" />
                URGENT (P1)
              </span>
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
                Assigned Lead: <strong className="text-blue-700 font-bold">Maya Lin (Pod A)</strong>
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
            >
              <UserCheck className="size-3.5 text-slate-500" />
              Reassign
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition-all"
            >
              <AlertTriangle className="size-3.5 text-rose-600" />
              Escalate to Core
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !isResolved;
                setIsResolved(next);
                showToast(next ? "Ticket marked as resolved!" : "Ticket reopened!");
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                isResolved
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              {isResolved ? "Reopen Ticket" : "Mark as Resolved"}
            </button>
            <button
              type="button"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        {/* Main Grid: Left 2/3 Content, Right 1/3 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Initial Ingest Post */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              {/* Reporter Info */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    DK
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">David K.</h3>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                        VP Operations
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Northwind Labs</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted via automated ingest • Today at 09:42 AM (42 mins ago)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  Node: US-East-09
                </span>
              </div>

              {/* Message Body */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                <p>
                  Payload dropped after 4 retries via <strong className="text-slate-900 font-bold">US-East Gateway</strong> during automated delivery sync of <strong className="text-slate-900 font-bold">4× 4K Reels</strong>. The client webhook endpoint returned <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">504 Gateway Timeout</span> on asset digest verification.
                </p>
                <p className="text-slate-600">
                  Deliverable batch identifier: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-slate-800 font-bold">#DL-8821</code>. Client edge ingress closed the connection after reaching the 30-second handshake limit before SHA256 checksums were committed.
                </p>
              </div>

              {/* Diagnostics Telemetry & Trace Log */}
              <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden text-slate-200 font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <FileText className="size-3.5 text-rose-400" />
                    Diagnostics Telemetry & Trace Log
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText("trc_98812_useast_prod")}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors capitalize text-[10px]"
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

              {/* Attachments */}
              <div className="pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Attachments (2)
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                    <FileText className="size-4 text-blue-600" />
                    <span>webhook_payload_dump.json</span>
                    <span className="text-[10px] text-slate-400 font-mono">(24 KB)</span>
                    <Download className="size-3.5 text-slate-400 ml-1 cursor-pointer hover:text-slate-700" />
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                    <FileText className="size-4 text-rose-600" />
                    <span>sync_failure_trace.log</span>
                    <span className="text-[10px] text-slate-400 font-mono">(110 KB)</span>
                    <Download className="size-3.5 text-slate-400 ml-1 cursor-pointer hover:text-slate-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Reply Editor Box */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Tab Selector */}
              <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("public")}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
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
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Macros:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMacro(
                        "We have identified the payload digest mismatch on US-East Gateway. The engineering pod is re-dispatching batch #DL-8821 with extended 60s timeout."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 transition-colors"
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
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200 transition-colors"
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
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                  >
                    Request Info
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-slate-100 pb-2 text-slate-500">
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <Bold className="size-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <Italic className="size-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <Code className="size-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <Link2 className="size-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <List className="size-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
                    <Paperclip className="size-3.5" />
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to David K. and Northwind Labs team, or insert a macro above..."
                  className="w-full text-xs sm:text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
                />

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!replyText.trim()) return;
                      showToast("Reply sent successfully!");
                      setReplyText("");
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Send className="size-3.5" />
                    Send Reply & Keep Open
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
                  to="/admin/clients/cli_01"
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
                  <p className="text-xs text-blue-700 font-semibold">Enterprise Suite • $54,000/mo</p>
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
                  <span className="font-bold text-blue-700">Pod A (Maya Lin Lead)</span>
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
                      ML
                    </span>
                    Maya Lin
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Pod</span>
                  <span className="font-semibold text-slate-800">Pod A (Core Infra)</span>
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
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                    >
                      {tg}
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
                        className="w-16 px-1.5 py-0.5 text-[10px] border border-blue-400 rounded focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="text-[10px] font-bold text-blue-600"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddTag(true)}
                      className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold transition-colors"
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

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
