"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  LogOut,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "My Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["team_member", "team_lead"],
  },
  {
    label: "My Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    roles: ["team_member", "team_lead"],
  },
  {
    label: "My Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    roles: ["team_member", "team_lead"],
  },
  {
    label: "Leave Requests",
    href: "/dashboard/leave",
    icon: FileText,
    roles: ["team_member", "team_lead"],
  },
  {
    label: "Team Overview",
    href: "/dashboard/team",
    icon: Users,
    roles: ["team_lead"],
  },
];

export function InternalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userRole =
        data.user?.user_metadata?.role ??
        data.user?.app_metadata?.role ??
        null;
      setRole(userRole);
      setLoading(false);
    });
  }, []);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (loading) return false;
    return role && item.roles.includes(role);
  });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex w-60 flex-col border-r border-white/10 bg-[var(--color-brand-dark)] text-white">
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold">
        <span className="text-[var(--color-brand)]">Creo</span>
        <span className="text-xs font-medium text-[var(--color-brand-mid)]">
          Team
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-[var(--color-brand-mid)] hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-brand-mid)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
