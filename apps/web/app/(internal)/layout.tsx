import { InternalSidebar } from "@/components/internal-sidebar";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <InternalSidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-bg-internal)]">
        {children}
      </main>
    </div>
  );
}
