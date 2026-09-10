import React from "react";
import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../lib/auth-context";

export const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  team_member: "/dashboard",
  team_lead: "/dashboard",
  editor: "/dashboard",
  designer: "/dashboard",
  sales: "/admin/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

export function getRoleHome(role?: string | null): string {
  if (!role) return "/portal";
  return ROLE_HOMES[role] || "/portal";
}

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-[#14171C]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#2B7BC4] border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login with return path
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectedFrom=${returnUrl}`} replace />;
  }

  // Role check: Admin and super_admin have universal access
  if (allowedRoles && allowedRoles.length > 0) {
    const isSuperOrAdmin = user.role === "admin" || user.role === "super_admin";
    const hasPermission = isSuperOrAdmin || allowedRoles.includes(user.role);

    if (!hasPermission) {
      const targetHome = getRoleHome(user.role);
      if (targetHome && targetHome !== location.pathname) {
        return <Navigate to={targetHome} replace />;
      }

      // Fallback Access Restricted UI if user is already at their targetHome
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#0D2137] p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center space-y-6">
            <div className="size-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl text-amber-600">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#0D2137]">Access Restricted</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                This operations portal requires <span className="font-semibold text-slate-800">Admin or Staff</span> permissions.
                You are currently signed in as <span className="font-mono text-[#2B7BC4] font-semibold">{user.email}</span> ({user.role}).
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = getRoleHome(user.role);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] transition-colors shadow-xs"
              >
                Go to Your Portal ({getRoleHome(user.role)})
              </button>
              <button
                type="button"
                onClick={() => {
                  const returnUrl = encodeURIComponent(location.pathname + location.search);
                  window.location.href = `/login?redirectedFrom=${returnUrl}`;
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Sign In with Admin Account
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
