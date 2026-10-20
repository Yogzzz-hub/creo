import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Instagram } from "../../ui/brand-icons";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";
import { CreoInlineLoader } from "../ui/CreoLoader";

type Client = { id: string; name: string; username: string; account_id: string };
type Attempt = { id: string; client_id?: string; status: string; permalink?: string; error?: string; scheduled_at?: string; client_name?: string };

export function InstagramTestPost() {
  const confirm = useConfirm();
  const [caption, setCaption] = useState("Creo test post ? checking the Instagram publishing connection.");
  const [mode, setMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const queue = useQuery({ queryKey: ["instagram-test-queue"], queryFn: () => request<Attempt[]>("/api/v1/publishing/test-post/queue"), refetchInterval: 5000 });
  const [clientId, setClientId] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [sending, setSending] = useState(false);
  const [canceling, setCanceling] = useState("");
  const [error, setError] = useState("");
  const clients = useQuery({ queryKey: ["instagram-test-clients"], queryFn: () => request<{ clients: Client[]; enabled: boolean }>("/api/v1/publishing/test-post/clients") });
  const status = useQuery({
    queryKey: ["instagram-test-post", clientId, attempt?.id],
    queryFn: () => request<Attempt>(`/api/v1/publishing/clients/${clientId}/test-post/${attempt!.id}`),
    enabled: !!attempt,
    refetchInterval: query => ["published", "failed", "uncertain", "canceled"].includes(query.state.data?.status || "") ? false : 2500,
  });
  const current = status.data || attempt;
  const busy = sending || !!current && ["queued", "processing", "submitting"].includes(current.status);
  const selected = clients.data?.clients.find(client => client.id === clientId);

  async function cancelTest(item: Attempt) {
    if (!await confirm({ title: "Cancel queued test?", description: "This stops the test before Instagram processing starts.", confirmText: "Cancel test", tone: "danger" })) return;
    setCanceling(item.id); setError("");
    try {
      await request(`/api/v1/publishing/clients/${item.client_id}/test-post/${item.id}/cancel`, { method: "POST" });
      await queue.refetch();
      if (current?.id === item.id) setAttempt(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to cancel test."); }
    finally { setCanceling(""); }
  }

  async function publish() {
    if (!selected || busy) return;
    if (mode === "queue" && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) { setError("Choose a future date and time."); return; }
    if (!await confirm({ title: mode === "queue" ? "Queue Instagram test?" : "Publish test to Instagram?", description: `This publishes the sample to @${selected.username}${mode === "queue" ? ` at ${new Date(scheduledAt).toLocaleString()}` : ""}.`, confirmText: mode === "queue" ? "Queue test post" : "Publish test post", tone: "info" })) return;
    setSending(true); setError("");
    // Reuse the request ID after a network failure: never silently post twice.
    const id = current?.id || crypto.randomUUID();
    try {
      setAttempt(await request<Attempt>(`/api/v1/publishing/clients/${selected.id}/test-post`, { method: "POST", body: JSON.stringify({ request_id: id, account_id: selected.account_id, caption, scheduled_at: mode === "queue" ? new Date(scheduledAt).toISOString() : null }) }));
      void queue.refetch();
    } catch (err) {
      setAttempt({ id, status: "checking" });
      setError(err instanceof Error ? err.message : "Unable to start the test.");
    } finally { setSending(false); }
  }

  return <section className="rounded-3xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-7">
    <div className="flex items-center gap-3 mb-6"><div className="rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-3"><Instagram className="size-6 text-white" /></div><div><h1 className="text-xl font-bold">Instagram test publish</h1><p className="text-sm text-[#97A0B3]">Select a connected client and publish this sample to their Instagram feed.</p></div></div>
    {clients.isPending ? <CreoInlineLoader label="Loading connected clients" /> : clients.isError ? <div role="alert" className="text-[#D8BF9B]">{clients.error.message}<button onClick={() => void clients.refetch()} className="ml-3 underline">Retry</button></div> : <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
      <img src="/assets/portfolio/botanical_serum.jpg" alt="Sample product photo that will be published" className="aspect-square w-full max-w-[220px] rounded-2xl object-cover border border-[#2A3446]" />
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Client Instagram account<select value={clientId} disabled={busy} onChange={event => { setClientId(event.target.value); setAttempt(null); setError(""); }} className="mt-2 block w-full rounded-xl border border-[#2A3446] bg-[#0B111C] p-3 disabled:opacity-60"><option value="">Choose a client</option>{clients.data?.clients.map(client => <option key={client.id} value={client.id}>{client.name} — @{client.username}</option>)}</select></label>
        {!clients.data?.clients.length && <p className="text-sm text-[#97A0B3]">No connected clients are available. Connect a client’s Instagram account and assign them to your pod first.</p>}
        <label className="block text-sm font-semibold">Test mode<select value={mode} disabled={busy} onChange={event => setMode(event.target.value)} className="mt-2 block w-full rounded-xl border border-[#2A3446] bg-[#0B111C] p-3"><option value="now">Publish now</option><option value="queue">Queue for later</option></select></label>
        {mode === "queue" && <label className="block text-sm font-semibold">Publish date and time<input type="datetime-local" value={scheduledAt} disabled={busy} onChange={event => setScheduledAt(event.target.value)} className="mt-2 block w-full rounded-xl border border-[#2A3446] bg-[#0B111C] p-3" /><span className="text-xs text-[#97A0B3]">Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></label>}
        <label className="block text-sm font-semibold">Caption<textarea value={caption} onChange={event => setCaption(event.target.value)} disabled={busy} maxLength={2200} rows={4} className="mt-2 block w-full resize-y rounded-xl border border-[#2A3446] bg-[#0B111C] p-4 text-white disabled:opacity-60" /><span className="mt-1 block text-right text-xs text-[#97A0B3]">{caption.length}/2,200</span></label>
        {!clients.data?.enabled && <p className="text-[#D8BF9B] text-sm">Test publishing is disabled in this environment.</p>}
        {current?.status === "published" ? <div role="status" className="flex items-center gap-2 text-[#BCCCE6]"><CheckCircle2 className="size-5" />Test post published! {current.permalink && <a href={current.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">View on Instagram<ExternalLink className="size-4" /></a>}</div> : <button type="button" onClick={() => void publish()} disabled={!selected || !clients.data?.enabled || busy || current?.status === "uncertain" || current?.status === "failed"} className="w-full rounded-xl bg-[#BCCCE6] px-5 py-3 font-bold text-[#0B111C] disabled:opacity-50 flex items-center justify-center gap-2"><Instagram className={`size-5 ${busy ? "animate-pulse" : ""}`} />{busy && current?.status === "queued" && current.scheduled_at ? "Test queued" : busy ? "Publishing test post…" : "Publish test post"}</button>}
        {(error || current?.error || status.isError) && <p role="alert" className="text-sm text-[#D8BF9B]">{current?.error || error || status.error?.message}</p>}
        {current?.status === "uncertain" && <p className="text-sm text-[#D8BF9B]">Check Instagram before starting another test; this submission may have succeeded.</p>}
        {current && ["published", "failed", "canceled"].includes(current.status) && <button type="button" onClick={() => { setAttempt(null); setError(""); }} className="text-sm text-[#BCCCE6] underline">Start another test</button>}
      </div>
    </div>}
    <div className="mt-6 border-t border-[#2A3446] pt-5 space-y-3"><h2 className="font-bold">Test publishing queue</h2>{queue.isError && <p role="alert" className="text-[#D8BF9B]">{queue.error.message}</p>}{!queue.isPending && !queue.data?.length && <p className="text-sm text-[#97A0B3]">Your queued tests will appear here.</p>}{queue.data?.map(item => <div key={item.id} className="rounded-xl border border-[#2A3446] p-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{item.client_name || "Client"}</p><p className="text-sm text-[#97A0B3]">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : "Immediate test"}</p>{item.error && <p className="text-sm text-[#D8BF9B]">{item.error}</p>}</div><span className="capitalize text-sm">{item.status}</span>{item.status === "queued" && <button type="button" disabled={!!canceling} onClick={() => void cancelTest(item)} className="min-h-10 rounded-lg border border-rose-500/30 px-3 text-sm text-rose-300 disabled:opacity-50">{canceling === item.id ? "Canceling..." : "Cancel test"}</button>}{item.permalink && <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-sm underline">View post</a>}</div>)}</div>
  </section>;
}
