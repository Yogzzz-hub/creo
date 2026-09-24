import { Link, useLocation } from "react-router";
import { Home, Sparkles, Users, CreditCard, HelpCircle, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { getRoleHome } from "../auth/ProtectedRoute";

export function PublicBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const userHome = getRoleHome(user?.role);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Work", href: "/portfolio", icon: Sparkles },
    { label: "Clients", href: "/clients", icon: Users },
    { label: "Pricing", href: "/pricing", icon: CreditCard },
    { label: "FAQ", href: "/faq", icon: HelpCircle },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[54px] ${
                isActive
                  ? "text-[#1F5C96] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div className="relative">
                <Icon className={`size-5 transition-transform ${isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#2B7BC4]" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Portal / Login Quick Access */}
        {user ? (
          <Link
            to={userHome}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#1F5C96] hover:text-[#0D2137] min-w-[54px]"
          >
            <div className="relative">
              <LayoutDashboard className="size-5 stroke-[2] text-[#2B7BC4]" />
            </div>
            <span className="text-[10px] font-bold mt-1 tracking-tight">Portal</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-900 min-w-[54px]"
          >
            <div className="relative">
              <LogIn className="size-5 stroke-[1.8]" />
            </div>
            <span className="text-[10px] font-medium mt-1 tracking-tight">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
