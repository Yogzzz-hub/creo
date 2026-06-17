import Link from "next/link";
import { MessageSquare, LayoutDashboard, Calendar, Users, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Team", href: "/dashboard/team", icon: Users },
];

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface)]">
      <aside className="flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-deep-navy)] text-white">
        <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold">
          <span className="text-[var(--color-brand)]">Creo</span>
          <span className="text-xs font-medium text-[var(--color-steel-mid)]">Team</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-steel-mid)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-steel-mid)] transition-colors hover:bg-white/10 hover:text-white">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
