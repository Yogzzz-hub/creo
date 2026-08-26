"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/context/session-context";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  LogOut,
  FileText,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";

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
    roles: ["team_member", "team_lead", "admin", "super_admin"],
  },
  {
    label: "My Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    roles: ["team_member", "team_lead", "admin", "super_admin"],
  },
  {
    label: "My Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    roles: ["team_member", "team_lead", "admin", "super_admin"],
  },
  {
    label: "Support / Live Chat",
    href: "/dashboard/chat",
    icon: MessageSquare,
    roles: ["team_member", "team_lead", "admin", "super_admin"],
  },
  {
    label: "Leave Requests",
    href: "/dashboard/leave",
    icon: FileText,
    roles: ["team_member", "team_lead", "admin", "super_admin"],
  },
  {
    label: "Team Overview",
    href: "/dashboard/team",
    icon: Users,
    roles: ["team_lead", "admin", "super_admin"],
  },
];

export function InternalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;

    const supabase = createClient();

    async function fetchRole() {
      try {
        let apiRole: string | null = null;
        if (token) {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            apiRole = data.role;
          }
        }

        // Fallback to metadata
        if (!apiRole) {
          const { data: { user } } = await supabase.auth.getUser();
          apiRole =
            (user?.user_metadata?.role as string) ??
            (user?.app_metadata?.role as string) ??
            null;
        }

        setRole(apiRole);
      } catch (err) {
        console.error("Error fetching role in sidebar:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [token, sessionLoading]);

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
              prefetch={false}
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
