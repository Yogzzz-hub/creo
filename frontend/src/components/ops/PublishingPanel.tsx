import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  History,
  Instagram,
  LifeBuoy,
  Link2,
  Loader2,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";

export interface PublishingJob {
  id: string;
  client_id: string;
  client_name?: string;
  title?: string;
  deliverable_id: string;
  status: string;
  caption: string;
  media_type: "IMAGE" | "REELS" | "STORIES";
  timezone: string;
  scheduled_at?: string;
  published_at?: string;
  permalink?: string;
  instagram_account_id?: string;
  last_error?: string;
  error_code?: string;
  calendar_publish_at?: string | null;
  review_fingerprint: string;
  approved: boolean;
  version: number;
  attempts: number;
}
interface Details {
  job: PublishingJob | null;
  calendar_publish_at?: string | null;
  timezone: string;
  approval_status: string;
  file_type: string;
  can_manage: boolean;
  can_approve: boolean;
  connection_status: string;
  account?: string;
}
const input =
  "mt-1.5 w-full min-h-11 rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-sm text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none disabled:opacity-50";
const labelText = "block text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]";
// One button system for every publishing surface: same height, radius and type size,
// so rows of actions always line up. `flex-1` makes a row share its width evenly.
const btnBase =
  "inline-flex min-h-10 flex-1 basis-36 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] disabled:cursor-not-allowed disabled:opacity-50";
const button = `${btnBase} border-[#2A3446] bg-[#161F2D] text-[#BCCCE6] enabled:hover:border-[#7FA0D6]/50 enabled:hover:text-white`;
const buttonPrimary = `${btnBase} border-transparent bg-[#BCCCE6] text-[#0B111C] enabled:hover:bg-white`;
const buttonDanger = `${btnBase} border-rose-500/30 bg-rose-500/10 text-rose-300 enabled:hover:border-rose-400/60 enabled:hover:text-rose-200`;
const linkButton = `${button} no-underline`;

const STATUS_TONE: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  scheduled: "bg-[#7FA0D6]/15 text-[#BCCCE6] border-[#7FA0D6]/30",
  processing: "bg-[#7FA0D6]/15 text-[#BCCCE6] border-[#7FA0D6]/30",
  needs_schedule: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_approval: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  uncertain: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  paused: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  canceled: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
        STATUS_TONE[status] || "bg-[#2A3446]/40 text-[#BCCCE6] border-[#2A3446]"
      }`}
    >
      {label}
    </span>
  );
}

export const publishingLabel = (status: string) =>
  ({
    pending_approval: "Awaiting client approval",
    needs_schedule: "Approved — needs schedule",
    scheduled: "Scheduled",
    processing: "Processing with Instagram",
    published: "Published",
    paused: "Paused",
    failed: "Publishing failed",
    uncertain: "Publication needs reconciliation",
    canceled: "Canceled",
  })[status] || status;

function localValue(timestamp: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const get = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function PublishingPanel({
  deliverableId,
  readOnly = false,
  onReview,
}: {
  deliverableId: string;
  readOnly?: boolean;
  onReview?: (review: { id: string; fingerprint: string }) => void;
}) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    local_time: "",
    timezone: "Asia/Kolkata",
    caption: "",
    media_type: "IMAGE",
    fold: "",
  });
  const query = useQuery({
    queryKey: ["publishing", "detail", deliverableId, user?.id],
    queryFn: () => request<Details>(`/api/v1/publishing/deliverables/${deliverableId}`),
    refetchInterval: editing ? false : 30000,
  });
  const history = useQuery({
    queryKey: ["publishing", "history", deliverableId, user?.id],
    queryFn: () =>
      request<{ action: string; at: string; details: { error_code?: string } }[]>(
        `/api/v1/publishing/deliverables/${deliverableId}/history`,
      ),
    enabled: showHistory,
  });
  const data = query.data;
  const job = data?.job;
  useEffect(() => {
    if (job && onReview) onReview({ id: deliverableId, fingerprint: job.review_fingerprint });
  }, [job, deliverableId, onReview]);
  function edit() {
    const zone = job?.timezone || data?.timezone || "Asia/Kolkata";
    setForm({
      local_time: job?.scheduled_at ? localValue(job.scheduled_at, zone) : "",
      timezone: zone,
      caption: job?.caption || "",
      media_type: job?.media_type || (data?.file_type.startsWith("video/") ? "REELS" : "IMAGE"),
      fold: "",
    });
    setEditing(true);
  }
  async function perform(action: string) {
    const prompts: Record<string, { title: string; description: string; confirmText: string }> = {
      cancel: {
        title: "Cancel auto-post?",
        description:
          "This stops automatic posting for this version. The approved deliverable stays in Creo and you can re-arm it from the calendar slot.",
        confirmText: "Cancel auto-post",
      },
      pause: {
        title: "Pause publication?",
        description: "The approved deliverable remains available in Creo.",
        confirmText: "Continue",
      },
      publish_now: {
        title: "Post to Instagram now?",
        description:
          "This posts the approved version immediately instead of waiting for its calendar slot. It cannot be undone from Creo.",
        confirmText: "Post now",
      },
    };
    const ask = prompts[action];
    if (ask && !(await confirm(ask))) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "save" || action === "save_calendar") {
        // Without local_time the backend takes the time from this deliverable's content
        // calendar slot, so the team never retypes a date that already exists.
        const body =
          action === "save_calendar"
            ? { caption: form.caption, media_type: form.media_type }
            : { ...form, fold: form.fold === "" ? null : Number(form.fold) };
        await request(`/api/v1/deliverables/${deliverableId}/schedule`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        setEditing(false);
        setMessage(
          action === "save_calendar"
            ? "Auto-post armed for the content calendar slot."
            : "Custom publishing time saved. Only client-approved media and caption can enter the queue.",
        );
      } else if (action === "use_calendar") {
        await request(`/api/v1/publishing/deliverables/${deliverableId}/action`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        setMessage("Schedule re-synced with the content calendar slot.");
      } else if (action === "publish_now") {
        await request(`/api/v1/publishing/deliverables/${deliverableId}/action`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        setMessage("Posting now. The status updates once Instagram confirms.");
      } else if (action === "approve") {
        await request(`/api/v1/publishing/deliverables/${deliverableId}/approve`, {
          method: "POST",
          body: JSON.stringify({ fingerprint: job?.review_fingerprint }),
        });
        setMessage("Publishing details approved. Content will wait for its future schedule.");
      } else {
        await request(`/api/v1/publishing/deliverables/${deliverableId}/action`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        setMessage(
          action === "reconcile"
            ? "Reconciliation queued. No duplicate publication will be submitted."
            : "Publishing status updated.",
        );
      }
      await cache.invalidateQueries({ queryKey: ["publishing"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Publishing request failed.");
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending)
    return (
      <output className="flex items-center gap-2 rounded-2xl border border-[#2A3446] bg-[#0B111C]/50 p-4 text-xs text-[#97A0B3]">
        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> Loading Instagram
        publishing…
      </output>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
      >
        <span className="min-w-0 break-words">{query.error.message}</span>
        <button
          type="button"
          className={`${button} flex-none basis-auto`}
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  const manage = !readOnly && data?.can_manage;
  const isClient = user?.role === "client";
  const admin = ["admin", "super_admin"].includes(user?.role || "");
  const frozen = job && ["processing", "uncertain", "published"].includes(job.status);
  const connected = data?.connection_status === "connected";
  const statusKey = job
    ? job.status
    : data?.approval_status === "approved"
      ? "needs_schedule"
      : "pending_approval";
  const statusText = job
    ? publishingLabel(job.status)
    : data?.approval_status === "approved"
      ? "Awaiting schedule"
      : "Awaiting client approval";
  const showApprove =
    !readOnly && data?.can_approve && job && !job.approved && !frozen && job.status !== "canceled";
  const lead = admin || user?.role === "team_lead";
  const calendarAt = data?.calendar_publish_at || job?.calendar_publish_at || null;
  const zone = job?.timezone || data?.timezone || "Asia/Kolkata";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  // The job follows its calendar slot unless the team saved a different time.
  const offCalendar = Boolean(
    job?.scheduled_at &&
      calendarAt &&
      Math.abs(new Date(job.scheduled_at).getTime() - new Date(calendarAt).getTime()) > 60_000,
  );
  const canPostNow =
    manage && lead && job?.approved && connected && !frozen && job.status !== "canceled";
  const hasStaffActions =
    manage &&
    (!frozen ||
      (job && job.status !== "canceled") ||
      job?.status === "paused" ||
      (admin && ["scheduled", "failed", "uncertain"].includes(job?.status || "")));
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#2A3446] bg-[#0B111C]/60 p-4 text-white sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2A3446] bg-[#161F2D] text-[#7FA0D6]">
            <Instagram className="size-4" />
          </span>
          <h3 className="truncate text-sm font-bold">Instagram publishing</h3>
        </div>
        <StatusBadge status={statusKey} label={statusText} />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A3446] bg-[#161F2D]/70 px-3 py-2.5 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`size-2 shrink-0 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-500"}`}
          />
          <span className="truncate font-semibold text-white">
            {data?.account ? `@${data.account}` : "No Instagram account"}
          </span>
        </span>
        <span className="text-[#97A0B3] capitalize">
          {(data?.connection_status || "disconnected").replaceAll("_", " ")}
        </span>
      </div>

      <div className="rounded-xl border border-[#2A3446] bg-[#161F2D]/70 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={labelText}>Content calendar slot</span>
          {offCalendar && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Custom time
            </span>
          )}
        </div>
        <p className="mt-1.5 flex items-start gap-2 text-sm">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-[#7FA0D6]" />
          <span className="min-w-0 break-words">
            {calendarAt ? (
              <>
                {fmt(calendarAt)} <span className="text-[#97A0B3]">· {zone}</span>
              </>
            ) : (
              <span className="text-[#97A0B3]">
                No calendar slot yet. The team books one on the content calendar.
              </span>
            )}
          </span>
        </p>
        {offCalendar && job?.scheduled_at && (
          <p className="mt-1 pl-6 text-xs text-amber-300">
            Posting at {fmt(job.scheduled_at)} instead.
          </p>
        )}
        {!offCalendar && job?.scheduled_at && job.status === "scheduled" && (
          <p className="mt-1 pl-6 text-xs text-emerald-300">Auto-post armed for this slot.</p>
        )}
      </div>

      {job && (
        <div className="rounded-xl border border-[#2A3446] bg-[#0B111C] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className={labelText}>Caption for client approval</p>
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#97A0B3]">
              {job.media_type.toLowerCase()} · v{job.version}
            </p>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[#E2E8F0]">
            {job.caption || "No caption"}
          </p>
        </div>
      )}
      {job?.permalink && (
        <a
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#BCCCE6] underline-offset-2 hover:text-white hover:underline"
          href={job.permalink}
          target="_blank"
          rel="noreferrer"
        >
          View published content <ExternalLink className="size-3.5" />
        </a>
      )}
      {job?.last_error && (
        <p
          role="alert"
          className="flex items-start gap-2 break-words rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {job.last_error}
        </p>
      )}
      {message && (
        <output className="block break-words rounded-xl border border-[#2A3446] bg-[#161F2D] p-3 text-sm text-[#E2E8F0]">
          {message}
        </output>
      )}

      {showApprove && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonPrimary}
            disabled={busy}
            onClick={() => void perform("approve")}
          >
            <CheckCircle2 className="size-4" /> Approve version &amp; caption
          </button>
        </div>
      )}

      {isClient && (
        <div className="space-y-3 rounded-xl border border-[#2A3446] bg-[#161F2D]/60 p-3.5">
          <p className="text-[11px] leading-relaxed text-[#97A0B3]">
            Approval locks the caption and media. Approved content is dispatched automatically at
            its scheduled time.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/portal/account?tab=integrations"
              className={connected ? linkButton : buttonPrimary}
            >
              {connected ? <Instagram className="size-4" /> : <Link2 className="size-4" />}
              {connected ? "Manage Instagram" : "Connect Instagram"}
            </Link>
            <Link to="/portal/support" className={linkButton}>
              <LifeBuoy className="size-4" /> Scheduling support
            </Link>
          </div>
        </div>
      )}

      {hasStaffActions && (
        <div className="flex flex-wrap gap-2">
          {!frozen && !job && (
            <button
              type="button"
              className={buttonPrimary}
              disabled={busy || !calendarAt}
              title={calendarAt ? undefined : "Book a content calendar slot first"}
              onClick={() => void perform("save_calendar")}
            >
              <CalendarClock className="size-4" /> Arm auto-post from calendar
            </button>
          )}
          {canPostNow && (
            <button
              type="button"
              className={job?.status === "scheduled" ? button : buttonPrimary}
              disabled={busy}
              onClick={() => void perform("publish_now")}
            >
              <Send className="size-4" /> Post now
            </button>
          )}
          {!frozen && job && offCalendar && (
            <button
              type="button"
              className={button}
              disabled={busy || !calendarAt}
              onClick={() => void perform("use_calendar")}
            >
              <CalendarClock className="size-4" /> Use calendar time
            </button>
          )}
          {!frozen && job && ["canceled", "needs_schedule"].includes(job.status) && (
            <button
              type="button"
              className={buttonPrimary}
              disabled={busy || !calendarAt}
              title={calendarAt ? undefined : "Book a content calendar slot first"}
              onClick={() => void perform("use_calendar")}
            >
              <CalendarClock className="size-4" /> Re-arm from calendar
            </button>
          )}
          {!frozen && (
            <button type="button" className={button} disabled={busy} onClick={edit}>
              {job ? "Custom time" : "Set a custom time"}
            </button>
          )}
          {job?.status === "paused" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("resume")}
            >
              Resume schedule
            </button>
          )}
          {admin && job?.status === "scheduled" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("pause")}
            >
              Pause
            </button>
          )}
          {admin && job?.status === "failed" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("retry")}
            >
              Retry job
            </button>
          )}
          {admin && job?.status === "uncertain" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("reconcile")}
            >
              Check provider result
            </button>
          )}
          {job && !frozen && job.status !== "canceled" && (
            <button
              type="button"
              className={buttonDanger}
              disabled={busy}
              onClick={() => void perform("cancel")}
            >
              Cancel auto-post
            </button>
          )}
        </div>
      )}

      {editing && manage && (
        <form
          className="space-y-4 border-t border-[#2A3446] pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void perform("save");
          }}
        >
          <p className="text-xs text-[#97A0B3]">
            Only needed to post away from the content calendar slot
            {calendarAt ? ` (${fmt(calendarAt)})` : ""}. Changes to the caption or media require the
            client to approve publishing details again.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelText}>Local date and time</span>
              <input
                required
                type="datetime-local"
                className={`${input} [color-scheme:dark]`}
                value={form.local_time}
                onChange={(e) => setForm({ ...form, local_time: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={labelText}>Timezone (IANA)</span>
              <input
                required
                className={input}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Asia/Kolkata"
              />
            </label>
            <label className="block">
              <span className={labelText}>Format</span>
              <select
                className={input}
                value={form.media_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    media_type: e.target.value,
                    caption: e.target.value === "STORIES" ? "" : form.caption,
                  })
                }
              >
                <option value="IMAGE">Image / poster (JPEG)</option>
                <option value="REELS">Reel (MP4 / MOV)</option>
                <option value="STORIES">Story (Business account)</option>
              </select>
            </label>
            <label className="block">
              <span className={labelText}>Repeated daylight-saving time</span>
              <select
                className={input}
                value={form.fold}
                onChange={(e) => setForm({ ...form, fold: e.target.value })}
              >
                <option value="">Ask if ambiguous</option>
                <option value="0">First occurrence</option>
                <option value="1">Second occurrence</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className={labelText}>Caption</span>
            <textarea
              maxLength={2200}
              disabled={form.media_type === "STORIES"}
              className={input}
              rows={3}
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
            />
            <span className="mt-1 block text-right text-[10px] text-[#97A0B3]">
              {form.caption.length}/2200
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={buttonPrimary} disabled={busy} type="submit">
              {busy ? "Validating media and saving…" : "Save custom time"}
            </button>
            {calendarAt && (
              <button
                className={button}
                disabled={busy}
                type="button"
                onClick={() => void perform(job ? "use_calendar" : "save_calendar")}
              >
                Use calendar time
              </button>
            )}
            <button
              className={button}
              disabled={busy}
              type="button"
              onClick={() => setEditing(false)}
            >
              Close
            </button>
          </div>
        </form>
      )}

      {job && (
        <div className="border-t border-[#2A3446] pt-3">
          <button
            type="button"
            aria-expanded={showHistory}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-xs font-semibold text-[#97A0B3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6]"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="inline-flex items-center gap-2">
              <History className="size-3.5 text-[#7FA0D6]" /> Publishing history
            </span>
            <ChevronDown
              className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
            />
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5 text-xs text-[#BCCCE6]">
              {history.isPending && <li>Loading history…</li>}
              {history.isError && <li role="alert">{history.error.message}</li>}
              {history.data?.length === 0 && <li className="text-[#97A0B3]">No history yet.</li>}
              {history.data?.map((h, i) => (
                <li
                  key={`${h.at}-${i}`}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#161F2D] px-3 py-2"
                >
                  <span className="capitalize">
                    {h.action.replaceAll("_", " ")}
                    {h.details?.error_code ? ` · ${h.details.error_code}` : ""}
                  </span>
                  <span className="text-[#97A0B3]">{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function PublishingControl({ deliverableId }: { deliverableId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 space-y-2">
      <button
        type="button"
        aria-expanded={open}
        className="inline-flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#2A3446] bg-[#161F2D] px-3 text-[11px] font-bold text-[#BCCCE6] transition-colors hover:border-[#7FA0D6]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6]"
        onClick={() => setOpen(!open)}
      >
        <span className="inline-flex items-center gap-1.5">
          <Instagram className="size-3.5 text-[#7FA0D6]" />
          {open ? "Hide Instagram schedule" : "Instagram schedule & status"}
        </span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <PublishingPanel deliverableId={deliverableId} />}
    </div>
  );
}

const QUEUE_STATUSES = [
  "pending_approval",
  "needs_schedule",
  "scheduled",
  "processing",
  "published",
  "failed",
  "paused",
  "uncertain",
  "canceled",
];

export function PublishingQueue({
  readOnly = false,
  clientId,
}: { readOnly?: boolean; clientId?: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const clients = useQuery({
    queryKey: ["publishing", "filter-clients", user?.id],
    queryFn: () => request<{ client_id: string; company_name: string | null; full_name?: string | null; email: string }[]>("/api/v1/admin/clients"),
    enabled: !readOnly && !clientId,
  });
  const effectiveClientId = clientId || client;
  const connection = useQuery({
    queryKey: ["publishing", "client-connection", user?.id, clientId],
    queryFn: () =>
      request<{ status: string; username?: string; error?: string; publishing_enabled: boolean }>(
        `/api/v1/publishing/clients/${clientId}/connection`,
      ),
    enabled: !!clientId && ["admin", "super_admin"].includes(user?.role || ""),
    refetchInterval: 30000,
  });
  const query = useQuery({
    queryKey: ["publishing", "queue", user?.id, effectiveClientId, status, offset],
    queryFn: () =>
      request<PublishingJob[]>(
        `/api/v1/publishing/jobs?offset=${offset}${effectiveClientId ? `&client_id=${encodeURIComponent(effectiveClientId)}` : ""}${status ? `&status=${status}` : ""}`,
      ),
    refetchInterval: 30000,
  });
  const rows = query.data || [];
  const page = Math.floor(offset / 100) + 1;
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 text-white sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl border border-[#2A3446] bg-[#0B111C] text-[#7FA0D6]">
            <Instagram className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold leading-tight">Instagram publishing queue</h2>
            <p className="text-xs text-[#97A0B3]">
              Publishing times are separate from editorial dates. Only client-approved versions and
              captions can publish.
            </p>
          </div>
        </div>
        {connection.data && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[#2A3446] bg-[#0B111C] px-3 py-1 font-semibold">
              {connection.data.username ? `@${connection.data.username}` : "No linked account"} ·{" "}
              <span className="capitalize">{connection.data.status.replaceAll("_", " ")}</span>
            </span>
            <span
              className={`rounded-full border px-3 py-1 font-semibold ${
                connection.data.publishing_enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-500/30 bg-slate-500/10 text-slate-300"
              }`}
            >
              Auto-publishing {connection.data.publishing_enabled ? "on" : "off"}
            </span>
          </div>
        )}
      </header>
      {connection.data?.error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          {connection.data.error}
        </p>
      )}
      {connection.isError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          {connection.error.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelText}>Publishing status</span>
          <select
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
              setSelected("");
            }}
          >
            <option value="">All statuses</option>
            {QUEUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {publishingLabel(s)}
              </option>
            ))}
          </select>
        </label>
        {!readOnly && !clientId && (
          <label className="block">
            <span className={labelText}>Filter by client</span>
            <select
              className={input}
              value={client}
              disabled={clients.isPending || clients.isError}
              onChange={(e) => { setClient(e.target.value); setOffset(0); setSelected(""); }}
            >
              <option value="">{clients.isPending ? "Loading clients…" : "All clients"}</option>
              {(clients.data || []).map(c => <option key={c.client_id} value={c.client_id}>{c.company_name || c.full_name || c.email}</option>)}
            </select>
            {clients.isError && <p role="alert" className="mt-2 text-sm text-amber-200">Unable to load clients. <button type="button" onClick={() => void clients.refetch()} className="underline">Retry</button></p>}
          </label>
        )}
      </div>

      {query.isPending && (
        <output className="flex items-center gap-2 text-sm text-[#97A0B3]">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Loading publishing
          jobs…
        </output>
      )}
      {query.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          <span className="min-w-0 break-words">{query.error.message}</span>
          <button
            type="button"
            className={`${button} flex-none basis-auto`}
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </div>
      )}
      {!query.isPending && !query.isError && !rows.length && (
        <div className="rounded-xl border border-dashed border-[#2A3446] p-8 text-center">
          <CalendarClock className="mx-auto mb-2 size-6 text-[#97A0B3]" />
          <p className="text-sm font-semibold">No publishing jobs match</p>
          <p className="mt-1 text-xs text-[#97A0B3]">
            The team can plan publication from an uploaded deliverable.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map((j) => {
          const open = selected === j.id;
          return (
            <li key={j.id} className="rounded-xl border border-[#2A3446] bg-[#0B111C]/60">
              <button
                type="button"
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-3.5 text-left transition-colors hover:bg-[#161F2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6]"
                onClick={() => setSelected(open ? "" : j.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {j.client_name || "Client"} · {j.title || `Version ${j.version}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#97A0B3]">
                    {j.scheduled_at
                      ? `${new Date(j.scheduled_at).toLocaleString(undefined, { timeZone: j.timezone })} (${j.timezone})`
                      : "Awaiting future schedule"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <StatusBadge status={j.status} label={publishingLabel(j.status)} />
                  <ChevronDown
                    className={`size-4 text-[#97A0B3] transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {open && (
                <div className="px-3.5 pb-3.5">
                  <PublishingPanel deliverableId={j.deliverable_id} readOnly={readOnly} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#97A0B3]">Page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${button} flex-none basis-auto`}
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            Previous
          </button>
          <button
            type="button"
            className={`${button} flex-none basis-auto`}
            disabled={(query.data?.length || 0) < 100}
            onClick={() => setOffset(offset + 100)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
