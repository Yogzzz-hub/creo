import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";

type Leave = { id: string; start_date: string; end_date: string; reason: string; status: string; is_self: boolean; can_cancel: boolean; team_lead_name: string };

export function MemberSchedulePTOPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const pod = useQuery<PodDashboardData>({ queryKey: ["pod_dashboard", user?.id, undefined], queryFn: () => fetchPodDashboard(), staleTime: 30_000 });
  const leaves = useQuery({ queryKey: ["staff-leave", user?.id], queryFn: () => request<Leave[]>("/api/v1/admin/leave"), staleTime: 30_000 });
  const myLeaves = (leaves.data ?? []).filter((leave) => leave.is_self);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff-leave"] });
    void queryClient.invalidateQueries({ queryKey: ["admin_leave_requests"] });
    void queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
  };
  const submit = useMutation({
    mutationFn: () => request("/api/v1/admin/leave", { method: "POST", body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason.trim() }) }),
    onSuccess: () => { setNotice("Leave request submitted for approval."); setReason(""); refresh(); },
  });
  const cancel = useMutation({ mutationFn: (id: string) => request(`/api/v1/admin/leave/${id}`, { method: "DELETE" }), onSuccess: () => { setNotice("Leave request cancelled."); refresh(); } });
  const error = submit.error ?? cancel.error ?? leaves.error;
  const tasks = Object.values(pod.data?.tasks ?? {}).flat().filter((task) => task.assigned_to === user?.id && !["completed", "ready_to_publish"].includes(task.status));
  const today = new Date().toISOString().slice(0, 10);
  return <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100">
    <AdminTopHeader activeTab="My Schedule & PTO" />
    <main className="max-w-6xl mx-auto p-3 sm:p-6 pb-24 space-y-5">
      <header><h1 className="text-2xl font-semibold">My Schedule & Leave</h1><p className="text-sm text-slate-400 mt-1">{pod.data?.pod?.name ?? "Creative team"} • Requests and upcoming assignments</p></header>
      {notice && <p role="status" className="rounded-xl bg-emerald-500/10 text-emerald-300 p-3">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-500/10 text-rose-300 p-3">{error instanceof Error ? error.message : "Unable to process the request."}</p>}
      <div className="grid md:grid-cols-2 gap-5">
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-[#161F2D] p-4 sm:p-5"><h2 className="text-lg font-semibold mb-4">Request time off</h2>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setNotice(""); submit.mutate(); }}>
            <label className="block text-sm">Start date<input required type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 block w-full min-w-0 min-h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 [color-scheme:dark]" /></label>
            <label className="block text-sm">End date<input required type="date" min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 block w-full min-w-0 min-h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 [color-scheme:dark]" /></label>
            <label className="block text-sm">Reason and handover notes<textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 block w-full rounded-xl bg-slate-900 border border-slate-700 p-3" /></label>
            <button disabled={submit.isPending || !reason.trim()} className="min-h-11 w-full rounded-xl bg-blue-500 px-4 font-medium disabled:opacity-50">{submit.isPending ? "Submitting..." : "Submit for approval"}</button>
          </form>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-[#161F2D] p-4 sm:p-5"><h2 className="text-lg font-semibold mb-4">My leave requests</h2>
          {leaves.isPending && <p role="status" className="text-slate-400">Loading requests...</p>}
          {!leaves.isPending && !leaves.isError && myLeaves.length === 0 && <p className="text-sm text-slate-400">No leave requests yet.</p>}
          <div className="space-y-3">{myLeaves.map((leave) => <article key={leave.id} className="rounded-xl border border-slate-700 p-3 break-words"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{leave.start_date} → {leave.end_date}</p><span className="text-xs capitalize text-blue-300">{leave.status}</span></div><p className="text-sm text-slate-400 mt-2">{leave.reason}</p><p className="text-xs text-slate-500 mt-2">Reviewer: {leave.team_lead_name}</p>{leave.can_cancel && <button disabled={cancel.isPending} onClick={() => { setNotice(""); cancel.mutate(leave.id); }} className="mt-3 min-h-11 px-3 rounded-lg border border-slate-600 text-sm disabled:opacity-50">Cancel request</button>}</article>)}</div>
        </section>
      </div>
      <section className="rounded-2xl border border-slate-800 p-4 sm:p-5"><h2 className="text-lg font-semibold mb-4">Upcoming assignments</h2>
        {pod.isPending && <p role="status" className="text-slate-400">Loading schedule...</p>}
        {pod.isError && <p role="alert" className="text-rose-300">Unable to load assignments.</p>}
        {!pod.isPending && !pod.isError && tasks.length === 0 && <p className="text-sm text-slate-400">No upcoming assignments.</p>}
        <div className="grid sm:grid-cols-2 gap-3">{tasks.map((task) => <article key={task.id} className="min-w-0 rounded-xl bg-[#161F2D] p-3 break-words"><h3 className="font-medium">{task.client_name} • {task.deliverable_type}</h3><p className="text-sm text-slate-400 mt-1">{task.status.replaceAll("_", " ")}</p><p className="text-xs text-slate-500 mt-2">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Unscheduled"}</p></article>)}</div>
      </section>
    </main>
  </div>;
}
