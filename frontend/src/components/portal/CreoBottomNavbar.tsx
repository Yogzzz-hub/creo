import { Link, useLocation } from "react-router";
import { 
  Home, 
  CreditCard, 
  Box, 
  Calendar, 
  Inbox, 
  LifeBuoy 
} from "lucide-react";

export function CreoBottomNavbar() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/portal", icon: Home },
    { name: "Plans", path: "/portal/payments", icon: CreditCard },
    { name: "Creative Pod", path: "/portal/creative-pod", icon: Box },
    { name: "Calendar", path: "/portal/calendar", icon: Calendar },
    { name: "Deliverables", path: "/portal/deliverables", icon: Inbox },
    { name: "Support", path: "/portal/support", icon: LifeBuoy },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[100] bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] xl:hidden pb-safe">
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
              className={`flex flex-col items-center justify-center min-w-[64px] p-2 rounded-xl transition-all ${
                isActive
                  ? "text-[#0052FF]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all ${isActive ? "bg-[#EBF3FF]" : ""}`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap tracking-tight transition-colors ${isActive ? "text-[#0052FF]" : "text-slate-500"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
