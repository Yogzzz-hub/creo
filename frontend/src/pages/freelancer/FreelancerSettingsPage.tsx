import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";
import {
  UserRound,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  IndianRupee,
  Lock,
} from "lucide-react";

export function FreelancerSettingsPage() {
  const { user, patchUser } = useAuth();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  // Fetch current user details from backend
  const meQuery = useQuery({
    queryKey: ["freelancer-profile-me", user?.id],
    queryFn: () => request<any>("/api/v1/users/me"),
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    name: user?.full_name || "",
    phone: "",
    email: user?.email || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (meQuery.data) {
      setForm({
        name: meQuery.data.full_name || user?.full_name || "",
        phone: meQuery.data.phone || "",
        email: meQuery.data.email || user?.email || "",
      });
    }
  }, [meQuery.data, user?.full_name, user?.email]);

  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatusMessage({ text: "Name cannot be empty.", type: "error" });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await request<any>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: form.name.trim(),
          phone: form.phone.trim(),
        }),
      });

      if (patchUser) {
        patchUser({
          full_name: updated?.full_name || form.name.trim(),
        });
      }

      setStatusMessage({ text: "Profile details updated successfully.", type: "success" });
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || "Failed to update profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (form.name || user?.full_name || "Freelancer")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-app-base text-hi flex flex-col">
      <AdminTopHeader activeTab="Profile & Settings" hideTitle />

      <main className="max-w-[1400px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 flex-1">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-red-500/15 border-red-500/40 text-red-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── CARD 1: Profile Information ── */}
          <div className="bg-app-surface rounded-3xl p-5 sm:p-7 border border-app-line shadow-xl space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-app-line">
              <div className="size-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                {initials}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-hi">Freelancer Profile</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Contractor
                  </span>
                  <span className="text-xs text-app-mist">{form.email}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-app-mist flex items-center gap-1.5">
                  <UserRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-app-base border border-app-line text-hi text-xs font-medium placeholder:text-[#66738A] focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-app-mist flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-app-base/60 border border-app-line/60 text-app-mist text-xs font-medium cursor-not-allowed"
                />
                <p className="text-[10px] text-[#66738A]">
                  Email is managed by platform administration. Contact executive support to change.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-app-mist flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-app-base border border-app-line text-hi text-xs font-medium placeholder:text-[#66738A] focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── CARD 2: Security & Password Reset ── */}
          <div className="space-y-6">
            <div className="bg-app-surface rounded-3xl p-5 sm:p-7 border border-app-line shadow-xl space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-app-line">
                <div className="size-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-hi">Password & Security</h2>
                  <p className="text-xs text-app-mist">Manage your login credentials & account access</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-app-base border border-app-line space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure Credential Management</span>
                </div>
                <p className="text-xs text-app-mist leading-relaxed">
                  Reset your password or create a dedicated standalone password for direct sign-in. A secure one-time OTP verification code will be sent to your registered email address.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="w-full py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-hi text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reset or Change Password</span>
                </button>
              </div>
            </div>

            {/* ── CARD 3: Workspace & Financial Boundaries ── */}
            <div className="bg-app-surface rounded-3xl p-5 sm:p-7 border border-app-line shadow-xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-app-line">
                <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-hi">Payout & Workspace Terms</h2>
                  <p className="text-xs text-app-mist">Milestone settlement & contractor terms</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-app-mist">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-app-base border border-app-line">
                  <span className="font-semibold">Payout Model</span>
                  <span className="text-hi font-bold">100% Milestone-based (₹ INR)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-app-base border border-app-line">
                  <span className="font-semibold">Platform Fee Deduction</span>
                  <span className="text-emerald-400 font-bold">0% (Zero Fee Direct Payout)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-app-base border border-app-line">
                  <span className="font-semibold">Deliverable Submissions</span>
                  <span className="text-hi font-bold">Direct to Executive Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Recovery Modal */}
      {recoveryOpen && (
        <PasswordRecoveryModal
          initialEmail={form.email || user?.email || ""}
          onClose={() => setRecoveryOpen(false)}
        />
      )}
    </div>
  );
}

export default FreelancerSettingsPage;
