import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { getRoleHome } from "../auth/ProtectedRoute";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Our Clients", href: "/clients" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export function Navbar() {
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
      ? "Team Dashboard"
      : "Client Portal";

  const confirm = useConfirm();

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign Out of Creo?",
      description: "Are you sure you want to sign out? You will need to log back in to access your dashboard.",
      confirmText: "Sign Out",
      cancelText: "Stay Logged In",
      tone: "warning",
      icon: "logout",
    });
    if (!ok) return;

    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-40 h-20 w-full flex items-center bg-deep-surface border-b border-hairline">
      <nav className="mx-auto flex w-full max-w-[1240px] h-full items-center justify-between px-6">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-black tracking-tight text-off-white flex items-baseline">
            creo<span className="text-glow-blue text-3xl leading-none">.</span>
          </Link>
        </div>

        <ul className="hidden lg:flex items-center h-full gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <li key={link.href} className="h-full flex items-center relative">
                <Link
                  to={link.href}
                  className={`text-sm transition-colors ${
                    isActive
                      ? "text-off-white font-bold"
                      : "text-slate-mist hover:text-off-white font-medium"
                  }`}
                >
                  {link.label}
                </Link>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-glow-blue rounded-t-full" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:flex items-center gap-6">
          {user ? (
            <>
              <Link
                to={userHome}
                className="bg-cta-primary hover:bg-white text-void font-black text-xs px-5 py-2.5 rounded-full shadow-sm transition-colors"
              >
                {userPortalLabel}
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-sm font-medium text-slate-mist hover:text-off-white transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-mist hover:text-off-white transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-cta-primary hover:bg-white text-void font-black text-xs px-5 py-2.5 rounded-full shadow-sm transition-colors"
              >
                Get Started &rarr;
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setSheetOpen(!sheetOpen)}
          className="lg:hidden flex size-9 items-center justify-center rounded-lg text-off-white hover:bg-bento-surface transition-colors"
          aria-label="Open menu"
        >
          {sheetOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {sheetOpen && (
        <div className="absolute inset-x-0 top-20 bg-deep-surface border-b border-hairline shadow-lg p-6 lg:hidden flex flex-col gap-4 animate-page-in">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-bento-surface text-off-white font-bold border-l-4 border-glow-blue shadow-xs"
                      : "text-slate-mist font-medium hover:bg-bento-surface hover:text-off-white"
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-hairline flex flex-col gap-3">
            {user ? (
              <>
                <Link
                  to={userHome}
                  onClick={() => setSheetOpen(false)}
                  className="bg-cta-primary hover:bg-white text-void font-black text-xs h-10 rounded-full shadow-sm flex items-center justify-center transition-colors"
                >
                  {userPortalLabel}
                </Link>
                <button
                  onClick={() => {
                    setSheetOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-mist hover:text-off-white transition-colors cursor-pointer"
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
                  className="block rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-mist hover:text-off-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setSheetOpen(false)}
                  className="bg-cta-primary hover:bg-white text-void font-black text-xs h-10 rounded-full shadow-sm flex items-center justify-center transition-colors"
                >
                  Get Started &rarr;
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

