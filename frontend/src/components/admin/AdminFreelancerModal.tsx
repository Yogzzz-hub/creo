import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Sparkles, ShieldCheck, Mail, Lock, DollarSign, Briefcase, Link as LinkIcon } from "lucide-react";
import { createFreelancer } from "../../lib/freelancer-api";

interface AdminFreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminFreelancerModal({ isOpen, onClose, onSuccess }: AdminFreelancerModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Freelancer@Creo2026!");
  const [specialty, setSpecialty] = useState("Video Editor / Motion Designer");
  const [hourlyRate, setHourlyRate] = useState<number>(1500);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [skillsInput, setSkillsInput] = useState("Premiere Pro, After Effects, Sound Design");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const skills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await createFreelancer({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        specialty: specialty.trim(),
        hourly_rate: Number(hourlyRate) || 0,
        portfolio_link: portfolioLink.trim() || undefined,
        skills,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create freelancer account.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#2A3446] space-y-5 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Freelancer Specialist</h3>
              <p className="text-[11px] text-[#97A0B3]">Onboard outsourced creative talent with scoped role-based access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg hover:bg-[#0B111C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-purple-200">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            Freelancers have strictly scoped access: they can only view assigned deliverables, briefs, and client requirements. Unrelated clients, internal financials, and admin settings are restricted.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.freelancer@agency.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Initial Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-mono text-[11px] focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Specialty / Role Focus</label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. 3D Animator, Colorist"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Hourly / Day Rate (₹)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  placeholder="1500"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Portfolio Link (Optional)</label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://behance.net/username"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Skills (Comma-separated)</label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Color Grading, Figma, Motion Graphics, Blender"
              className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {busy ? "Creating Account..." : "Create Freelancer Account"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
