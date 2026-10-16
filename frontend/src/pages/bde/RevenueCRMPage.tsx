import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Download,
  FileText,
  Handshake,
  IndianRupee,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  crmAgencyKey,
  crmDate,
  crmGet,
  crmMoney,
  crmWrite,
  downloadProposal,
  type CRMEntry,
  type CRMLead,
  type CRMMessage,
  type CRMOverview,
  type CRMPerson,
  type CRMProposal,
  type CRMReferral,
  type CRMService,
  type CRMTask,
  type ProposalLine,
} from "../../lib/revenue-crm";

const panel = "min-w-0 rounded-2xl border border-[#2A3446] bg-[#131C2A]";
const input =
  "w-full min-w-0 min-h-11 rounded-xl border border-[#303D52] bg-[#0B111C] px-3 py-2 text-sm text-white placeholder:text-[#6F7E96] focus:border-[#9EB8E1] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/20 [color-scheme:dark]";
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9C4EE] disabled:cursor-not-allowed disabled:opacity-40";
const button = `${buttonBase} border-[#34435C] bg-[#1B293D] text-[#D0DDF1] hover:bg-[#263952]`;
const primary = `${buttonBase} border-transparent bg-[#BCCCE6] text-[#0B111C] hover:bg-white`;
const stages = [
  "new",
  "contacted",
  "qualified",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
  "converted",
  "lost",
  "nurture",
  "disqualified",
];
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const navigation = [
  { id: "overview", label: "Action center", icon: Target },
  { id: "leads", label: "Leads", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: Layers },
  { id: "tasks", label: "Follow-ups", icon: CalendarClock },
  { id: "proposals", label: "Proposal studio", icon: FileText },
  { id: "referrals", label: "Referrals", icon: Handshake },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "discovery", label: "AI workspace", icon: Sparkles },
  { id: "reports", label: "Reports", icon: IndianRupee },
  { id: "handoffs", label: "Delivery handoffs", icon: BriefcaseBusiness },
  { id: "settings", label: "Settings", icon: Settings2 },
];
type FormKind =
  | "lead"
  | "task"
  | "referral"
  | "finance"
  | "target"
  | "handoff"
  | "message_schedule"
  | "message"
  | "activity"
  | "consent"
  | "qualify"
  | "stage"
  | "assign"
  | "service"
  | "task_action"
  | "import";
type Values = Record<string, string>;

function Badge({ children, status = "" }: { children: ReactNode; status?: string }) {
  const tone = ["accepted", "converted", "completed", "verified", "approved"].includes(status)
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    : ["overdue", "lost", "suppressed", "rejected"].includes(status)
      ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
      : "border-[#7FA0D6]/25 bg-[#7FA0D6]/10 text-[#BCCCE6]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {children}
    </span>
  );
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
      <BriefcaseBusiness className="mb-1 size-7 text-[#6884AD]" />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-[#96A5BB]">{children}</p>
    </div>
  );
}
function Field({
  name,
  title,
  values,
  setValues,
  type = "text",
  required = true,
  options,
  hint,
}: {
  name: string;
  title: string;
  values: Values;
  setValues: (v: Values) => void;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
}) {
  const props = {
    id: `crm-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (e: { target: { value: string } }) =>
      setValues({ ...values, [name]: e.target.value }),
    required,
    className: input,
  };
  return (
    <label className="block min-w-0 space-y-2" htmlFor={props.id}>
      <span className="text-xs font-semibold text-[#BCCCE6]">
        {title}
        {required && <span className="ml-1 text-[#7FA0D6]">*</span>}
      </span>
      {options ? (
        <select {...props}>
          <option value="">Select {title.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea {...props} rows={3} maxLength={20000} />
      ) : (
        <input
          {...props}
          type={type}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
        />
      )}
      {hint && <span className="block text-xs leading-relaxed text-[#8292AB]">{hint}</span>}
    </label>
  );
}
function Modal({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);
  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]",
      ) || [],
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <section
        ref={dialogRef}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${panel} max-h-[92dvh] w-full overflow-y-auto shadow-2xl ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#2A3446] bg-[#131C2A] p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-[#96A5BB]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close dialog"
            className={`${button} px-3`}
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export function RevenueCRMPage() {
  const { user } = useAuth();
  const [agency, setAgency] = useState(crmAgencyKey);
  const options = useQuery({
    queryKey: ["crm-agency-options", user?.id],
    queryFn: () => crmGet<{ id: string; name: string }[]>("agency-options"),
    enabled: user?.role === "super_admin",
  });
  function selectAgency(value: string) {
    sessionStorage.setItem("creo-crm-agency", value);
    setAgency(value);
  }
  useEffect(() => {
    const firstAgency = options.data?.[0];
    if (options.data?.length === 1 && firstAgency && !agency) selectAgency(firstAgency.id);
  }, [options.data, agency]);
  if (user?.role !== "super_admin") return <RevenueCRMWorkspace />;
  const valid = options.data?.some((item) => item.id === agency);
  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-8">
        <label className="block max-w-md text-sm text-[#BCCCE6]">
          Agency workspace
          <select
            aria-label="Agency workspace"
            className={`${input} mt-2`}
            value={valid ? agency : ""}
            onChange={(event) => selectAgency(event.target.value)}
          >
            <option value="">Choose an agency</option>
            {(options.data || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {options.isError && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            Unable to load agency access. Please refresh and try again.
          </p>
        )}
      </div>
      {valid ? (
        <RevenueCRMWorkspace key={agency} />
      ) : (
        <div className="p-6">
          <Empty
            title={
              options.isPending
                ? "Loading agency access..."
                : "Choose an agency to view its revenue workspace."
            }
          />
        </div>
      )}
    </>
  );
}

function RevenueCRMWorkspace() {
  const { section = "overview" } = useParams();
  const { user } = useAuth();
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [form, setForm] = useState<{
    kind: FormKind;
    lead?: string;
    task?: string;
  } | null>(null);
  const [proposal, setProposal] = useState<CRMProposal | "new" | null>(null);
  const [preview, setPreview] = useState<CRMProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [aiDraft, setAiDraft] = useState<{
    draft: string;
    evidence: unknown;
  } | null>(null);
  const search = params.get("search") || "";
  const stage = params.get("stage") || "";
  const priority = params.get("priority") || "";
  const month = params.get("month") || "";
  const overview = useQuery({
    queryKey: ["crm", crmAgencyKey(), "overview", user?.id, month],
    queryFn: () => crmGet<CRMOverview>(`overview${month ? `?month=${month}` : ""}`),
    refetchInterval: 30000,
  });
  const leadQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "leads", user?.id, search, stage, priority],
    queryFn: () => crmGet<CRMLead[]>(`leads?${new URLSearchParams({ search, stage, priority })}`),
  });
  const team = useQuery({
    queryKey: ["crm", crmAgencyKey(), "team", user?.id],
    queryFn: () => crmGet<CRMPerson[]>("team"),
  });
  const taskQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "tasks", user?.id],
    queryFn: () => crmGet<CRMTask[]>("tasks"),
    enabled: ["overview", "tasks"].includes(section),
  });
  const proposalQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "proposals", user?.id],
    queryFn: () => crmGet<CRMProposal[]>("proposals"),
    enabled: ["proposals", "reports"].includes(section) || proposal !== null,
  });
  const referralQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "referrals", user?.id],
    queryFn: () => crmGet<CRMReferral[]>("referrals"),
    enabled: section === "referrals",
  });
  const financeQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "finance", user?.id],
    queryFn: () => crmGet<CRMEntry[]>("finance"),
    enabled: section === "reports",
  });
  const messageQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "messages", user?.id],
    queryFn: () => crmGet<CRMMessage[]>("messages"),
    enabled: section === "messages",
  });
  const catalog = useQuery({
    queryKey: ["crm", crmAgencyKey(), "catalog", user?.id],
    queryFn: () => crmGet<CRMService[]>("catalog"),
    enabled: section === "settings" || proposal !== null,
  });
  const integrations = useQuery({
    queryKey: ["crm", crmAgencyKey(), "integrations", user?.id],
    queryFn: () => crmGet<Record<string, { status: string; detail: string }>>("integrations"),
    enabled: ["messages", "discovery", "settings"].includes(section),
  });
  const detail = useQuery({
    queryKey: ["crm", crmAgencyKey(), "detail", user?.id, selectedLead],
    queryFn: () =>
      crmGet<{
        lead: CRMLead;
        activities: {
          id: string;
          summary: string;
          activity_type: string;
          outcome?: string;
          created_at: string;
        }[];
      }>(`leads/${selectedLead}`),
    enabled: !!selectedLead,
  });
  const stats = overview.data;
  const currency = stats?.currency || "INR";
  const timezone = stats?.timezone || "Asia/Kolkata";
  const money = (value: number) => crmMoney(value, currency);
  const canManage =
    stats?.can_manage ?? ["admin", "super_admin", "bde_head"].includes(user?.role || "");
  const canConfigure = stats?.can_configure ?? ["admin", "super_admin"].includes(user?.role || "");
  const leads = leadQuery.data || [];
  const currentSection = navigation.find((n) => n.id === section);
  const pendingTasks = (taskQuery.data || []).filter((t) => t.status === "pending");
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }
  async function perform(fn: () => Promise<unknown>, success: string) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
      setNotice(success);
      await cache.invalidateQueries({ queryKey: ["crm"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete this action.");
    } finally {
      setBusy(false);
    }
  }
  const openForm = (kind: FormKind, lead?: string, task?: string) => {
    setError("");
    setForm({ kind, lead, task });
  };
  const queries = [
    overview,
    leadQuery,
    taskQuery,
    proposalQuery,
    referralQuery,
    financeQuery,
    messageQuery,
    catalog,
    integrations,
  ];
  const queryError = queries.find((q) => q.isError);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 px-4 pb-24 pt-6 text-white sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/bde/crm/overview"
            className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8FAEDC]"
          >
            <BriefcaseBusiness className="size-4" />
            Creo / Revenue workspace
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {currentSection?.label || "Revenue workspace"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#96A5BB]">
            {section === "overview"
              ? "Every opportunity has an owner. Every conversation has a next step."
              : "One workspace for your clients, commitments, and commercial outcomes."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            {user?.role === "bde_head"
              ? "BDE Head"
              : stats?.scope === "agency"
                ? "Agency oversight"
                : "BDE workspace"}
          </Badge>
          <button type="button" onClick={() => openForm("lead")} className={primary}>
            <Plus className="size-4" />
            New lead
          </button>
        </div>
      </header>
      <nav
        aria-label="Revenue CRM pages"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#2A3446] px-1 pb-3"
      >
        {navigation
          .filter((n) => n.id !== "settings" || canConfigure)
          .map(({ id, label: title, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/bde/crm/${id}`}
              className={({ isActive }) =>
                `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors ${isActive ? "bg-[#BCCCE6] text-[#0B111C]" : "text-[#96A5BB] hover:bg-[#1B293D] hover:text-white"}`
              }
            >
              <Icon className="size-4" />
              {title}
            </NavLink>
          ))}
      </nav>
      {(error || queryError) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          <span>{error || queryError?.error?.message}</span>
          {queryError && (
            <button className={button} onClick={() => void queryError.refetch()}>
              Retry
            </button>
          )}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          <Check className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {shareLink && (
        <div className={`${panel} space-y-3 p-4`}>
          <h2 className="font-semibold">Secure client proposal link</h2>
          <p className="text-xs text-[#96A5BB]">
            Anyone with this link can view and decide on this exact version until its expiry. Share
            it through an authorized channel.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Secure proposal link"
              className={`${input} flex-1`}
              readOnly
              value={shareLink}
            />
            <button
              className={button}
              onClick={() =>
                void perform(
                  () => navigator.clipboard.writeText(shareLink),
                  "Proposal link copied.",
                )
              }
            >
              Copy link
            </button>
            <button className={button} onClick={() => setShareLink("")}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {overview.isPending && (
        <div role="status" className="flex items-center gap-2 text-sm text-[#96A5BB]">
          <Loader2 className="size-4 animate-spin" />
          Loading your revenue workspace...
        </div>
      )}

      {["overview", "reports"].includes(section) && stats && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#96A5BB]">
              {label(stats.scope)} performance · Reporting timezone: {timezone}
            </p>
            <label className="flex items-center gap-2 text-xs text-[#96A5BB]">
              Reporting month
              <input
                type="month"
                value={month || stats.month}
                onChange={(e) => filter("month", e.target.value)}
                className={`${input} max-w-44`}
              />
            </label>
          </div>
          <section
            aria-label="Revenue statistics"
            className="grid grid-cols-2 gap-3 xl:grid-cols-4"
          >
            {[
              {
                title: "Active opportunities",
                value: stats.summary.active_leads,
                detail: `${stats.summary.new_leads} new this month`,
                icon: Users,
              },
              {
                title: "Open pipeline",
                value: money(stats.summary.pipeline_minor),
                detail: "Expected deal value · current",
                icon: Layers,
              },
              {
                title: "Booked this month",
                value: money(stats.summary.booked_minor),
                detail: `${stats.summary.won_deals} confirmed wins`,
                icon: Handshake,
              },
              {
                title: "Collected this month",
                value: money(stats.summary.collected_minor),
                detail: `${money(stats.summary.invoiced_minor)} invoiced`,
                icon: IndianRupee,
              },
            ].map(({ title, value, detail: description, icon: Icon }) => (
              <article key={title} className={`${panel} flex flex-col p-4 sm:p-5`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#96A5BB]">
                    {title}
                  </h2>
                  <Icon className="size-4 shrink-0 text-[#8FAEDC]" />
                </div>
                <p className="break-words text-2xl font-bold tracking-tight tabular-nums">
                  {value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#8292AB]">{description}</p>
              </article>
            ))}
          </section>
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Your next moves</h2>
                <Link to="/bde/crm/tasks" className="text-xs text-[#A7BFE4]">
                  All follow-ups <ArrowUpRight className="inline size-3" />
                </Link>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  ["Due today", stats.summary.today],
                  ["Overdue", stats.summary.overdue],
                  ["Proposals to review", stats.summary.proposal_attention],
                ].map(([title, value]) => (
                  <div key={title} className="rounded-xl border border-[#2A3446] bg-[#0B111C] p-3">
                    <p className="text-xl font-bold tabular-nums">{value}</p>
                    <p className="mt-1 text-[11px] text-[#96A5BB]">{title}</p>
                  </div>
                ))}
              </div>
              {pendingTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A3446] py-3"
                >
                  <button className="min-w-0 text-left" onClick={() => setSelectedLead(t.lead_id)}>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="mt-1 text-xs text-[#96A5BB]">
                      {t.company} · {crmDate(t.due_at, timezone)}
                    </p>
                  </button>
                  <button
                    className={button}
                    onClick={() => openForm("task_action", t.lead_id, t.id)}
                  >
                    Resolve
                  </button>
                </div>
              ))}
              {!pendingTasks.length && (
                <p className="py-5 text-sm text-[#96A5BB]">
                  Your follow-up queue is clear. Add a next action from a lead record.
                </p>
              )}
            </section>
            <section className={`${panel} p-5`}>
              <h2 className="font-semibold">Quality & outcomes</h2>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#96A5BB]">Follow-ups completed on time</span>
                    <span>
                      {stats.summary.sla_due
                        ? `${Math.round((stats.summary.sla_on_time / stats.summary.sla_due) * 100)}%`
                        : "No due actions"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8292AB]">
                    {stats.summary.sla_on_time} on time / {stats.summary.sla_due} due in this
                    reporting month
                  </p>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-[#96A5BB]">Referrals sourced</span>
                  <span>
                    {stats.summary.referrals}{" "}
                    <span className="text-[#8292AB]">
                      / {stats.summary.verified_referrals} verified
                    </span>
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#96A5BB]">Booked value target</span>
                    <span>
                      {stats.summary.target_minor
                        ? money(stats.summary.target_minor)
                        : "Not configured"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#28354B]">
                    <div
                      className="h-full rounded-full bg-[#9EB8E1]"
                      style={{
                        width: `${stats.summary.target_minor ? Math.min(100, (stats.summary.booked_minor / stats.summary.target_minor) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
          {canManage && (
            <section className={`${panel} overflow-hidden`}>
              <div className="border-b border-[#2A3446] p-5">
                <h2 className="font-semibold">BDE team scorecard</h2>
                <p className="mt-1 text-xs text-[#96A5BB]">
                  Current assigned pipeline, wins in this month, and referrals credited to the
                  original BDE.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-[#0B111C] text-xs text-[#96A5BB]">
                    <tr>
                      {["BDE", "Active", "Wins", "Booked", "Referrals", "Overdue"].map((h) => (
                        <th className="p-4 font-medium" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.scorecards.map((p) => (
                      <tr key={p.id} className="border-t border-[#2A3446]">
                        <td className="p-4 font-semibold">{p.name}</td>
                        <td className="p-4">{p.active}</td>
                        <td className="p-4">{p.won}</td>
                        <td className="p-4 tabular-nums">{money(p.booked_minor)}</td>
                        <td className="p-4">{p.referrals}</td>
                        <td className="p-4">{p.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!stats.scorecards.length && (
                <Empty title="No BDEs assigned yet">
                  An administrator can assign BDEs to their BDE Head in CRM settings.
                </Empty>
              )}
            </section>
          )}
          <section className={`${panel} p-5`}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-amber-300" />
              <h2 className="font-semibold">Needs a next step</h2>
            </div>
            {stats.exceptions.length ? (
              stats.exceptions.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedLead(e.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-[#2A3446] py-3 text-left text-sm"
                >
                  <span>{e.name}</span>
                  <Badge status="overdue">{e.reason}</Badge>
                </button>
              ))
            ) : (
              <p className="text-sm text-[#96A5BB]">
                Every active lead in your scope has an owner and a pending next action.
              </p>
            )}
          </section>
        </>
      )}

      {["leads", "pipeline"].includes(section) && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-3.5 size-4 text-[#8292AB]" />
              <input
                className={`${input} pl-10`}
                placeholder="Find a person, company, email or phone"
                aria-label="Search leads"
                value={search}
                onChange={(e) => filter("search", e.target.value)}
              />
            </label>
            <select
              aria-label="Filter stage"
              className={`${input} sm:w-48`}
              value={stage}
              onChange={(e) => filter("stage", e.target.value)}
            >
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter temperature"
              className={`${input} sm:w-40`}
              value={priority}
              onChange={(e) => filter("priority", e.target.value)}
            >
              <option value="">All temperatures</option>
              {["hot", "warm", "cold", "unknown"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button className={button} onClick={() => openForm("import")}>
              Import CSV
            </button>
          </div>
          <p className="text-xs text-[#8292AB]">
            Showing up to 100 matching leads. Filters are saved in this page URL.
          </p>
          {leadQuery.isPending ? (
            <Empty title="Loading leads..." />
          ) : !leads.length ? (
            <div className={panel}>
              <Empty title="Your next opportunity starts here">
                Add a lead with an owner and first follow-up, or import a reviewed CSV.
              </Empty>
            </div>
          ) : section === "pipeline" ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages
                .filter((s) => !["nurture", "disqualified"].includes(s))
                .map((s) => (
                  <section key={s} className="w-72 shrink-0 rounded-2xl bg-[#101825] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-semibold">{label(s)}</h2>
                      <Badge>{leads.filter((l) => l.status === s).length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {leads
                        .filter((l) => l.status === s)
                        .map((l) => (
                          <LeadCard
                            key={l.id}
                            lead={l}
                            money={money}
                            timezone={timezone}
                            onClick={() => setSelectedLead(l.id)}
                            people={team.data || []}
                          />
                        ))}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {leads.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  money={money}
                  timezone={timezone}
                  onClick={() => setSelectedLead(l.id)}
                  people={team.data || []}
                />
              ))}
            </div>
          )}
        </>
      )}

      {section === "tasks" && (
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A3446] p-5">
            <div>
              <h2 className="font-semibold">Follow-up queue</h2>
              <p className="mt-1 text-xs text-[#96A5BB]">
                Sorted by due time · {timezone} · resolve with an outcome and next step
              </p>
            </div>
            <button className={button} onClick={() => openForm("task")}>
              <Plus className="size-4" />
              Next action
            </button>
          </div>
          {taskQuery.isPending ? (
            <Empty title="Loading follow-ups..." />
          ) : !taskQuery.data?.length ? (
            <Empty title="No follow-ups yet">
              Create a lead or schedule a next action to build your queue.
            </Empty>
          ) : (
            <div className="divide-y divide-[#2A3446]">
              {taskQuery.data.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <button
                    onClick={() => setSelectedLead(t.lead_id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.title}</p>
                      <Badge
                        status={
                          t.status === "pending" && new Date(t.due_at).getTime() < Date.now()
                            ? "overdue"
                            : t.status
                        }
                      >
                        {t.status === "pending" && new Date(t.due_at).getTime() < Date.now()
                          ? "overdue"
                          : t.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-[#96A5BB]">
                      {t.company} · {label(t.kind)} · {crmDate(t.due_at, timezone)}
                    </p>
                  </button>
                  {t.status === "pending" && (
                    <button
                      className={button}
                      onClick={() => openForm("task_action", t.lead_id, t.id)}
                    >
                      Complete / snooze
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {section === "proposals" && (
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A3446] p-5">
            <div>
              <h2 className="font-semibold">Priced, reviewed, versioned</h2>
              <p className="mt-1 text-xs text-[#96A5BB]">
                One-time and recurring charges stay separate. Issued versions cannot be edited.
              </p>
            </div>
            <button className={primary} onClick={() => setProposal("new")}>
              <Plus className="size-4" />
              Create proposal
            </button>
          </div>
          {proposalQuery.isPending ? (
            <Empty title="Loading proposals..." />
          ) : !proposalQuery.data?.length ? (
            <Empty title="A clearer proposal, a better conversation">
              Build a proposal from a CRM lead and your agency service catalog.
            </Empty>
          ) : (
            <div className="divide-y divide-[#2A3446]">
              {proposalQuery.data.map((p) => (
                <article key={p.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#8FAEDC]">
                        {p.number} · v{p.version}
                      </p>
                      <h3 className="mt-1 font-semibold">{p.title}</h3>
                      <p className="mt-1 text-xs text-[#96A5BB]">
                        {p.company} · Valid until {crmDate(p.valid_until, timezone)}
                      </p>
                    </div>
                    <Badge status={p.status}>
                      {p.revoked_at ? "Revoked" : p.expired ? "Expired" : p.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(p.snapshot.totals).map(([billing, total]) => (
                      <span key={billing} className="rounded-lg bg-[#0B111C] px-3 py-2 text-xs">
                        <span className="text-[#96A5BB]">{label(billing)} </span>
                        {crmMoney(total.total, p.currency)}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={button} onClick={() => setPreview(p)}>
                      Preview
                    </button>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void perform(
                          () => downloadProposal(p),
                          "PDF downloaded from this saved version.",
                        )
                      }
                    >
                      <Download className="size-4" />
                      PDF
                    </button>
                    {canManage && ["draft", "review"].includes(p.status) && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          void perform(
                            () =>
                              crmWrite(`proposals/${p.id}/action`, {
                                action: "approve",
                              }),
                            "Exact proposal version approved.",
                          )
                        }
                      >
                        Approve version
                      </button>
                    )}
                    {p.status === "approved" && !p.revoked_at && (
                      <button
                        className={primary}
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            const r = await crmWrite<{ share_path: string }>(
                              `proposals/${p.id}/action`,
                              { action: "share" },
                            );
                            setShareLink(window.location.origin + r.share_path);
                          }, "Secure link created. No message was sent automatically.")
                        }
                      >
                        Create client link
                      </button>
                    )}
                    <button className={button} onClick={() => setProposal(p)}>
                      Create revision
                    </button>
                    {canManage && p.status === "accepted" && (
                      <button
                        className={button}
                        onClick={() => openForm("handoff", p.lead_id, p.id)}
                      >
                        Create delivery handoff
                      </button>
                    )}
                    {["sent", "viewed"].includes(p.status) && !p.revoked_at && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          void perform(
                            () =>
                              crmWrite(`proposals/${p.id}/action`, {
                                action: "revoke",
                              }),
                            "Client link revoked.",
                          )
                        }
                      >
                        Revoke link
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {section === "referrals" && (
        <section className={panel}>
          <div className="flex flex-wrap justify-between gap-3 border-b border-[#2A3446] p-5">
            <div>
              <h2 className="font-semibold">Relationships that grow with you</h2>
              <p className="mt-1 text-xs text-[#96A5BB]">
                Original BDE attribution stays intact when lead ownership changes.
              </p>
            </div>
            <button className={primary} onClick={() => openForm("referral")}>
              <Plus className="size-4" />
              Register referral
            </button>
          </div>
          {referralQuery.isPending ? (
            <Empty title="Loading referrals..." />
          ) : !referralQuery.data?.length ? (
            <Empty title="No referrals registered">
              Link a referred lead and record who introduced the business.
            </Empty>
          ) : (
            referralQuery.data.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-[#2A3446] p-5"
              >
                <div>
                  <p className="font-semibold">{r.company}</p>
                  <p className="mt-1 text-xs text-[#96A5BB]">
                    From {r.referrer} · {crmDate(r.acquired_at, timezone)}
                  </p>
                  <p className="mt-1 text-xs text-[#8292AB]">
                    Sourced by{" "}
                    {team.data?.find((p) => p.id === r.acquired_by)?.name || "Original BDE"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge status={r.status}>{r.status}</Badge>
                  {canManage && ["submitted", "verified"].includes(r.status) && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void perform(
                          () =>
                            crmWrite(`referrals/${r.id}/review`, {
                              status: r.status === "submitted" ? "verified" : "qualified",
                              reason: "Reviewed by BDE head",
                            }),
                          "Referral review recorded.",
                        )
                      }
                    >
                      {r.status === "submitted" ? "Verify" : "Qualify"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {section === "messages" && (
        <div className="space-y-4">
          <IntegrationCards data={integrations.data} only="whatsapp" />
          <section className={panel}>
            <div className="flex flex-wrap justify-between gap-3 border-b border-[#2A3446] p-5">
              <div>
                <h2 className="font-semibold">Conversation drafts</h2>
                <p className="mt-1 text-xs text-[#96A5BB]">
                  Drafts remain internal. Opt-out immediately suppresses pending drafts.
                </p>
              </div>
              <button className={button} onClick={() => openForm("message")}>
                <Plus className="size-4" />
                Draft message
              </button>
            </div>
            {!messageQuery.data?.length ? (
              <Empty title="No messages yet">
                Save a draft from a lead. Connect the official provider before sending.
              </Empty>
            ) : (
              messageQuery.data.map((m) => (
                <article className="space-y-2 border-t border-[#2A3446] p-5" key={m.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">{m.company}</h3>
                    <Badge status={m.status}>{m.status}</Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[#BCCCE6]">{m.body}</p>
                  {m.error && <p className="text-xs text-rose-300">{m.error}</p>}
                  <p className="text-xs text-[#8292AB]">
                    {m.status === "scheduled" && m.scheduled_at
                      ? `Scheduled: ${crmDate(m.scheduled_at, timezone)}`
                      : crmDate(m.created_at, timezone)}
                  </p>
                  {["draft", "failed"].includes(m.status) &&
                    integrations.data?.whatsapp?.status === "configured" && (
                      <button
                        type="button"
                        className={button}
                        onClick={() => openForm("message_schedule", m.lead_id, m.id)}
                      >
                        Schedule approved template
                      </button>
                    )}
                </article>
              ))
            )}
          </section>
        </div>
      )}

      {section === "discovery" && (
        <div className="space-y-4">
          <IntegrationCards data={integrations.data} />
          <DiscoveryPanel
            configured={integrations.data?.lead_discovery?.status === "configured"}
            onImported={() => void cache.invalidateQueries({ queryKey: ["crm"] })}
          />
          <section className={`${panel} space-y-4 p-5`}>
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-[#8FAEDC]" />
                An assistant grounded in your CRM
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#96A5BB]">
                Choose a lead and request a draft. Review the evidence and edit the suggestion
                before using it.
              </p>
            </div>
            <AIActions
              leads={leads}
              disabled={busy || integrations.data?.ai?.status !== "available"}
              run={(lead_id, kind) =>
                void perform(async () => {
                  setAiDraft(await crmWrite("ai/suggestions", { lead_id, kind }));
                }, "Suggestion prepared for your review.")
              }
            />
            {aiDraft && (
              <div className="space-y-3 rounded-xl bg-[#0B111C] p-4">
                <Badge>AI suggestion · review required</Badge>
                <textarea
                  aria-label="Editable AI suggestion"
                  className={input}
                  rows={9}
                  value={aiDraft.draft}
                  onChange={(e) => setAiDraft({ ...aiDraft, draft: e.target.value })}
                />
                <details>
                  <summary className="cursor-pointer text-xs text-[#8FAEDC]">
                    CRM evidence used
                  </summary>
                  <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-[#96A5BB]">
                    {JSON.stringify(aiDraft.evidence, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </section>
        </div>
      )}

      {section === "reports" && (
        <section className={panel}>
          <div className="flex flex-wrap justify-between gap-3 border-b border-[#2A3446] p-5">
            <div>
              <h2 className="font-semibold">Invoices & actual receipts</h2>
              {canManage && (
                <button className={`${button} mt-3`} onClick={() => openForm("target")}>
                  Set BDE target
                </button>
              )}
              <p className="mt-1 text-xs text-[#96A5BB]">
                Accepting a proposal never marks it paid. Each receipt needs its own reference.
              </p>
            </div>
            {canManage && (
              <button className={button} onClick={() => openForm("finance")}>
                <Plus className="size-4" />
                Record invoice / receipt
              </button>
            )}
          </div>
          {!financeQuery.data?.length ? (
            <Empty title="No finance records yet">
              Record invoices and actual receipts after a deal is confirmed as won.
            </Empty>
          ) : (
            financeQuery.data.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A3446] p-5"
              >
                <div>
                  <p className="font-semibold">{e.company}</p>
                  <p className="mt-1 text-xs text-[#96A5BB]">
                    {e.reference} · {crmDate(e.occurred_at, timezone)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>{e.kind}</Badge>
                  <span className="font-semibold tabular-nums">
                    {crmMoney(e.amount, e.currency)}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {section === "handoffs" && <HandoffList timezone={timezone} />}
      {section === "settings" &&
        (canConfigure ? (
          <div className="space-y-5">
            <CRMSettings onSaved={() => void cache.invalidateQueries({ queryKey: ["crm"] })} />
            <CRMTeamSettings />
            <section className={panel}>
              <div className="flex flex-wrap justify-between gap-3 border-b border-[#2A3446] p-5">
                <div>
                  <h2 className="font-semibold">Agency service catalog</h2>
                  <p className="mt-1 text-xs text-[#96A5BB]">
                    Prices become snapshots when added to a proposal.
                  </p>
                </div>
                <button className={button} onClick={() => openForm("service")}>
                  <Plus className="size-4" />
                  Add / update service
                </button>
              </div>
              {!catalog.data?.length ? (
                <Empty title="Set up your service catalog">
                  Enter agency-approved prices and discount floors before quoting.
                </Empty>
              ) : (
                catalog.data.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap justify-between gap-3 border-t border-[#2A3446] p-5"
                  >
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="mt-1 text-xs text-[#96A5BB]">
                        {s.sku} · {label(s.billing)} · Floor {money(s.minimum_price)}
                      </p>
                    </div>
                    <span className="font-semibold">{money(s.unit_price)}</span>
                  </div>
                ))
              )}
            </section>
            <IntegrationCards data={integrations.data} />
          </div>
        ) : (
          <Empty title="Agency settings require an administrator">
            BDE Heads manage team work and approvals. Agency configuration is controlled by Admin
            and Super Admin.
          </Empty>
        ))}

      {selectedLead && (
        <Modal
          title={detail.data?.lead.company_name || "Lead workspace"}
          subtitle="Contact, qualification, timeline, and the next responsible action."
          close={() => setSelectedLead(null)}
          wide
        >
          {detail.isPending ? (
            <Empty title="Loading lead..." />
          ) : detail.isError ? (
            <p role="alert" className="text-rose-300">
              {detail.error.message}
            </p>
          ) : (
            detail.data && (
              <div className="space-y-6">
                <LeadCard
                  lead={detail.data.lead}
                  timezone={timezone}
                  money={money}
                  people={team.data || []}
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    ...(["activity", "task", "qualify", "stage", "consent"] as FormKind[]),
                    ...(canManage ? ["assign" as FormKind] : []),
                  ].map((kind) => (
                    <button
                      key={kind}
                      className={button}
                      onClick={() => openForm(kind, selectedLead)}
                    >
                      {
                        (
                          {
                            activity: "Log activity",
                            task: "Next action",
                            qualify: "Qualification",
                            stage: "Move stage",
                            consent: "WhatsApp permission",
                            assign: "Reassign owner",
                          } as Record<string, string>
                        )[kind]
                      }
                    </button>
                  ))}
                </div>
                {detail.data.lead.phone && (
                  <a className={button} href={`tel:${detail.data.lead.phone}`}>
                    Call {detail.data.lead.phone}
                  </a>
                )}
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Requirements</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#96A5BB]">
                    {detail.data.lead.requirements || "No requirements captured yet."}
                  </p>
                </div>
                <section>
                  <h3 className="mb-3 font-semibold">Activity timeline</h3>
                  <div className="space-y-4 border-l border-[#34435C] pl-4">
                    {detail.data.activities.map((a) => (
                      <article key={a.id}>
                        <p className="text-sm text-[#D0DDF1]">{a.summary}</p>
                        {a.outcome && <p className="mt-1 text-xs text-[#96A5BB]">{a.outcome}</p>}
                        <p className="mt-1 text-[11px] text-[#6F85A4]">
                          {label(a.activity_type)} · {crmDate(a.created_at, timezone)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )
          )}
        </Modal>
      )}
      {form && (
        <CRMForm
          key={`${form.kind}-${form.lead}-${form.task}`}
          kind={form.kind}
          selectedLead={form.lead}
          taskId={form.task}
          leads={leads}
          people={team.data || []}
          currency={currency}
          close={() => setForm(null)}
          onSaved={async (message) => {
            setForm(null);
            setNotice(message);
            await cache.invalidateQueries({ queryKey: ["crm"] });
          }}
        />
      )}
      {proposal && (
        <ProposalBuilder
          original={proposal === "new" ? undefined : proposal}
          leads={leads}
          catalog={catalog.data || []}
          currency={currency}
          close={() => setProposal(null)}
          onSaved={async () => {
            setProposal(null);
            setNotice(
              "Proposal saved with server-calculated totals. Request head approval before sharing.",
            );
            await cache.invalidateQueries({ queryKey: ["crm"] });
          }}
        />
      )}
      {preview && (
        <Modal
          title={`${preview.number} / v${preview.version}`}
          close={() => setPreview(null)}
          wide
        >
          <ProposalPreview proposal={preview} />
        </Modal>
      )}
    </main>
  );
}

function LeadCard({
  lead,
  people,
  timezone,
  money,
  onClick,
}: {
  lead: CRMLead;
  people: CRMPerson[];
  timezone: string;
  money: (v: number) => string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge status={lead.status}>{label(lead.status)}</Badge>
        <span
          className={`text-[10px] font-bold uppercase ${lead.priority === "hot" ? "text-rose-300" : lead.priority === "warm" ? "text-amber-300" : "text-[#8FAEDC]"}`}
        >
          {lead.priority}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="break-words text-base font-semibold">{lead.company_name}</h3>
        <p className="mt-1 text-xs text-[#96A5BB]">
          {lead.name} ·{" "}
          {people.find((p) => p.id === lead.assigned_bde_id)?.name || "Unassigned BDE"}
        </p>
      </div>
      <p className="mt-4 text-lg font-semibold tabular-nums">
        {money(lead.estimated_deal_value * 100)}
      </p>
      <div className="mt-4 border-t border-[#2A3446] pt-3">
        <p className="truncate text-xs font-medium text-[#BCCCE6]">
          {lead.metadata_extra?.next_action || "Set a next action"}
        </p>
        <p className="mt-1 text-[11px] text-[#8292AB]">
          {crmDate(lead.next_follow_up_at, timezone)}
        </p>
      </div>
      {lead.metadata_extra?.qualification && (
        <p className="mt-3 text-[11px] text-[#8FAEDC]">
          Score {lead.metadata_extra.qualification.score}/100 ·{" "}
          {lead.metadata_extra.qualification.completeness}% evidence complete
        </p>
      )}
    </>
  );
  return onClick ? (
    <button
      onClick={onClick}
      className={`${panel} w-full p-5 text-left transition-colors hover:border-[#7FA0D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8FAEDC]`}
    >
      {content}
    </button>
  ) : (
    <div className={`${panel} p-5`}>{content}</div>
  );
}

function IntegrationCards({
  data,
  only,
}: {
  data?: Record<string, { status: string; detail: string }>;
  only?: string;
}) {
  return (
    <div className={`grid gap-3 ${only ? "" : "lg:grid-cols-3"}`}>
      {Object.entries(data || {})
        .filter(([key]) => !only || only === key)
        .map(([key, value]) => (
          <article key={key} className={`${panel} p-5`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{label(key)}</h2>
              <Badge status={value.status}>{label(value.status)}</Badge>
            </div>
            <p className="text-xs leading-relaxed text-[#96A5BB]">{value.detail}</p>
          </article>
        ))}
    </div>
  );
}

function AIActions({
  leads,
  disabled,
  run,
}: {
  leads: CRMLead[];
  disabled: boolean;
  run: (lead: string, kind: string) => void;
}) {
  const [lead, setLead] = useState("");
  const [kind, setKind] = useState("summary");
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <select
        aria-label="AI lead"
        className={input}
        value={lead}
        onChange={(e) => setLead(e.target.value)}
      >
        <option value="">Choose a CRM lead</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.company_name}
          </option>
        ))}
      </select>
      <select
        aria-label="AI task"
        className={input}
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        {["summary", "reply", "proposal", "next_action"].map((k) => (
          <option key={k} value={k}>
            {label(k)}
          </option>
        ))}
      </select>
      <button className={primary} disabled={disabled || !lead} onClick={() => run(lead, kind)}>
        <Sparkles className="size-4" />
        Draft suggestion
      </button>
    </div>
  );
}

function CRMForm({
  kind,
  selectedLead,
  taskId,
  leads,
  people,
  currency,
  close,
  onSaved,
}: {
  kind: FormKind;
  selectedLead?: string;
  taskId?: string;
  leads: CRMLead[];
  people: CRMPerson[];
  currency: string;
  close: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [values, setValues] = useState<Values>({
    lead_id: selectedLead || "",
    kind: "call",
    action: "complete",
    stage: "qualified",
    status: "unknown",
    billing: "one_time",
    quantity: "1",
    due_at: "",
    unit_price: "0",
    minimum_price: "0",
    service_fit: "",
    intent: "",
    urgency: "",
    engagement: "",
    decision_maker: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<
    { row: number; company: string; status: string }[] | null
  >(null);
  const templateQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "whatsapp-templates"],
    queryFn: () =>
      crmGet<
        {
          name: string;
          language: string;
          components: { type: string; text?: string }[];
        }[]
      >("whatsapp/templates"),
    enabled: kind === "message_schedule",
    retry: false,
  });
  const deliveryQuery = useQuery({
    queryKey: ["crm", crmAgencyKey(), "delivery-team"],
    queryFn: () => crmGet<CRMPerson[]>("delivery-team"),
    enabled: kind === "handoff",
  });
  const titles: Record<FormKind, string> = {
    target: "Set a monthly BDE target",
    handoff: "Hand a won deal to delivery",
    message_schedule: "Schedule an approved WhatsApp template",
    lead: "New opportunity",
    task: "Schedule the next action",
    referral: "Register a referral",
    finance: "Record an invoice or receipt",
    message: "Save a message draft",
    activity: "Record a conversation",
    consent: "WhatsApp permission",
    qualify: "Evidence-based qualification",
    stage: "Update pipeline stage",
    assign: "Reassign the lead",
    service: "Agency service pricing",
    task_action: "Resolve a follow-up",
    import: "Review a CSV import",
  };
  const field = (
    name: string,
    title: string,
    type = "text",
    required = true,
    options?: { value: string; label: string }[],
    hint?: string,
  ) => (
    <Field
      name={name}
      title={title}
      values={values}
      setValues={(v) => {
        setValues(v);
        if (kind === "import") setImportPreview(null);
      }}
      type={type}
      required={required}
      options={options}
      hint={hint}
    />
  );
  const opts = (list: string[]) => list.map((v) => ({ value: v, label: label(v) }));
  const timestamp = (name: string) =>
    values[name] ? new Date(values[name]).toISOString() : undefined;
  const amount = (name: string) => Math.round(Number(values[name] || 0) * 100);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const lead = values.lead_id;
      if (kind === "lead")
        await crmWrite("leads", {
          name: values.name,
          company_name: values.company_name,
          email: values.email || null,
          phone: values.phone || null,
          requirements: values.requirements || "",
          industry: values.industry || "",
          location: values.location || "",
          estimated_deal_value: Number(values.estimated_deal_value || 0),
          lead_source: values.lead_source || "Manual",
          assigned_bde_id: values.assigned_bde_id || null,
          next_action: values.next_action || "Initial qualification call",
          due_at: timestamp("due_at"),
        });
      if (kind === "target")
        await crmWrite(
          "targets",
          {
            user_id: values.user_id,
            month: values.month,
            amount: amount("amount"),
          },
          "PUT",
        );
      if (kind === "handoff")
        await crmWrite("handoffs", {
          proposal_id: taskId,
          owner_id: values.owner_id,
        });
      if (kind === "task")
        await crmWrite("tasks", {
          lead_id: lead,
          title: values.title,
          kind: values.kind,
          due_at: timestamp("due_at"),
        });
      if (kind === "task_action")
        await crmWrite(`tasks/${taskId}/action`, {
          action: values.action,
          reason: values.reason,
          due_at: timestamp("due_at") || null,
          next_title: values.next_title || "",
        });
      if (kind === "referral")
        await crmWrite("referrals", {
          lead_id: lead,
          referrer: values.referrer,
          source: values.source || "Referral",
          notes: values.notes || "",
        });
      if (kind === "finance")
        await crmWrite("finance", {
          lead_id: lead,
          kind: values.finance_kind,
          amount: amount("amount"),
          reference: values.reference,
          occurred_at: timestamp("occurred_at"),
        });
      if (kind === "message_schedule") {
        const [template, language] = (values.template || "").split("|");
        await crmWrite(`messages/${taskId}/schedule`, {
          template,
          language,
          variables: values.variables ? values.variables.split("\n").map((v) => v.trim()) : [],
          scheduled_at: timestamp("due_at"),
        });
      }
      if (kind === "message")
        await crmWrite("messages", {
          lead_id: lead,
          body: values.body,
          idempotency_key: crypto.randomUUID(),
        });
      if (kind === "activity")
        await crmWrite(`leads/${lead}/activities`, {
          kind: values.kind,
          summary: values.summary,
          outcome: values.outcome || "",
        });
      if (kind === "consent")
        await crmWrite(`leads/${lead}/consent`, {
          status: values.status,
          evidence: values.evidence,
          purpose: values.purpose,
        });
      if (kind === "qualify")
        await crmWrite(`leads/${lead}/qualify`, {
          evidence: Object.fromEntries(
            ["service_fit", "intent", "urgency", "engagement", "decision_maker"].map((k) => [
              k,
              values[k] === "" ? null : Number(values[k]),
            ]),
          ),
          reason: values.reason,
          override: values.override || null,
        });
      if (kind === "stage")
        await crmWrite(`leads/${lead}/stage`, {
          stage: values.stage,
          reason: values.reason || "",
          booked_minor: values.stage === "converted" ? amount("amount") : null,
        });
      if (kind === "assign")
        await crmWrite(`leads/${lead}/assign`, {
          owner_id: values.owner_id,
          reason: values.reason,
        });
      if (kind === "service")
        await crmWrite("catalog", {
          sku: values.sku,
          title: values.title,
          description: values.description || "",
          unit_price: amount("unit_price"),
          minimum_price: amount("minimum_price"),
          billing: values.billing,
        });
      if (kind === "import") {
        const result = await crmWrite<{
          rows: { row: number; company: string; status: string }[];
          imported: number;
        }>("imports", {
          csv_text: values.csv_text,
          due_at: timestamp("due_at"),
          commit: !!importPreview,
        });
        if (!importPreview) {
          setImportPreview(result.rows);
          return;
        }
      }
      await onSaved(
        kind === "message"
          ? "Message draft saved internally. No WhatsApp message was sent."
          : kind === "consent"
            ? "Permission evidence recorded. Opt-outs suppress pending drafts."
            : "Saved successfully. Your workspace statistics have been refreshed.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={titles[kind]}
      subtitle="Changes are saved to your agency CRM and recorded in the activity history."
      close={close}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
            {error}
          </p>
        )}
        {!["lead", "service", "import", "task_action", "target"].includes(kind) &&
          !selectedLead &&
          field(
            "lead_id",
            "CRM lead",
            "text",
            true,
            leads.map((l) => ({ value: l.id, label: l.company_name })),
          )}
        {kind === "lead" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Contact name")}
              {field("company_name", "Company / brand")}
              {field("email", "Email", "email", false)}
              {field(
                "phone",
                "International phone",
                "tel",
                false,
                undefined,
                "Include country code, e.g. +919876543210",
              )}
              {field("industry", "Industry", "text", false)}
              {field("location", "Location", "text", false)}
            </div>
            {field(
              "assigned_bde_id",
              "BDE owner",
              "text",
              false,
              people.map((p) => ({ value: p.id, label: p.name })),
              "Defaults to you. Heads can assign within their reporting team.",
            )}
            {field(
              "estimated_deal_value",
              `Expected deal value (${currency}, whole units)`,
              "number",
              false,
            )}
            {field("lead_source", "Source", "text", false)}
            {field("requirements", "Requirements", "textarea", false)}
            {field("next_action", "First action", "text", false)}
            {field("due_at", "First follow-up", "datetime-local")}
          </>
        )}
        {kind === "task" && (
          <>
            {field("title", "Next action")}
            {field(
              "kind",
              "Action type",
              "text",
              true,
              opts(["call", "message", "meeting", "research", "proposal", "referral"]),
            )}
            {field("due_at", "Due date and time", "datetime-local")}
          </>
        )}
        {kind === "task_action" && (
          <>
            {field("action", "Resolution", "text", true, opts(["complete", "snooze"]))}
            {field(
              "reason",
              values.action === "snooze" ? "Reason for snoozing" : "Conversation outcome",
              "textarea",
            )}
            {values.action === "complete" &&
              field(
                "next_title",
                "Next action",
                "text",
                false,
                undefined,
                "Required if this is the active lead's last pending task.",
              )}
            {field(
              "due_at",
              values.action === "snooze" ? "New due date" : "Next action due date",
              "datetime-local",
              values.action === "snooze",
            )}
          </>
        )}
        {kind === "referral" && (
          <>
            {field("referrer", "Introduced by")}
            {field("source", "Referral source / campaign", "text", false)}
            {field("notes", "Referral context", "textarea", false)}
          </>
        )}
        {kind === "finance" && (
          <>
            {field("finance_kind", "Record type", "text", true, opts(["invoice", "receipt"]))}
            {field("amount", `Actual amount (${currency})`, "number")}
            {field("reference", "Unique invoice / receipt reference")}
            {field("occurred_at", "Actual issue / payment date", "datetime-local")}
          </>
        )}
        {kind === "target" && (
          <>
            {field(
              "user_id",
              "BDE",
              "text",
              true,
              people.map((p) => ({ value: p.id, label: p.name })),
            )}
            {field("month", "Reporting month", "month")}
            {field("amount", `Booked value target (${currency})`, "number")}
          </>
        )}
        {kind === "handoff" && (
          <>
            <p className="text-sm text-[#96A5BB]">
              Confirm the lead as won first. Delivery receives the exact accepted scope and proposal
              version.
            </p>
            {deliveryQuery.isError && (
              <p role="alert" className="text-rose-300">
                {deliveryQuery.error.message}
              </p>
            )}
            {field(
              "owner_id",
              "Delivery lead",
              "text",
              true,
              (deliveryQuery.data || []).map((p) => ({
                value: p.id,
                label: p.name,
              })),
            )}
          </>
        )}
        {kind === "message_schedule" && (
          <>
            <p className="text-sm text-[#96A5BB]">
              This schedules a real provider send. Permission, quiet hours, frequency and template
              approval are rechecked when it runs.
            </p>
            {templateQuery.isPending && <p role="status">Verifying Meta templates...</p>}
            {templateQuery.isError && (
              <p role="alert" className="text-rose-300">
                {templateQuery.error.message}
              </p>
            )}
            {field(
              "template",
              "Approved template",
              "text",
              true,
              (templateQuery.data || []).map((t) => ({
                value: t.name + "|" + t.language,
                label: t.name + " (" + t.language + ")",
              })),
            )}
            <p className="whitespace-pre-wrap rounded-xl bg-[#0B111C] p-3 text-sm text-[#BCCCE6]">
              {templateQuery.data
                ?.find((t) => t.name + "|" + t.language === values.template)
                ?.components.find((c) => c.type === "BODY")?.text ||
                "Select a template to review its approved content."}
            </p>
            {field("variables", "Body variables, one per line", "textarea", false)}
            {field("due_at", "Scheduled sending time", "datetime-local")}
          </>
        )}
        {kind === "message" && (
          <>
            <p className="text-sm leading-relaxed text-[#96A5BB]">
              This saves an internal draft. Sending requires a connected official provider and
              permission checks.
            </p>
            {field("body", "Message draft", "textarea")}
          </>
        )}
        {kind === "activity" && (
          <>
            {field(
              "kind",
              "Interaction type",
              "text",
              true,
              opts(["call", "meeting", "note", "email", "whatsapp"]),
            )}
            {field("summary", "What was discussed?", "textarea")}
            {field("outcome", "Outcome", "text", false)}
          </>
        )}
        {kind === "consent" && (
          <>
            {field(
              "status",
              "Permission status",
              "text",
              true,
              opts(["unknown", "opted_in", "opted_out"]),
            )}
            {field("purpose", "Purpose / scope of permission")}
            {field(
              "evidence",
              "Source and evidence",
              "textarea",
              true,
              undefined,
              "A public phone number or imported contact is not permission. Record the actual evidence.",
            )}
          </>
        )}
        {kind === "qualify" && (
          <>
            <p className="text-sm leading-relaxed text-[#96A5BB]">
              Enter a score from 0 to 100 for each known factor. Leave missing evidence blank;
              incomplete qualification stays Unknown.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {["service_fit", "intent", "urgency", "engagement", "decision_maker"].map((k) => (
                <div key={k}>{field(k, label(k), "number", false)}</div>
              ))}
            </div>
            {field(
              "override",
              "Optional temperature override",
              "text",
              false,
              opts(["hot", "warm", "cold"]),
            )}
            {field("reason", "Evidence and override reason", "textarea")}
          </>
        )}
        {kind === "stage" && (
          <>
            {field("stage", "Pipeline stage", "text", true, opts(stages))}
            {field(
              "reason",
              "Reason / outcome",
              "textarea",
              ["lost", "disqualified", "nurture"].includes(values.stage || ""),
            )}
            {values.stage === "converted" &&
              field(
                "amount",
                `Confirmed booked contract value (${currency})`,
                "number",
                true,
                undefined,
                "This records a won deal. Cash collection remains separate.",
              )}
          </>
        )}
        {kind === "assign" && (
          <>
            {field(
              "owner_id",
              "New BDE owner",
              "text",
              true,
              people.map((p) => ({ value: p.id, label: p.name })),
            )}
            {field("reason", "Reason for reassignment", "textarea")}
          </>
        )}
        {kind === "service" && (
          <>
            {field(
              "sku",
              "Service SKU",
              "text",
              true,
              undefined,
              "Use an existing SKU to update its catalog default. Existing proposals are unaffected.",
            )}
            {field("title", "Service title")}
            {field("description", "Scope / deliverables", "textarea", false)}
            {field(
              "billing",
              "Billing period",
              "text",
              true,
              opts(["one_time", "monthly", "quarterly", "annual"]),
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("unit_price", `List price (${currency})`, "number")}
              {field("minimum_price", `Approval floor (${currency})`, "number")}
            </div>
          </>
        )}
        {kind === "import" && (
          <>
            <p className="text-sm leading-relaxed text-[#96A5BB]">
              Paste CSV with name, company_name, email, phone columns. Preview checks format and
              duplicate contacts. No rows are saved until you confirm.
            </p>
            {field("csv_text", "CSV contents", "textarea")}
            {field("due_at", "Initial follow-up for imported leads", "datetime-local")}
            {importPreview && (
              <div className="max-h-64 overflow-auto rounded-xl border border-[#2A3446]">
                {importPreview.map((row) => (
                  <div
                    key={row.row}
                    className="flex justify-between gap-3 border-b border-[#2A3446] p-3 text-xs"
                  >
                    <span>
                      Row {row.row} · {row.company}
                    </span>
                    <Badge status={row.status === "ready" ? "verified" : "overdue"}>
                      {row.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2 border-t border-[#2A3446] pt-4">
          <button type="button" className={button} onClick={close} disabled={saving}>
            Cancel
          </button>
          <button
            className={primary}
            disabled={
              saving || !!(kind === "import" && importPreview?.some((r) => r.status !== "ready"))
            }
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {kind === "import"
              ? importPreview
                ? "Confirm import"
                : "Preview import"
              : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProposalBuilder({
  original,
  leads,
  catalog,
  currency,
  close,
  onSaved,
}: {
  original?: CRMProposal;
  leads: CRMLead[];
  catalog: CRMService[];
  currency: string;
  close: () => void;
  onSaved: () => Promise<void>;
}) {
  const [values, setValues] = useState<Values>({
    lead_id: original?.lead_id || "",
    title: original?.title || "",
    summary: original?.snapshot.summary || "",
    scope: original?.snapshot.scope || "",
    terms: original?.snapshot.terms || "",
    valid_until: "",
    tax: original ? String(original.snapshot.tax_bps / 100) : "0",
  });
  const blank: ProposalLine = {
    title: "",
    description: "",
    quantity: "1",
    unit_price: 0,
    discount_bps: 0,
    billing: "one_time",
  };
  const [lines, setLines] = useState<ProposalLine[]>(
    original?.snapshot.items.map(
      ({ service_id, title, description, quantity, unit_price, discount_bps, billing }) => ({
        service_id,
        title,
        description,
        quantity,
        unit_price,
        discount_bps,
        billing,
      }),
    ) || [{ ...blank }],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const field = (
    name: string,
    title: string,
    type = "text",
    required = true,
    options?: { value: string; label: string }[],
  ) => (
    <Field
      name={name}
      title={title}
      type={type}
      required={required}
      values={values}
      setValues={setValues}
      options={options}
    />
  );
  function edit(index: number, patch: Partial<ProposalLine>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await crmWrite("proposals", {
        lead_id: values.lead_id,
        title: values.title,
        summary: values.summary,
        scope: values.scope,
        terms: values.terms,
        tax_bps: Math.round(Number(values.tax) * 100),
        valid_until: new Date(values.valid_until || "").toISOString(),
        items: lines,
        revision_of: original?.id || null,
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save proposal.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={original ? `Revise ${original.number}` : "Build a client proposal"}
      subtitle="Choose services, shape the scope, and set clear commercial terms."
      wide
      close={close}
    >
      <form onSubmit={submit} className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
        {original && (
          <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
            Saving creates a new version and revokes previous client links. The earlier price
            snapshot stays intact.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            "lead_id",
            "CRM client",
            "text",
            true,
            leads.map((l) => ({ value: l.id, label: l.company_name })),
          )}
          {field("title", "Proposal title")}
          {field("valid_until", "Valid until", "datetime-local")}
          {field("tax", "Tax rate (%)", "number")}
        </div>
        {field("summary", "Executive summary", "textarea", false)}
        {field("scope", "Scope, deliverables & timeline", "textarea", false)}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Service & price lines</h3>
            <button
              type="button"
              className={button}
              onClick={() => setLines([...lines, { ...blank }])}
            >
              <Plus className="size-4" />
              Add line
            </button>
          </div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-[#2A3446] bg-[#0B111C] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#8FAEDC]">Service {index + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines(lines.filter((_, i) => i !== index))}
                    className="min-h-10 px-3 text-xs text-rose-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              <select
                aria-label={`Catalog service ${index + 1}`}
                className={input}
                value={line.service_id || ""}
                onChange={(e) => {
                  const s = catalog.find((s) => s.id === e.target.value);
                  edit(
                    index,
                    s
                      ? {
                          service_id: s.id,
                          title: s.title,
                          description: s.description,
                          unit_price: s.unit_price,
                          billing: s.billing,
                        }
                      : { service_id: undefined },
                  );
                }}
              >
                <option value="">Custom service line</option>
                {catalog
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} · {crmMoney(s.unit_price, currency)}
                    </option>
                  ))}
              </select>
              <input
                aria-label={`Service title ${index + 1}`}
                className={input}
                value={line.title}
                required
                maxLength={255}
                onChange={(e) => edit(index, { title: e.target.value })}
                placeholder="Service name"
              />
              <textarea
                aria-label={`Service scope ${index + 1}`}
                className={input}
                value={line.description}
                onChange={(e) => edit(index, { description: e.target.value })}
                placeholder="Deliverables, scope and exclusions"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="space-y-1 text-xs text-[#96A5BB]">
                  Quantity
                  <input
                    aria-label={`Quantity ${index + 1}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className={input}
                    value={line.quantity}
                    onChange={(e) => edit(index, { quantity: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-xs text-[#96A5BB]">
                  Unit price ({currency})
                  <input
                    aria-label={`Unit price ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className={input}
                    value={line.unit_price / 100}
                    onChange={(e) =>
                      edit(index, {
                        unit_price: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-[#96A5BB]">
                  Discount %
                  <input
                    aria-label={`Discount ${index + 1}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={input}
                    value={line.discount_bps / 100}
                    onChange={(e) =>
                      edit(index, {
                        discount_bps: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-[#96A5BB]">
                  Billing
                  <select
                    aria-label={`Billing ${index + 1}`}
                    className={input}
                    value={line.billing}
                    onChange={(e) => edit(index, { billing: e.target.value })}
                  >
                    {["one_time", "monthly", "quarterly", "annual"].map((b) => (
                      <option value={b} key={b}>
                        {label(b)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </section>
        <p className="text-xs leading-relaxed text-[#96A5BB]">
          The server calculates exact discounts and taxes when saving. Review the saved preview
          before approval. Recurring charges are listed by period and are never silently added to
          one-time charges.
        </p>
        {field("terms", "Payment terms, milestones & acceptance", "textarea", false)}
        <div className="flex justify-end gap-2 border-t border-[#2A3446] pt-4">
          <button type="button" className={button} onClick={close} disabled={saving}>
            Cancel
          </button>
          <button className={primary} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}Save & calculate proposal
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ProposalPreview({ proposal }: { proposal: CRMProposal }) {
  const data = proposal.snapshot;
  const brand = data.branding;
  return (
    <article className="space-y-7 rounded-xl bg-[#F6F8FC] p-5 text-[#18243A] sm:p-9">
      <header className="flex flex-wrap justify-between gap-4 border-b border-[#CBD5E6] pb-5">
        <div>
          <p className="text-xl font-extrabold">{brand.agency_name || "Creo"}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#53647E]">
            {brand.address}
            <br />
            {brand.contact}
            <br />
            {brand.tax_id}
          </p>
        </div>
        <div className="text-xs leading-relaxed text-[#53647E]">
          <p>
            {proposal.number} · Version {proposal.version}
          </p>
          <p>Valid until {crmDate(proposal.valid_until)}</p>
          <p>{label(proposal.status)}</p>
        </div>
      </header>
      <div>
        <h2 className="text-2xl font-bold">{proposal.title}</h2>
        <p className="mt-3 text-sm">
          Prepared for <strong>{data.client.company}</strong> · {data.client.name}
        </p>
      </div>
      {[
        ["Executive summary", data.summary],
        ["Scope & timeline", data.scope],
      ].map(
        ([title, text]) =>
          text && (
            <section key={title}>
              <h3 className="mb-2 font-bold">{title}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#53647E]">{text}</p>
            </section>
          ),
      )}
      {Object.entries(data.totals).map(([billing, total]) => (
        <section key={billing}>
          <h3 className="mb-3 font-bold">{label(billing)} charges</h3>
          <div className="divide-y divide-[#CBD5E6] border-y border-[#CBD5E6]">
            {data.items
              .filter((i) => i.billing === billing)
              .map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-[#53647E]">
                      {item.description}
                    </p>
                    <p className="mt-1 text-xs text-[#53647E]">
                      {item.quantity} × {crmMoney(item.unit_price, proposal.currency)} ·{" "}
                      {item.discount_bps / 100}% discount
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {crmMoney(item.total || 0, proposal.currency)}
                  </p>
                </div>
              ))}
          </div>
          <div className="ml-auto mt-3 max-w-xs space-y-1 text-xs text-[#53647E]">
            {[
              ["Subtotal", total.subtotal],
              ["Discount", total.discount],
              ["Tax", total.tax],
              ["Total", total.total],
            ].map(([title, value]) => (
              <div className="flex justify-between gap-4" key={title}>
                <span>{title}</span>
                <span className={title === "Total" ? "text-base font-bold text-[#18243A]" : ""}>
                  {crmMoney(Number(value), proposal.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h3 className="mb-2 font-bold">Terms & acceptance</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#53647E]">
          {data.terms || "Terms to be agreed with the agency."}
        </p>
      </section>
      <footer className="border-t border-[#CBD5E6] pt-4 text-xs text-[#53647E]">
        {brand.footer || "Confidential proposal. Prices apply to this version only."}
      </footer>
    </article>
  );
}

function CRMSettings({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["crm", crmAgencyKey(), "settings", user?.id],
    queryFn: () => crmGet<Record<string, string | number>>("settings"),
  });
  if (query.isPending) return <Empty title="Loading agency settings..." />;
  if (query.isError)
    return (
      <p role="alert" className="text-rose-300">
        {query.error.message}
      </p>
    );
  return <SettingsForm initial={query.data || {}} onSaved={onSaved} />;
}
function SettingsForm({
  initial,
  onSaved,
}: { initial: Record<string, string | number>; onSaved: () => void }) {
  const [values, setValues] = useState<Values>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const stringKeys = [
      "timezone",
      "currency",
      "agency_name",
      "address",
      "contact",
      "tax_id",
      "footer",
    ];
    const numbers = [
      "discount_approval_percent",
      "hot_threshold",
      "warm_threshold",
      "monthly_won_target",
      "quiet_start",
      "quiet_end",
      "max_messages_per_day",
    ];
    const payload = {
      ...Object.fromEntries(
        stringKeys.map((k) => [k, values[k] || (k === "agency_name" ? "Creo" : "")]),
      ),
      ...Object.fromEntries(numbers.map((k) => [k, Number(values[k] || 0)])),
    };
    try {
      await crmWrite("settings", payload, "PUT");
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={`${panel} space-y-5 p-5`}>
      <div>
        <h2 className="font-semibold">Agency letterhead & commercial policy</h2>
        <p className="mt-1 text-xs text-[#96A5BB]">
          New proposals snapshot this branding. Existing versions retain their issued details.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-emerald-300">
          Agency policy saved.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["agency_name", "Agency name", "text"],
          ["contact", "Agency contact", "text"],
          ["timezone", "Reporting timezone", "text"],
          ["currency", "Reporting currency", "text"],
          ["tax_id", "GST / tax identity", "text"],
          ["quiet_start", "Quiet hours begin (0-23)", "number"],
          ["quiet_end", "Messaging hours begin (0-23)", "number"],
          ["max_messages_per_day", "Maximum messages per contact / day", "number"],
          ["discount_approval_percent", "Discount approval threshold (%)", "number"],
          ["hot_threshold", "Hot score threshold", "number"],
          ["warm_threshold", "Warm score threshold", "number"],
          ["monthly_won_target", "Monthly booked target (minor units)", "number"],
        ].map(([name, title, type]) => (
          <Field
            key={name}
            name={name || ""}
            title={title || ""}
            type={type}
            required={!["contact", "tax_id"].includes(name || "")}
            values={values}
            setValues={setValues}
          />
        ))}
      </div>
      <Field
        name="address"
        title="Agency address"
        type="textarea"
        required={false}
        values={values}
        setValues={setValues}
      />
      <Field
        name="footer"
        title="Letterhead footer"
        type="textarea"
        required={false}
        values={values}
        setValues={setValues}
      />
      <button className={primary} disabled={busy}>
        {busy ? "Saving..." : "Save agency settings"}
      </button>
    </form>
  );
}

function CRMTeamSettings() {
  const [account, setAccount] = useState<Values>({ role: "bde" });
  const [accountNotice, setAccountNotice] = useState("");
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["crm", crmAgencyKey(), "team-admin", user?.id],
    queryFn: () => crmGet<(CRMPerson & { head_id?: string })[]>("team-admin"),
  });
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Values>({});
  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setAccountNotice("");
    try {
      await crmWrite("team-admin/accounts", account);
      setAccount({ role: "bde" });
      setAccountNotice(
        "Account created. Share the temporary password privately; a password reset is required at first sign-in.",
      );
      await cache.invalidateQueries({ queryKey: ["crm"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create CRM account.");
    } finally {
      setBusy(false);
    }
  }
  async function assign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await crmWrite("team-admin", values, "PUT");
      await cache.invalidateQueries({ queryKey: ["crm"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to assign reporting head.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${panel} space-y-4 p-5`}>
      <h2 className="font-semibold">BDE accounts & reporting structure</h2>
      <form onSubmit={createAccount} className="grid items-end gap-3 sm:grid-cols-2">
        <Field name="name" title="Staff full name" values={account} setValues={setAccount} />
        <Field
          name="email"
          title="Work email"
          type="email"
          values={account}
          setValues={setAccount}
        />
        <Field
          name="role"
          title="CRM role"
          values={account}
          setValues={setAccount}
          options={[
            { value: "bde", label: "BDE" },
            { value: "bde_head", label: "BDE Head" },
          ]}
        />
        <Field
          name="temporary_password"
          title="Temporary password (12+ characters)"
          type="password"
          values={account}
          setValues={setAccount}
        />
        <button className={button} disabled={busy}>
          Create CRM account
        </button>
      </form>
      {accountNotice && (
        <p role="status" className="text-sm text-emerald-300">
          {accountNotice}
        </p>
      )}
      <p className="text-xs text-[#96A5BB]">
        Uses Creo staff reporting lines. Only the selected head can see the BDE's assigned CRM
        records.
      </p>
      {(error || query.isError) && (
        <p role="alert" className="text-sm text-rose-300">
          {error || query.error?.message}
        </p>
      )}
      <form onSubmit={assign} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field
          name="user_id"
          title="BDE"
          values={values}
          setValues={setValues}
          options={(query.data || [])
            .filter((p) => ["bde", "sales"].includes(p.role))
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <Field
          name="head_id"
          title="BDE Head"
          values={values}
          setValues={setValues}
          options={(query.data || [])
            .filter((p) => p.role === "bde_head")
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <button className={button} disabled={busy}>
          Assign head
        </button>
      </form>
      <div className="divide-y divide-[#2A3446]">
        {query.data?.map((p) => (
          <div key={p.id} className="flex justify-between gap-3 py-3 text-xs">
            <span>
              {p.name} <span className="text-[#8292AB]">· {label(p.role)}</span>
            </span>
            <span className="text-[#96A5BB]">
              {query.data.find((h) => h.id === p.head_id)?.name || "No reporting head"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HandoffList({ timezone }: { timezone: string }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["crm", crmAgencyKey(), "handoffs", user?.id],
    queryFn: () =>
      crmGet<
        {
          id: string;
          status: string;
          created_at: string;
          snapshot: {
            lead: { company: string; contact: string };
            proposal: CRMProposal;
          };
        }[]
      >("handoffs"),
  });
  return (
    <section className={panel}>
      <header className="border-b border-[#2A3446] p-5">
        <h2 className="font-semibold">Sales to delivery</h2>
        <p className="mt-1 text-xs text-[#96A5BB]">
          Create a handoff from an accepted proposal after confirming the deal as won.
        </p>
      </header>
      {query.isError && (
        <p role="alert" className="p-5 text-rose-300">
          {query.error.message}
        </p>
      )}
      {query.isPending ? (
        <Empty title="Loading handoffs..." />
      ) : !query.data?.length ? (
        <Empty title="No delivery handoffs yet">
          Accepted scope, client promises and the exact proposal version will appear here.
        </Empty>
      ) : (
        query.data.map((h) => (
          <article className="space-y-3 border-t border-[#2A3446] p-5" key={h.id}>
            <div className="flex justify-between gap-3">
              <h3 className="font-semibold">{h.snapshot.lead.company}</h3>
              <Badge status={h.status}>{h.status}</Badge>
            </div>
            <p className="text-xs text-[#96A5BB]">
              {h.snapshot.proposal.number} / v{h.snapshot.proposal.version} -{" "}
              {crmDate(h.created_at, timezone)}
            </p>
            <p className="whitespace-pre-wrap text-sm text-[#BCCCE6]">
              {h.snapshot.proposal.snapshot.scope ||
                "Review the accepted proposal for agreed scope."}
            </p>
          </article>
        ))
      )}
    </section>
  );
}

interface DiscoveryResult {
  company_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  location: string;
  industry: string;
  website: string;
  provider: string;
  source_url: string;
  storage_permitted: boolean;
  contact_verified: boolean;
  duplicate: boolean;
  review_token: string;
}
function DiscoveryPanel({
  configured,
  onImported,
}: { configured: boolean; onImported: () => void }) {
  const [values, setValues] = useState<Values>({ query: "", location: "" });
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [selected, setSelected] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await crmWrite<{ results: DiscoveryResult[] }>("discovery/search", {
        query: values.query,
        location: values.location,
        limit: 10,
      });
      setResults(r.results);
      if (!r.results.length) setNotice("No companies matched this authorized provider search.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to search provider.");
    } finally {
      setBusy(false);
    }
  }
  async function importResult(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await crmWrite("discovery/import", {
        review_token: selected.review_token,
        contact_name: values.contact_name,
        due_at: new Date(values.due_at || "").toISOString(),
      });
      setSelected(null);
      setNotice(
        "Lead imported with provider provenance and a next action. WhatsApp permission remains unknown.",
      );
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import result.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${panel} space-y-4 p-5`}>
      <div>
        <h2 className="font-semibold">Licensed lead finder</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#96A5BB]">
          Search an agency-authorized provider, verify source evidence, then review each import.
          Missing contacts stay unknown.
        </p>
      </div>
      {!configured && (
        <p className="rounded-xl bg-[#0B111C] p-4 text-sm text-[#96A5BB]">
          A licensed provider must be connected by the agency administrator before discovery is
          available.
        </p>
      )}
      <form onSubmit={search} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field
          name="query"
          title="Industry, service or keywords"
          values={values}
          setValues={setValues}
        />
        <Field name="location" title="Target location" values={values} setValues={setValues} />
        <button className={button} disabled={!configured || busy}>
          <Search className="size-4" />
          Search provider
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-300">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((r, i) => (
          <article
            key={r.review_token}
            className="space-y-3 rounded-xl border border-[#2A3446] bg-[#0B111C] p-4"
          >
            <h3 className="font-semibold">{r.company_name}</h3>
            <p className="text-xs text-[#96A5BB]">
              {r.industry} - {r.location}
            </p>
            <p className="text-xs text-[#8292AB]">
              {r.provider} -{" "}
              {r.contact_verified ? "Provider-verified contact" : "Contact verification unknown"}
            </p>
            <p className="text-xs text-[#96A5BB]">
              {r.phone || "Phone unknown"} - {r.email || "Email unknown"}
            </p>
            <button
              className={button}
              disabled={!r.storage_permitted || r.duplicate || busy}
              onClick={() => {
                setSelected(r);
                setValues({ ...values, contact_name: r.contact_name || "" });
                setError("");
              }}
            >
              {r.duplicate
                ? "Duplicate in agency"
                : r.storage_permitted
                  ? "Review import"
                  : "Storage not licensed"}
            </button>
            <span className="sr-only">Result {i + 1}</span>
          </article>
        ))}
      </div>
      {selected && (
        <form
          onSubmit={importResult}
          className="space-y-4 rounded-xl border border-[#7FA0D6]/40 p-4"
        >
          <h3 className="font-semibold">Review: {selected.company_name}</h3>
          <Field
            name="contact_name"
            title="Verified contact name or agency contact label"
            values={values}
            setValues={setValues}
          />
          <Field
            name="due_at"
            title="First qualification follow-up"
            type="datetime-local"
            values={values}
            setValues={setValues}
          />
          <p className="text-xs text-[#96A5BB]">
            This does not opt the contact into WhatsApp or email. Review the provider's storage
            rights and your agency's outreach permissions.
          </p>
          <div className="flex gap-2">
            <button type="button" className={button} onClick={() => setSelected(null)}>
              Cancel
            </button>
            <button className={primary} disabled={busy}>
              Confirm reviewed import
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
