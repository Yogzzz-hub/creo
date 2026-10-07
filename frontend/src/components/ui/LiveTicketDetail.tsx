import { resolveAssetUrl } from "../../lib/media";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  assignee?: { full_name: string; email: string; role: string };
  deliverable_file_url?: string;
  deliverable_title?: string;
  messages: {
    id: string;
    sender_name: string;
    sender_email: string;
    sender_role: string;
    message: string;
    created_at: string;
  }[];
}
export function LiveTicketDetail({ portal = false }: { portal?: boolean }) {
  const { id, ticketId } = useParams();
  const activeId = id || ticketId;
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["ticket", user?.id, activeId],
    queryFn: () => request<Ticket>(`/api/v1/tickets/${activeId}`),
    enabled: !!activeId && !!user?.id,
    refetchInterval: 10_000,
  });
  async function save(path: string, body: object, method = "POST") {
    setBusy(true);
    setError("");
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setReply("");
      await query.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const ticket = query.data;
  return (
    <main className="min-h-screen bg-[#0B111C] text-white p-4 sm:p-8 space-y-5 max-w-5xl mx-auto">
      <Link className="underline" to={portal ? "/portal/support" : "/admin/support"}>
        Back to support
      </Link>
      {!activeId && <p role="alert">No ticket selected.</p>}
      {query.isPending && activeId && <p role="status">Loading ticket…</p>}
      {query.isError && (
        <p role="alert">
          {query.error.message}{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {ticket && (
        <>
          <section className="p-5 rounded-xl bg-[#161F2D] space-y-3">
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p>
              {ticket.status} · {ticket.priority}
            </p>
            <p>{new Date(ticket.created_at).toLocaleString()}</p>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
            <p>
              Assigned to: {ticket.assignee?.full_name || ticket.assignee?.email || "Unassigned"}
            </p>
            {ticket.deliverable_file_url && (
              <a
                className="underline"
                href={resolveAssetUrl(ticket.deliverable_file_url)}
                target="_blank"
                rel="noreferrer"
              >
                {ticket.deliverable_title || "Open deliverable"}
              </a>
            )}
            {!portal && ticket.title !== "Client Pod Thread" && (
              <select
                aria-label="Ticket status"
                disabled={busy}
                value={ticket.status.toLowerCase()}
                onChange={(e) =>
                  void save(
                    `/api/v1/tickets/${ticket.id}/status`,
                    { status: e.target.value },
                    "PATCH",
                  )
                }
                className="block bg-[#0B111C] p-2 rounded"
              >
                {["open", "resolved", "closed"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </section>
          <section className="space-y-3" aria-label="Conversation">
            {ticket.messages.length === 0 && <p>No replies yet.</p>}
            {ticket.messages.map((m) => (
              <article key={m.id} className="bg-[#161F2D] rounded-xl p-4">
                <p className="font-bold">
                  {m.sender_name || m.sender_email || "Sender unavailable"}
                  {m.sender_role && ` · ${m.sender_role.replaceAll("_", " ")}`}
                </p>
                <time>{new Date(m.created_at).toLocaleString()}</time>
                <p className="whitespace-pre-wrap mt-2">{m.message}</p>
              </article>
            ))}
          </section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim())
                void save(`/api/v1/tickets/${ticket.id}/messages`, { message: reply.trim() });
            }}
            className="space-y-3"
          >
            <textarea
              aria-label="Reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#161F2D]"
              required
            />
            <button disabled={busy || !reply.trim()} className="bg-blue-600 px-5 py-2 rounded-xl">
              {busy ? "Sending…" : "Send reply"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
