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
  return <section className="rounded-3xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-6 space-y-4">
    <div className="flex items-center gap-3"><CalendarClock className="size-6 text-[#7FA0D6]" /><div><h2 className="text-lg font-bold text-white">Upcoming automatic posts</h2><p className="text-sm text-[#97A0B3]">Review scheduled Instagram content or request a different time.</p></div></div>
    {posts.isPending && <p role="status" className="text-[#97A0B3]">Loading upcoming posts…</p>}
    {posts.isError && <p role="alert" className="text-[#D8BF9B]">{posts.error.message}<button onClick={() => void posts.refetch()} className="ml-2 underline">Retry</button></p>}
    {!posts.isPending && !posts.isError && !upcoming.length && <p className="text-sm text-[#97A0B3]">Your team’s planned posts will appear here for review.</p>}
    {message && <p role="status" className="text-sm text-[#BCCCE6]">{message}</p>}
    {upcoming.map(post => <article key={post.id} className="rounded-2xl border border-[#2A3446] bg-[#0B111C] p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white flex items-center gap-2"><Instagram className="size-4" />{post.title || "Instagram post"}</h3><p className="text-sm text-[#97A0B3] mt-1">{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "Time to be confirmed"}</p></div><span className="text-xs text-[#BCCCE6] capitalize">{post.stage === "ready" ? "Ready to publish" : post.status.replaceAll("_", " ")}</span></div><p className="text-sm text-[#97A0B3] whitespace-pre-wrap">{post.caption}</p>{post.last_error && <p className="text-sm text-[#D8BF9B]">{post.last_error}</p>}{post.status !== "uncertain" && post.stage !== "submitting" && <button onClick={() => { setEditing(editing === post.id ? "" : post.id); setTime(""); setReason(""); }} className="rounded-xl border border-[#2A3446] px-4 py-2 text-sm text-[#BCCCE6]">Request another time</button>}{editing === post.id && <div className="space-y-3"><label className="block text-sm text-[#97A0B3]">Preferred time ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="block mt-1 w-full rounded-xl border border-[#2A3446] bg-[#161F2D] p-3 text-white" /></label><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} placeholder="Reason for changing the time (optional)" className="w-full rounded-xl border border-[#2A3446] bg-[#161F2D] p-3 text-white" /><button disabled={busy} onClick={() => void submit(post)} className="rounded-xl bg-[#BCCCE6] px-4 py-2 font-semibold text-[#0B111C] disabled:opacity-50">{busy ? "Sending…" : "Send timing request"}</button></div>}</article>)}
  </section>;
}
