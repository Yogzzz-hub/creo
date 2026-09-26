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
    <nav className="fixed bottom-0 inset-x-0 z-[100] bg-[#161F2D]/95 backdrop-blur-md border-t border-[#2A3446] shadow-[0_-4px_24px_rgba(5,8,16,0.6)] xl:hidden pb-safe">
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
                  ? "text-[#BCCCE6]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#0B111C]"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all ${isActive ? "bg-[#2A3446] text-[#BCCCE6]" : ""}`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap tracking-tight transition-colors ${isActive ? "text-[#BCCCE6]" : "text-[#97A0B3]"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
