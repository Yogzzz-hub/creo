import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { PublishingQueue } from "../../components/ops/PublishingPanel";

/** Staff home for Instagram publishing (admins, team leads and creative team members). */
export function PublishingPage() {
  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100">
      <AdminTopHeader activeTab="Publishing" hideTitle />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <PublishingQueue />
      </main>
    </div>
  );
}
