import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  CreditCard,
  Sparkles,
  CalendarDays,
  CheckSquare,
  LifeBuoy,
  User,
} from "lucide-react";

export function PortalBottomNav() {
  const location = useLocation();

  const navItems = [
    { label: "Home", href: "/portal", icon: LayoutDashboard, exact: true },
    { label: "Plans", href: "/portal/payments", icon: CreditCard },
    { label: "Pod", href: "/portal/creative-pod", icon: Sparkles },
    { label: "Calendar", href: "/portal/calendar", icon: CalendarDays },
    { label: "Work", href: "/portal/deliverables", icon: CheckSquare },
    { label: "Support", href: "/portal/support", icon: LifeBuoy },
    { label: "Profile", href: "/portal/account", icon: User },
  ];

  return (
    <nav
      aria-label="Portal Navigation"
      className="xl:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-1.5 py-1.5 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.href || location.pathname === `${item.href}/`
            : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 min-w-[44px] sm:min-w-[52px] ${
                isActive
                  ? "text-[#0052FF] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? "bg-blue-50 text-[#0052FF]" : ""
                  }`}
                >
                  <Icon
                    className={`size-4 sm:size-5 transition-transform ${
                      isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"
                    }`}
                  />
                </div>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#0052FF]" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] mt-0.5 tracking-tight line-clamp-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
