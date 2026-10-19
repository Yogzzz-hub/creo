import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { History, Instagram, LifeBuoy } from "lucide-react";
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
  review_fingerprint: string;
  approved: boolean;
  version: number;
  attempts: number;
}
interface Details {
  job: PublishingJob | null;
  timezone: string;
  approval_status: string;
  file_type: string;
  can_manage: boolean;
  can_approve: boolean;
  connection_status: string;
  account?: string;
}
const input =
  "w-full min-h-11 rounded-xl border border-app-line bg-app-base p-3 text-sm text-hi";
const button =
  "min-h-11 rounded-xl border border-app-line px-3 py-2 text-sm text-hi hover:bg-app-line disabled:opacity-50";
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
    if (
      ["cancel", "pause"].includes(action) &&
      !(await confirm({
        title: `${action === "cancel" ? "Cancel" : "Pause"} publication?`,
        description: "The approved deliverable remains available in Creo.",
        confirmText: "Continue",
      }))
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "save") {
        await request(`/api/v1/deliverables/${deliverableId}/schedule`, {
          method: "POST",
          body: JSON.stringify({ ...form, fold: form.fold === "" ? null : Number(form.fold) }),
        });
        setEditing(false);
        setMessage(
          "Publishing plan saved. Only client-approved media and caption can enter the queue.",
        );
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
    return <output className="text-xs text-app-mist">Loading Instagram publishing…</output>;
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-amber-300">
        {query.error.message}{" "}
        <button type="button" className={button} onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  const manage = !readOnly && data?.can_manage;
  const admin = ["admin", "super_admin"].includes(user?.role || "");
  const frozen = job && ["processing", "uncertain", "published"].includes(job.status);
  return (
    <section className="border border-app-line rounded-2xl p-4 space-y-3 bg-app-base/50 text-hi min-w-0">
      <h3 className="font-semibold text-sm">Instagram publishing</h3>
      <p className="text-sm">
        {job
          ? publishingLabel(job.status)
          : data?.approval_status === "approved"
            ? "Approved — awaiting schedule"
            : "Content requires client approval"}
      </p>
      <p className="text-xs text-app-mist">
        Account: {data?.account ? `@${data.account}` : "Not connected"} ·{" "}
        {data?.connection_status.replaceAll("_", " ")}
      </p>
      {job?.scheduled_at && (
        <p className="text-sm break-words">
          {new Date(job.scheduled_at).toLocaleString(undefined, {
            timeZone: job.timezone,
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          ({job.timezone}) · {job.media_type.toLowerCase()} · v{job.version}
        </p>
      )}
      {job && (
        <div className="text-sm">
          <p className="text-xs text-app-mist">Caption for client approval</p>
          <p className="whitespace-pre-wrap break-words">{job.caption || "No caption"}</p>
        </div>
      )}
      {job?.permalink && (
        <a className="underline text-sm" href={job.permalink} target="_blank" rel="noreferrer">
          View published content
        </a>
      )}
      {job?.last_error && (
        <p role="alert" className="text-sm text-amber-300 break-words">
          {job.last_error}
        </p>
      )}
      {message && <output className="text-sm break-words">{message}</output>}
      {!readOnly &&
        data?.can_approve &&
        job &&
        !job.approved &&
        !frozen &&
        job.status !== "canceled" && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void perform("approve")}
          >
            Approve this version and caption for publishing
          </button>
        )}
      {user?.role === "client" && (
        <div className="p-3.5 rounded-xl bg-app-base/60 border border-app-line space-y-2.5 mt-2">
          <p className="text-[11px] text-app-mist leading-relaxed">
            Approval locks the caption and media. Content will automatically dispatch at its scheduled time.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
            <Link
              to="/portal/support"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-app-surface hover:bg-app-line-soft border border-app-line hover:border-app-accent/40 text-xs font-semibold text-app-accent-soft hover:text-hi transition-all shadow-xs text-center cursor-pointer"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-app-accent" />
              <span>Schedule Support</span>
            </Link>
            <Link
              to="/portal/account/instagram"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-app-surface hover:bg-app-line-soft border border-app-line hover:border-app-accent/40 text-xs font-semibold text-app-accent-soft hover:text-hi transition-all shadow-xs text-center cursor-pointer"
            >
              <Instagram className="w-3.5 h-3.5 text-app-accent" />
              <span>Manage Instagram</span>
            </Link>
          </div>
        </div>
      )}
      {manage && (
        <div className="flex flex-wrap gap-2">
          {!frozen && (
            <button type="button" className={button} disabled={busy} onClick={edit}>
              {job ? "Edit schedule" : "Plan publication"}
            </button>
          )}
          {job && !frozen && job.status !== "canceled" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("cancel")}
            >
              Cancel
            </button>
          )}
          {job?.status === "paused" && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void perform("resume")}
            >
              Resume future schedule
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
              Retry eligible job
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
        </div>
      )}
      {editing && manage && (
        <form
          className="space-y-3 border-t border-app-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void perform("save");
          }}
        >
          <p className="text-xs text-app-mist">
            Plan ahead of approval. Changes to the caption or media require the client to approve
            publishing details again.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Local date and time
              <input
                required
                type="datetime-local"
                className={input}
                value={form.local_time}
                onChange={(e) => setForm({ ...form, local_time: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Timezone (IANA)
              <input
                required
                className={input}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Asia/Kolkata"
              />
            </label>
          </div>
          <label className="block text-sm">
            Repeated daylight-saving time
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
          <label className="block text-sm">
            Format
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
          <label className="block text-sm">
            Caption
            <textarea
              maxLength={2200}
              disabled={form.media_type === "STORIES"}
              className={input}
              rows={3}
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={button} disabled={busy} type="submit">
              {busy ? "Validating media and saving…" : "Save publishing plan"}
            </button>
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
        <>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-app-base hover:bg-app-surface border border-app-line hover:border-app-accent/30 text-xs font-semibold text-app-mist hover:text-hi transition-all cursor-pointer shadow-xs mt-1"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-3.5 h-3.5 text-app-accent" />
            <span>{showHistory ? "Hide publishing history" : "View publishing history"}</span>
          </button>
          {showHistory && (
            <div className="text-xs space-y-2">
              {history.isPending && <p>Loading history…</p>}
              {history.isError && <p role="alert">{history.error.message}</p>}
              {history.data?.map((h, i) => (
                <p key={`${h.at}-${i}`}>
                  {new Date(h.at).toLocaleString()} · {h.action.replaceAll("_", " ")}
                  {h.details?.error_code ? ` · ${h.details.error_code}` : ""}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function PublishingControl({ deliverableId }: { deliverableId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        className="min-h-11 text-xs text-app-accent-soft underline"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide" : "Instagram schedule & status"}
      </button>
      {open && <PublishingPanel deliverableId={deliverableId} />}
    </div>
  );
}

export function PublishingQueue({
  readOnly = false,
  clientId,
}: { readOnly?: boolean; clientId?: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
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
    queryKey: ["publishing", "queue", user?.id, clientId, status, offset],
    queryFn: () =>
      request<PublishingJob[]>(
        `/api/v1/publishing/jobs?offset=${offset}${clientId ? `&client_id=${clientId}` : ""}${status ? `&status=${status}` : ""}`,
      ),
    refetchInterval: 30000,
  });
  const rows = (query.data || []).filter(
    (j) => !client || (j.client_name || j.client_id).toLowerCase().includes(client.toLowerCase()),
  );
  return (
    <section className="rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5 space-y-3 text-hi min-w-0">
      <h2 className="font-bold">Instagram publishing queue</h2>
      {connection.data && (
        <p className="text-sm">
          Instagram:{" "}
          {connection.data.username ? `@${connection.data.username}` : "No linked account"} ·{" "}
          {connection.data.status.replaceAll("_", " ")}.{" "}
          {connection.data.publishing_enabled
            ? "Automatic publishing enabled."
            : "Automatic publishing disabled."}{" "}
          {connection.data.error}
        </p>
      )}
      {connection.isError && (
        <p role="alert" className="text-sm">
          {connection.error.message}
        </p>
      )}
      <p className="text-xs text-app-mist">
        Publishing times are separate from editorial dates. Only client-approved versions and
        captions can publish.
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="text-xs flex-1 min-w-40">
          Publishing status
          <select
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            {[
              "pending_approval",
              "needs_schedule",
              "scheduled",
              "processing",
              "published",
              "failed",
              "paused",
              "uncertain",
              "canceled",
            ].map((s) => (
              <option key={s} value={s}>
                {publishingLabel(s)}
              </option>
            ))}
          </select>
        </label>
        {!readOnly && !clientId && (
          <label className="text-xs flex-1 min-w-40">
            Filter clients on this page
            <input
              className={input}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
            />
          </label>
        )}
      </div>
      {query.isPending && <output className="text-sm">Loading publishing jobs…</output>}
      {query.isError && (
        <p role="alert">
          {query.error.message}{" "}
          <button type="button" className={button} onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {!query.isPending && !query.isError && !rows.length && (
        <p className="text-sm text-app-mist">
          No publishing jobs match. The team can plan publication from an uploaded deliverable.
        </p>
      )}
      {rows.map((j) => (
        <div key={j.id} className="border-t border-app-line pt-3 space-y-2">
          <button
            type="button"
            className="text-left min-h-11 w-full text-sm"
            onClick={() => setSelected(selected === j.id ? "" : j.id)}
          >
            <span className="font-semibold">
              {j.client_name || "Client"} · {j.title || `Version ${j.version}`} ·{" "}
              {publishingLabel(j.status)}
            </span>
            <br />
            <span className="text-xs text-app-mist">
              {j.scheduled_at
                ? `${new Date(j.scheduled_at).toLocaleString(undefined, { timeZone: j.timezone })} (${j.timezone})`
                : "Awaiting future schedule"}
            </span>
          </button>
          {selected === j.id && (
            <PublishingPanel deliverableId={j.deliverable_id} readOnly={readOnly} />
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          className={button}
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 100))}
        >
          Previous
        </button>
        <button
          type="button"
          className={button}
          disabled={(query.data?.length || 0) < 100}
          onClick={() => setOffset(offset + 100)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
