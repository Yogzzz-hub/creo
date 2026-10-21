import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Instagram } from "../../ui/brand-icons";
import { request } from "../../lib/http";

type Post = { id: string; deliverable_id: string; title: string; scheduled_at: string | null; status: string; stage: string; caption: string; last_error?: string };
export function UpcomingAutoPosts() {
  const posts = useQuery({ queryKey: ["upcoming-auto-posts"], queryFn: () => request<Post[]>("/api/v1/publishing/jobs?offset=0"), refetchInterval: 15000 });
  const [editing, setEditing] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(post: Post) {
    if (!time || new Date(time).getTime() <= Date.now()) { setMessage("Choose a future date and time."); return; }
    setBusy(true); setMessage("");
    try {
      await request(`/api/v1/publishing/deliverables/${post.deliverable_id}/timing-request`, { method: "POST", body: JSON.stringify({ requested_at: new Date(time).toISOString(), reason }) });
      setMessage("Request sent. Auto posting is paused while your team reviews the new time."); setEditing(""); void posts.refetch();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to send request."); }
    finally { setBusy(false); }
  }
  const upcoming = (posts.data || []).filter(p => !["published", "canceled"].includes(p.status));
  return <section className="rounded-3xl border border-app-line bg-app-surface p-5 sm:p-6 space-y-4">
    <div className="flex items-center gap-3"><CalendarClock className="size-6 text-app-accent" /><div><h2 className="text-lg font-bold text-hi">Upcoming automatic posts</h2><p className="text-sm text-app-mist">Review scheduled Instagram content or request a different time.</p></div></div>
    {posts.isPending && <p role="status" className="text-app-mist">Loading upcoming posts…</p>}
    {posts.isError && <p role="alert" className="text-app-warm">{posts.error.message}<button onClick={() => void posts.refetch()} className="ml-2 underline">Retry</button></p>}
    {!posts.isPending && !posts.isError && !upcoming.length && <p className="text-sm text-app-mist">Your team’s planned posts will appear here for review.</p>}
    {message && <p role="status" className="text-sm text-app-accent-soft">{message}</p>}
    {upcoming.map(post => <article key={post.id} className="rounded-2xl border border-app-line bg-app-base p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-hi flex items-center gap-2"><Instagram className="size-4" />{post.title || "Instagram post"}</h3><p className="text-sm text-app-mist mt-1">{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "Time to be confirmed"}</p></div><span className="text-xs text-app-accent-soft capitalize">{post.stage === "ready" ? "Ready to publish" : post.status.replaceAll("_", " ")}</span></div><p className="text-sm text-app-mist whitespace-pre-wrap">{post.caption}</p>{post.last_error && <p className="text-sm text-app-warm">{post.last_error}</p>}{post.status !== "uncertain" && post.stage !== "submitting" && <button onClick={() => { setEditing(editing === post.id ? "" : post.id); setTime(""); setReason(""); }} className="rounded-xl border border-app-line px-4 py-2 text-sm text-app-accent-soft">Request another time</button>}{editing === post.id && <div className="space-y-3"><label className="block text-sm text-app-mist">Preferred time ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="block mt-1 w-full rounded-xl border border-app-line bg-app-surface p-3 text-hi" /></label><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} placeholder="Reason for changing the time (optional)" className="w-full rounded-xl border border-app-line bg-app-surface p-3 text-hi" /><button disabled={busy} onClick={() => void submit(post)} className="rounded-xl bg-app-accent-soft px-4 py-2 font-semibold text-app-base disabled:opacity-50">{busy ? "Sending…" : "Send timing request"}</button></div>}</article>)}
  </section>;
}
