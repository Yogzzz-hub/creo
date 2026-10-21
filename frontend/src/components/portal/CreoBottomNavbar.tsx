import { Link, useLocation } from "react-router";
import { 
  Home, 
  CreditCard, 
  Calendar, 
  Inbox, 
  LifeBuoy 
} from "lucide-react";

export function CreoBottomNavbar() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/portal", icon: Home },
    { name: "Plans", path: "/portal/payments", icon: CreditCard },
    { name: "Calendar", path: "/portal/calendar", icon: Calendar },
    { name: "Deliverables", path: "/portal/deliverables", icon: Inbox },
    { name: "Support", path: "/portal/support", icon: LifeBuoy },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[100] bg-app-surface/95 backdrop-blur-md border-t border-app-line shadow-[0_-4px_24px_rgb(var(--shadow-rgb)/calc(0.6*var(--shadow-k)))] md:hidden pb-safe">
      <div className="flex items-center justify-around overflow-x-auto no-scrollbar px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/portal"
              ? location.pathname === "/portal" || location.pathname === "/portal/"
              : location.pathname.includes(item.path);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1.5 px-1 sm:px-2 rounded-xl transition-all ${
                isActive
                  ? "text-app-accent-soft"
                  : "text-app-mist hover:text-hi hover:bg-app-base"
              }`}
            >
              <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full mb-0.5 transition-all ${isActive ? "bg-app-line text-app-accent-soft" : ""}`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? "scale-110" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9.5px] sm:text-[10px] font-bold whitespace-nowrap tracking-tight transition-colors ${isActive ? "text-app-accent-soft" : "text-app-mist"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
