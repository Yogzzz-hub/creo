import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const MandatoryPasswordResetModal: React.FC = () => {
  const { user, setMandatoryPassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.must_reset_password) {
      setNewPassword(""); setConfirmPassword(""); setError(null); setSuccess(false);
    }
  }, [user?.must_reset_password, user?.id]);

  // If user is not logged in or doesn't need to reset password, do not render
  if (!user || !user.must_reset_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword.length > 128 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Use 8–128 characters, including a letter and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      await setMandatoryPassword(newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto"
      style={{ pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandatory-reset-title"
    >
      <div className="relative w-full max-w-md bg-white border border-[#2A3446] rounded-3xl p-8 shadow-2xl shadow-slate-900/15 text-[#0B111C] animate-in fade-in zoom-in-95 duration-300">
        {/* Glow backdrop */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#7FA0D6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-[#7FA0D6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#BCCCE6] border border-[#2A3446] text-[#7FA0D6] mb-4 shadow-sm">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 id="mandatory-reset-title" className="text-2xl font-bold tracking-tight text-[#0B111C]">
            Set your Creo password
          </h2>
          <p className="mt-2 text-sm text-[#97A0B3] leading-relaxed">
            You accessed your account via a password reset code. For your security, you{" "}
            <span className="text-[#7FA0D6] font-semibold">must set a new permanent password</span> before proceeding.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-[#0B111C]">Password Updated!</h3>
            <p className="text-sm text-[#97A0B3] mt-1">Unlocking your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-[#0B111C] mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters, with a letter and a number"
                  required
                  autoFocus
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#2A3446] rounded-xl text-[#0B111C] placeholder-[#97A0B3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/30 focus:border-[#7FA0D6] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-[#0B111C] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#0B111C] mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#2A3446] rounded-xl text-[#0B111C] placeholder-[#97A0B3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/30 focus:border-[#7FA0D6] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-[#0B111C] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#7FA0D6] hover:brightness-105 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating & Unlocking...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Set Password & Continue
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
