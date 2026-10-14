import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { PublishingQueue } from "../../components/ops/PublishingPanel";
import { InstagramTestPost } from "../../components/ops/InstagramTestPost";
import { useAuth } from "../../lib/auth-context";

/** Staff home for Instagram publishing (admins, team leads and creative team members). */
export function PublishingPage() {
  const { user } = useAuth();
  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100">
      <AdminTopHeader activeTab="Publishing" hideTitle />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {["admin", "super_admin", "team_lead"].includes(user?.role || "") && <InstagramTestPost />}
        <details className="rounded-2xl border border-[#2A3446] p-4"><summary className="cursor-pointer font-semibold">Scheduled publishing queue</summary><div className="mt-4"><PublishingQueue /></div></details>
      </main>
    </div>
  );
}
