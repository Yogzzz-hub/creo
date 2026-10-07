import { resolveAssetUrl } from "../../lib/media";
import { useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import {
  fetchClientRoster,
  fetchClientBrandProfile,
  fetchKanbanTasks,
  fetchAdminDeliverables,
  fetchRevenueTrend,
  fetchAdminKPIs,
} from "../../lib/ops-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { FixPlanModal } from "../../components/admin/FixPlanModal";
import type { ClientRosterItem } from "../../types/ops";

const panel = "p-5 rounded-xl bg-[#161F2D] border border-[#2A3446] space-y-3";
const input = "p-3 rounded-lg bg-[#0B111C] border border-[#2A3446] w-full";
export function LiveAdminFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white">
      <AdminTopHeader title={title} />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
export function DataState({
  query,
}: {
  query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
}) {
  return (
    <>
      {query.isPending && <p role="status">Loading data…</p>}
      {query.isError && (
        <p role="alert">
          {query.error?.message || "Data unavailable"}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </>
  );
}

export function LiveAdminClientsPage() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const { clientId } = useParams();
  const [params] = useSearchParams();
  const selectedId = clientId || params.get("clientId") || params.get("client");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<ClientRosterItem | null>(null);
  const query = useQuery({
    queryKey: ["admin_clients", user?.id],
    queryFn: () => fetchClientRoster(),
    enabled: !!user,
  });
  const profile = useQuery({
    queryKey: ["client_profile", user?.id, selectedId],
    queryFn: () => fetchClientBrandProfile(selectedId!),
    enabled: !!selectedId && !!user,
  });
  const clients = (query.data || []).filter((c) =>
    `${c.company_name || ""} ${c.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const p = profile.data;
  return (
    <LiveAdminFrame title="Clients">
      <DataState query={query} />
      {selectedId && <DataState query={profile} />}
      {p && (
        <section className={panel}>
          <Link className="underline" to="/admin/clients">
            All clients
          </Link>
          <h2 className="text-lg font-bold">{p.company_name || p.full_name || p.email}</h2>
          <p>
            {p.email} · {p.account_status}
          </p>
          <p>
            {p.subscription?.plan_display_name || "No subscription"} ·{" "}
            {p.subscription?.status || "No active plan"}
          </p>
          <p>{p.brand_summary || "Brand brief not provided."}</p>
          <h3 className="font-bold">Assigned team</h3>
          {p.assigned_team.length === 0 && <p>No team assigned.</p>}
          {p.assigned_team.map((m) => (
            <p key={m.id}>
              {m.name || m.email} · {m.role_label}
            </p>
          ))}
          <h3 className="font-bold">Brand DNA</h3>
          <pre className="whitespace-pre-wrap break-words text-sm">
            {Object.keys(p.brand_dna || {}).length
              ? JSON.stringify(p.brand_dna, null, 2)
              : "Not provided."}
          </pre>
          <h3 className="font-bold">Subscription quotas</h3>
          {p.quota_usage.map((q) => (
            <p key={q.kind}>
              {q.kind}: {q.used} / {q.quota}
            </p>
          ))}
        </section>
      )}
      <input
        aria-label="Search clients"
        placeholder="Search clients"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={input}
      />
      {query.isSuccess && clients.length === 0 && <p>No clients found.</p>}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((c) => (
          <article key={c.client_id} className={panel}>
            <Link className="font-bold underline" to={`/admin/clients/${c.client_id}`}>
              {c.company_name || c.email}
            </Link>
            <p>{c.email}</p>
            <p>
              {c.account_status} · {c.subscription_status || "No subscription"}
            </p>
            <p>{c.plan_display_name || c.plan_name || "No plan assigned"}</p>
            <p>
              Monthly price:{" "}
              {c.monthly_price == null
                ? "Unavailable"
                : `₹${c.monthly_price.toLocaleString("en-IN")}`}
            </p>
            {c.quota_usage.map((q) => (
              <p key={q.kind}>
                {q.kind.replaceAll("_", " ")}: {q.used} / {q.quota}
              </p>
            ))}
            <button className="underline" onClick={() => setEdit(c)}>
              Change plan or custom price
            </button>
          </article>
        ))}
      </section>
      <FixPlanModal
        isOpen={!!edit}
        client={edit}
        onClose={() => setEdit(null)}
        onSuccess={() => {
          setEdit(null);
          void cache.invalidateQueries({ queryKey: ["admin_clients"] });
          void profile.refetch();
        }}
      />
    </LiveAdminFrame>
  );
}

export function LiveAdminTasksPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin_tasks", user?.id],
    queryFn: fetchKanbanTasks,
    enabled: !!user,
  });
  const clients = useQuery({
    queryKey: ["admin_clients", user?.id],
    queryFn: () => fetchClientRoster(),
    enabled: !!user,
  });
  const tasks: any[] = query.data ? Object.values(query.data).filter(Array.isArray).flat() : [];
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await request("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          client_id: values.get("client"),
          deliverable_type: values.get("format"),
          due_date: values.get("date") || null,
        }),
      });
      form.reset();
      await query.refetch();
      setMessage("Task created.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to create task.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <LiveAdminFrame title="Production tasks">
      <DataState query={query} />
      <input
        aria-label="Search tasks"
        placeholder="Search tasks"
        className={input}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {message && <p role="status">{message}</p>}
      <form onSubmit={create} className={panel}>
        <h2>Create task</h2>
        <select aria-label="Client" name="client" className={input} required>
          <option value="">Select client</option>
          {clients.data?.map((c) => (
            <option key={c.client_id} value={c.client_id}>
              {c.company_name || c.email}
            </option>
          ))}
        </select>
        <select name="format" aria-label="Deliverable format" className={input}>
          {["reel", "static_post", "story", "carousel"].map((f) => (
            <option key={f} value={f}>
              {f.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <input name="date" type="date" aria-label="Task due date" className={input} />
        <button disabled={busy || !clients.data?.length}>Create task</button>
      </form>
      {query.isSuccess && tasks.length === 0 && <p>No tasks yet.</p>}
      <section className="grid md:grid-cols-2 gap-4">
        {tasks
          .filter((t) => JSON.stringify(t).toLowerCase().includes(search.toLowerCase()))
          .map((t) => (
            <article key={t.id} className={panel}>
              <h2 className="font-bold">{t.title || t.deliverable_type?.replaceAll("_", " ")}</h2>
              <p>{t.client_name || t.client_company || t.client_id}</p>
              <p>{t.status?.replaceAll("_", " ")}</p>
              <p>Assigned to: {t.assignee_name || t.assigned_to || "Unassigned"}</p>
              <p>Due: {t.due_date || "Not scheduled"}</p>
              {t.sla_due_at && <p>SLA deadline: {new Date(t.sla_due_at).toLocaleString()}</p>}
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await request(`/api/v1/tasks/${t.id}/assign`, { method: "POST", body: "{}" });
                    await query.refetch();
                    setMessage("Assignment saved.");
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Assignment failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Run automatic assignment
              </button>
            </article>
          ))}
      </section>
    </LiveAdminFrame>
  );
}

export function LiveAdminDeliverablesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["admin_deliverables", user?.id],
    queryFn: () => fetchAdminDeliverables(),
    enabled: !!user,
  });
  const clients = useQuery({
    queryKey: ["admin_clients", user?.id],
    queryFn: () => fetchClientRoster(),
    enabled: !!user,
  });
  const [uploadClient, setUploadClient] = useState("");
  const tasksQuery = useQuery({
    queryKey: ["admin_tasks", user?.id],
    queryFn: fetchKanbanTasks,
    enabled: !!user,
  });
  const uploadTasks: any[] = tasksQuery.data
    ? Object.values(tasksQuery.data)
        .filter(Array.isArray)
        .flat()
        .filter((t: any) => t.client_id === uploadClient)
    : [];
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    const file = values.get("file") as File;
    if (!file?.size) return;
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const uploaded = await request<{ file_url: string }>("/api/v1/admin/deliverables/upload", {
        method: "POST",
        body,
      });
      await request("/api/v1/admin/deliverables", {
        method: "POST",
        body: JSON.stringify({
          client_id: values.get("client"),
          task_id: values.get("task") || null,
          title: values.get("title"),
          file_url: uploaded.file_url,
          file_type: file.type,
          file_size_bytes: file.size,
          status: "pending_qa",
        }),
      });
      form.reset();
      setUploadClient("");
      await query.refetch();
      setMessage("Deliverable uploaded for QA.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <LiveAdminFrame title="Deliverables">
      <DataState query={query} />
      {message && <p role="status">{message}</p>}
      <input
        aria-label="Search deliverables"
        placeholder="Search deliverables"
        className={input}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <form onSubmit={upload} className={panel}>
        <h2>Upload deliverable</h2>
        <select
          aria-label="Client"
          name="client"
          className={input}
          required
          value={uploadClient}
          onChange={(e) => setUploadClient(e.target.value)}
        >
          <option value="">Select client</option>
          {clients.data?.map((c) => (
            <option key={c.client_id} value={c.client_id}>
              {c.company_name || c.email}
            </option>
          ))}
        </select>
        <input name="title" aria-label="Deliverable title" placeholder="Title" className={input} />
        <DataState query={tasksQuery} />
        <select
          name="task"
          aria-label="Production task"
          className={input}
          key={uploadClient}
          required
        >
          <option value="">Select production task</option>
          {uploadTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title || t.deliverable_type?.replaceAll("_", " ") || t.id}
            </option>
          ))}
        </select>
        <input
          name="file"
          aria-label="Upload file"
          type="file"
          accept="video/mp4,video/quicktime,image/png,image/jpeg,image/webp"
          required
        />
        <button disabled={busy || !clients.data?.length}>
          {busy ? "Uploading…" : "Upload for QA"}
        </button>
      </form>
      {query.isSuccess && !query.data?.length && <p>No uploaded deliverables.</p>}
      <section className="grid md:grid-cols-2 gap-4">
        {query.data
          ?.filter((d) => `${d.title} ${d.client}`.toLowerCase().includes(search.toLowerCase()))
          .map((d) => (
            <article key={d.id} className={panel}>
              <h2 className="font-bold">{d.title}</h2>
              <p>
                {d.client} · {d.type}
              </p>
              <p>{d.status?.replaceAll("_", " ")}</p>
              {d.description && <p>{d.description}</p>}
              {d.file_url && (
                <a
                  href={resolveAssetUrl(d.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Open uploaded asset
                </a>
              )}
              {["team_lead", "admin", "super_admin"].includes(user?.role || "") &&
                d.status === "pending_qa" && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await request(`/api/v1/deliverables/${d.id}/qa-approve`, {
                          method: "POST",
                        });
                        await query.refetch();
                        setMessage("QA approved.");
                      } catch (e) {
                        setMessage(e instanceof Error ? e.message : "QA approval failed.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Approve QA
                  </button>
                )}
            </article>
          ))}
      </section>
    </LiveAdminFrame>
  );
}

interface Staff {
  id: string;
  full_name: string;
  email: string;
  role: string;
  account_status: string;
  daily_capacity: number;
  active_wip: number;
  on_leave_today: boolean;
  team_lead_name: string | null;
  team_lead_id: string | null;
  is_accepting_work: boolean;
  skills: string[];
}
export function LiveAdminTeamPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["admin_team", user?.id],
    queryFn: () => request<Staff[]>("/api/v1/admin/teams"),
    enabled: !!user,
  });
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await request("/api/v1/admin/teams", {
        method: "POST",
        body: JSON.stringify({
          full_name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          role: data.get("role"),
          team_lead_id: data.get("lead") || null,
          daily_capacity: Number(data.get("capacity")),
        }),
      });
      form.reset();
      await query.refetch();
      setMessage("Team member created.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to create member.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <LiveAdminFrame title="Team management">
      <DataState query={query} />
      {message && <p role="status">{message}</p>}
      <form onSubmit={create} className={panel}>
        <h2>Create team member</h2>
        <input name="name" aria-label="Member name" placeholder="Name" className={input} required />
        <input
          name="email"
          type="email"
          aria-label="Member email"
          placeholder="Email"
          className={input}
          required
        />
        <input
          name="password"
          type="password"
          aria-label="Member password"
          placeholder="Initial password"
          minLength={8}
          className={input}
          required
        />
        <select name="role" aria-label="Member role" className={input}>
          {(user?.role === "team_lead"
            ? ["editor", "designer"]
            : ["editor", "designer", "team_lead"]
          ).map((r) => (
            <option key={r} value={r}>
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select name="lead" aria-label="Team lead" className={input}>
          <option value="">No team lead</option>
          {query.data
            ?.filter((m) => m.role === "team_lead")
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
        </select>
        <input
          name="capacity"
          type="number"
          aria-label="Daily capacity"
          min={1}
          max={100}
          defaultValue={4}
          className={input}
          required
        />
        <button disabled={busy}>Create member</button>
      </form>
      {query.isSuccess && !query.data?.length && <p>No team members.</p>}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {query.data?.map((m) => (
          <article key={m.id} className={panel}>
            <h2 className="font-bold">{m.full_name || m.email}</h2>
            <p>
              {m.email} · {m.role.replaceAll("_", " ")}
            </p>
            <p>
              {m.account_status} ·{" "}
              {m.on_leave_today
                ? "On approved leave"
                : m.is_accepting_work
                  ? "Accepting work"
                  : "Not accepting work"}
            </p>
            <p>Team lead: {m.team_lead_name || "Unassigned"}</p>
            <p>
              Active tasks: {m.active_wip} · Daily capacity: {m.daily_capacity}
            </p>
            {!!m.skills.length && <p>{m.skills.join(", ")}</p>}
          </article>
        ))}
      </section>
    </LiveAdminFrame>
  );
}

export function LiveAdminRevenuePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30d");
  const kpis = useQuery({
    queryKey: ["admin_kpis", user?.id, period],
    queryFn: () => fetchAdminKPIs(undefined, "admin", period),
    enabled: !!user,
  });
  const trend = useQuery({
    queryKey: ["revenue_trend", user?.id, period],
    queryFn: () => fetchRevenueTrend(period),
    enabled: !!user,
  });
  return (
    <LiveAdminFrame title="Revenue">
      <select
        aria-label="Revenue period"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className={input}
      >
        {["30d", "90d", "365d"].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <DataState query={kpis} />
      <DataState query={trend} />
      {kpis.data && (
        <section className={panel}>
          <p>Monthly recurring revenue: {kpis.data.mrr_formatted}</p>
          <p>Active clients: {kpis.data.active_clients}</p>
          <p>Updated: {new Date(kpis.data.refreshed_at).toLocaleString()}</p>
        </section>
      )}
      {trend.data && (
        <section className={panel}>
          <h2>Revenue recorded during this period</h2>
          <p>{trend.data.total_revenue_formatted}</p>
          {trend.data.points.length === 0 && <p>No revenue history available.</p>}
          {trend.data.points.map((p, i) => (
            <p key={`${p.label}-${i}`}>
              {p.label}: ₹{(p.value / 100).toLocaleString("en-IN")}
            </p>
          ))}
        </section>
      )}
    </LiveAdminFrame>
  );
}
