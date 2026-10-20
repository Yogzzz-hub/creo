import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, ArrowRight, LogOut, Home, Briefcase, Tag, Info, User } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { getRoleHome } from "../auth/ProtectedRoute";

interface MobileNavBarProps {
  statusBadge?: string;
  statusType?: "green" | "cyan";
  ctaText?: string;
  onCtaClick?: () => void;
}

export function MobileNavBar({
  statusBadge = "Studio Live",
  statusType = "green",
  ctaText = "Demo",
  onCtaClick,
}: MobileNavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const userHome = getRoleHome(user?.role);
  const userPortalLabel =
    user?.role === "admin" || user?.role === "super_admin"
      ? "Admin Console"
      : user?.role === "team_member" || user?.role === "team_lead" || user?.role === "editor" || user?.role === "designer"
      ? "Team Dashboard"
      : "Client Portal";

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Work", href: "/work", icon: Briefcase },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "About", href: "/about", icon: Info },
  ];

  return (
    <>
      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-50 h-[50px] px-3.5 flex items-center justify-between backdrop-blur-xl bg-[#0B111C]/90 border-b border-[#2A3446] shadow-[0_2px_12px_rgba(5,8,16,0.6)]">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-1 group">
          <span className="text-[17px] font-black tracking-tight text-[#F8FAFC] uppercase font-sans">
            CREO<span className="text-[#7FA0D6]">.</span>
          </span>
          <div className="flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-full bg-[#161F2D] border border-[#2A3446] text-[9px] font-space-grotesk font-semibold text-[#97A0B3]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusType === "cyan" ? "bg-[#7FA0D6]" : "bg-[#7FA0D6]"
              } animate-pulse`}
            />
            <span>{statusBadge}</span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {ctaText && (
            <button
              type="button"
              onClick={
                onCtaClick ||
                (() => {
                  const el = document.getElementById("lead-capture") || document.getElementById("cta-footer");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    navigate("/signup?intent=sample");
                  }
                })
              }
              className="h-7 px-3.5 rounded-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-[10.5px] flex items-center justify-center gap-1 shadow-[0_0_14px_rgba(188,204,230,0.3)] active:scale-95 transition-all cursor-pointer"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-2.5 h-2.5 stroke-[2.5]" />
            </button>
          )}

          {/* Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="w-8 h-8 rounded-lg bg-[#161F2D] hover:bg-[#161F2D]/80 border border-[#2A3446] text-[#F8FAFC] flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
          >
            {isOpen ? <X className="w-4 h-4 text-[#F8FAFC]" /> : <Menu className="w-4 h-4 text-[#F8FAFC]" />}
          </button>
        </div>
      </header>

      {/* Slide-over / Dropdown Menu Bar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[50px] z-40 bg-[#050810]/80 backdrop-blur-md flex flex-col justify-start animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#0B111C]/98 border-b border-[#2A3446] shadow-2xl p-4 flex flex-col gap-3 font-plus-jakarta animate-in slide-in-from-top-4 duration-300"
          >
            {/* Primary Nav Links */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] px-2 py-1 font-semibold">
                Menu Navigation
              </span>
              {navLinks.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#161F2D] border border-[#7FA0D6]/50 text-[#7FA0D6] shadow-[0_0_12px_rgba(127,160,214,0.15)]"
                        : "text-[#97A0B3] hover:text-[#F8FAFC] hover:bg-[#161F2D]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#7FA0D6]" : "text-[#97A0B3]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />}
                  </Link>
                );
              })}
            </div>

            {/* Auth / Workflow Action Strip */}
            <div className="pt-3 border-t border-[#2A3446] flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    to={userHome}
                    onClick={() => setIsOpen(false)}
                    className="w-full h-10 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(188,204,230,0.3)] active:scale-[0.98] transition-all"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Go to {userPortalLabel}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full h-9 rounded-xl bg-[#161F2D] hover:bg-[#161F2D]/80 border border-[#2A3446] text-[#97A0B3] hover:text-[#D8BF9B] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="h-10 rounded-xl bg-[#161F2D] hover:bg-[#161F2D]/80 border border-[#2A3446] text-[#F8FAFC] text-xs font-bold flex items-center justify-center transition-colors text-center"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className="h-10 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(188,204,230,0.3)] active:scale-[0.98] transition-all text-center"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
