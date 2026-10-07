import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { fetchPodDashboard, fetchClientRoster } from "../../lib/ops-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
export function SlackChatPage() {
  const { user } = useAuth();
  const [channel, setChannel] = useState("general");
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pod = useQuery({
    queryKey: ["pod_dashboard", user?.id],
    queryFn: () => fetchPodDashboard(),
    enabled: !!user,
  });
  const isAdmin = ["admin", "super_admin"].includes(user?.role || "");
  const roster = useQuery({
    queryKey: ["chat_clients", user?.id],
    queryFn: () => fetchClientRoster(),
    enabled: !!user && isAdmin,
  });
  const clients = isAdmin
    ? (roster.data || []).map((c) => ({
        id: c.client_id,
        name: c.company_name || c.email.split("@")[0] || c.email,
      }))
    : pod.data?.clients || [];
  const messages = useQuery({
    queryKey: ["chat_messages", user?.id, channel, recipient],
    queryFn: () =>
      request<any[]>(
        `/api/v1/chat/messages?${recipient ? `other_user_id=${encodeURIComponent(recipient)}` : `channel=${encodeURIComponent(channel)}`}`,
      ),
    enabled: !!user,
    refetchInterval: 5000,
  });
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/v1/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          message: text.trim(),
          ...(recipient
            ? { recipient_id: recipient }
            : {
                channel,
                client_id: clients.find(
                  (c) => `client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` === channel,
                )?.id,
              }),
        }),
      });
      setText("");
      await messages.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#0B111C] text-white">
      <AdminTopHeader title="Messages" />
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold">Messages</h1>
        <label>
          Channel
          <select
            aria-label="Channel"
            className="block w-full p-3 bg-[#161F2D] rounded-xl"
            value={recipient ? "" : channel}
            onChange={(e) => {
              setRecipient("");
              setChannel(e.target.value);
            }}
          >
            <option value="" disabled>
              Direct message
            </option>
            {["general", "deliverables-handoff", "urgent-escalations"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {clients.map((c) => (
              <option
                key={c.id}
                value={`client-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direct message
          <select
            aria-label="Recipient"
            className="block w-full p-3 bg-[#161F2D] rounded-xl"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="">Select team member</option>
            {pod.data?.members
              .filter((m) => m.id !== user?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.name || m.email}
                </option>
              ))}
          </select>
        </label>
        {messages.isPending && <p role="status">Loading messages?</p>}
        {messages.isError && (
          <p role="alert">
            {messages.error.message} <button onClick={() => void messages.refetch()}>Retry</button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {messages.isSuccess && messages.data.length === 0 && <p>No messages yet.</p>}
        {messages.data?.map((m) => (
          <article key={m.id} className="p-4 bg-[#161F2D] rounded-xl">
            <h2 className="font-bold">{m.sender_name || "Sender unavailable"}</h2>
            {m.created_at && <time>{new Date(m.created_at).toLocaleString()}</time>}
            <p className="whitespace-pre-wrap">{m.message}</p>
          </article>
        ))}
        <form onSubmit={send} className="space-y-3">
          <textarea
            aria-label="Message"
            className="w-full p-3 bg-[#161F2D] rounded-xl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button disabled={busy || !text.trim()} className="bg-blue-600 px-5 py-2 rounded-xl">
            {busy ? "Sending?" : "Send message"}
          </button>
        </form>
      </main>
    </div>
  );
}
