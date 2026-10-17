import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { PublishingQueue } from "../../components/ops/PublishingPanel";
import { InstagramTestPost } from "../../components/ops/InstagramTestPost";
import { useAuth } from "../../lib/auth-context";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";

/** Staff home for Instagram publishing (admins, team leads and creative team members). */
export function PublishingPage() {
  const { user } = useAuth();
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState("");
  const queries = useQueryClient();
  async function planCalendar() {
    setPlanning(true); setResult("");
    try {
      const summary = await request<{ planned: number; skipped: number }>("/api/v1/publishing/plan-calendar", { method: "POST", timeoutMs: 120000 });
      setResult(`${summary.planned} calendar posts planned. ${summary.skipped} already planned or unavailable. Review captions and request client approval before automatic publishing.`);
      void queries.invalidateQueries({ queryKey: ["publishing"] });
    } catch (err) { setResult(err instanceof Error ? err.message : "Unable to plan calendar posts."); }
    finally { setPlanning(false); }
  }
  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100">
      <AdminTopHeader activeTab="Publishing" hideTitle />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {["admin", "super_admin", "team_lead"].includes(user?.role || "") && (
          <section className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={planning}
              onClick={() => void planCalendar()}
              className="rounded-xl bg-[#BCCCE6] hover:bg-white px-5 py-2.5 text-xs font-bold text-[#0B111C] disabled:opacity-50 cursor-pointer transition-colors"
            >
              {planning ? "Planning calendar posts…" : "Plan posts from calendars"}
            </button>
            {result && <p role="status" className="text-xs text-[#BCCCE6]">{result}</p>}
          </section>
        )}
        {["admin", "super_admin", "team_lead"].includes(user?.role || "") && <InstagramTestPost />}
        <details open className="rounded-2xl border border-[#2A3446] p-4"><summary className="cursor-pointer font-semibold">Scheduled publishing queue</summary><div className="mt-4"><PublishingQueue /></div></details>
      </main>
    </div>
  );
}
