import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

import { getRoleHome } from "../auth/ProtectedRoute";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Our Work", href: "/portfolio" },
  { label: "Our Clients", href: "/clients" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userHome = getRoleHome(user?.role);
  const userPortalLabel =
    user?.role === "admin" || user?.role === "super_admin"
      ? "Admin Console"
      : user?.role === "team_member" || user?.role === "team_lead" || user?.role === "editor" || user?.role === "designer"
      ? "Team Kanban"
      : "Client Portal";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 h-16 flex items-center bg-white/95 backdrop-blur-md border-b transition-all duration-200 ${
        scrolled ? "border-slate-200/90 shadow-xs" : "border-slate-100"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="text-xl font-bold text-[#0D2137]">
            Creo
          </Link>
        </div>

        <ul className="hidden lg:flex items-center gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`relative px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 inline-flex items-center gap-1.5 ${
                    isActive
                      ? "text-[#1F5C96] bg-[#E8F4FD] border border-[#C9DFF0]/90 shadow-2xs font-bold"
                      : "text-slate-600 font-medium hover:text-[#0D2137] hover:bg-slate-100/70"
                  }`}
                >
                  {isActive && (
                    <span className="size-1.5 rounded-full bg-[#2B7BC4] animate-pulse" />
                  )}
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              <Link
                to={userHome}
                className="bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] text-white rounded-xl px-5 h-9 text-sm font-semibold inline-flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
              >
                {userPortalLabel}
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-sm font-medium text-[#0D2137]/70 hover:text-[#0D2137] transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#0D2137]/70 hover:text-[#0D2137] transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/pricing"
                className="bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] text-white rounded-xl px-5 h-9 text-sm font-semibold inline-flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setSheetOpen(!sheetOpen)}
          className="lg:hidden flex size-9 items-center justify-center rounded-lg text-[#0D2137] hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          {sheetOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {sheetOpen && (
        <div className="fixed inset-x-0 top-16 bg-white border-b border-border shadow-lg p-6 lg:hidden flex flex-col gap-4 animate-page-in">
          <nav className="flex flex-col gap-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-[#E8F4FD] text-[#1F5C96] font-bold border-l-4 border-[#2B7BC4] shadow-xs"
                      : "text-slate-700 font-medium hover:bg-slate-50 hover:text-[#0D2137]"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="size-2 rounded-full bg-[#2B7BC4]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={userHome}
                  onClick={() => setSheetOpen(false)}
                  className="bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] text-white rounded-xl w-full h-10 text-sm font-semibold inline-flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
                >
                  {userPortalLabel}
                </Link>
                <button
                  onClick={() => {
                    setSheetOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-sm font-medium text-[#0D2137]/70 hover:bg-[#E8F4FD] transition-colors cursor-pointer"
                >
                  <LogOut className="size-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setSheetOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-center text-sm font-medium text-[#0D2137]/70 hover:bg-[#E8F4FD] transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setSheetOpen(false)}
                  className="bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] text-white rounded-xl w-full h-10 text-sm font-semibold inline-flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
