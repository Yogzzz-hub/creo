import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { PublishingQueue } from "../../components/ops/PublishingPanel";
import { useAuth } from "../../lib/auth-context";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CalendarClock, Sparkles, Loader2 } from "lucide-react";

/** Staff home for Instagram publishing (admins, team leads and creative team members). */
export function PublishingPage() {
  const { user } = useAuth();
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState("");
  const queries = useQueryClient();

  async function planCalendar() {
    setPlanning(true);
    setResult("");
    try {
      const summary = await request<{ planned: number; skipped: number }>(
        "/api/v1/publishing/plan-calendar",
        { method: "POST", timeoutMs: 120000 }
      );
      setResult(
        `${summary.planned} calendar posts planned. ${summary.skipped} already planned or unavailable. Review captions and request client approval before automatic publishing.`
      );
      void queries.invalidateQueries({ queryKey: ["publishing"] });
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Unable to plan calendar posts.");
    } finally {
      setPlanning(false);
    }
  }

  const canManage = ["admin", "super_admin", "team_lead"].includes(user?.role || "");

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100 flex flex-col">
      <AdminTopHeader activeTab="Publishing" hideTitle />
      <main className="w-full max-w-[1550px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <CalendarClock className="w-6 h-6 text-[#7FA0D6]" />
              Scheduled Publishing Queue
            </h1>

          </div>

          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                disabled={planning}
                onClick={() => void planCalendar()}
                className="flex items-center gap-2 rounded-xl bg-[#BCCCE6] hover:bg-white px-4 py-2.5 text-xs font-bold text-[#0B111C] disabled:opacity-50 cursor-pointer transition-all shadow-sm"
              >
                {planning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Planning calendar posts…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0B111C]" />
                    <span>Plan Posts From Calendars</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Status result notification if generated */}
        {result && (
          <div
            role="status"
            className="rounded-2xl border border-[#7FA0D6]/30 bg-[#7FA0D6]/10 p-4 text-xs font-medium text-[#BCCCE6] flex items-center justify-between gap-3 shadow-xs"
          >
            <p className="leading-relaxed">{result}</p>
            <button
              type="button"
              onClick={() => setResult("")}
              className="text-[#97A0B3] hover:text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Publishing Queue */}
        <div className="w-full">
          <PublishingQueue />
        </div>
      </main>
    </div>
  );
}
