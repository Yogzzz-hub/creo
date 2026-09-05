import { SessionProvider } from "@/context/session-context";
import { InternalSidebar } from "@/components/internal-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <InternalSidebar />
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg-internal)]">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
