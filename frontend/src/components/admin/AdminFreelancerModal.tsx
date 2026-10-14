import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UserPlus,
  Sparkles,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Briefcase,
  Link as LinkIcon,
  Plus,
  IndianRupee,
  RefreshCw,
  FileText,
} from "lucide-react";
import { createFreelancer } from "../../lib/freelancer-api";

interface AdminFreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_SPECIALTIES = [
  "Video Editor (Reels & Shorts)",
  "Motion Graphics & VFX Designer",
  "3D Modeler & Animator (Blender/C4D)",
  "Brand Identity & Visual Designer",
  "UI/UX & Product Designer",
  "Commercial Colorist (DaVinci)",
  "Sound Designer & Audio Engineer",
  "Commercial Cinematographer / Videographer",
  "Custom Specialty",
];

const PRESET_SKILLS = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Blender",
  "Cinema 4D",
  "Figma",
  "Photoshop",
  "Illustrator",
  "Color Grading",
  "Kinetic Typography",
  "Sound Design",
  "Unreal Engine",
];

function generateSecurePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pwd = "Creo@";
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "!";
}

export function AdminFreelancerModal({ isOpen, onClose, onSuccess }: AdminFreelancerModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateSecurePassword);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [selectedSpecialty, setSelectedSpecialty] = useState(COMMON_SPECIALTIES[0]);
  const [customSpecialty, setCustomSpecialty] = useState("");

  const [hourlyRate, setHourlyRate] = useState<number>(1500);
  const [rateType, setRateType] = useState<"hourly" | "fixed">("hourly");

  const [portfolioLink, setPortfolioLink] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "Premiere Pro",
    "After Effects",
  ]);
  const [customSkillInput, setCustomSkillInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setCustomSkillInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Please fill out full name and email address.");
      return;
    }

    const finalSpecialty =
      selectedSpecialty === "Custom Specialty"
        ? customSpecialty.trim() || "Creative Specialist"
        : selectedSpecialty;

    setBusy(true);
    setError(null);
    try {
      await createFreelancer({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        specialty: finalSpecialty,
        hourly_rate: Number(hourlyRate) || 0,
        portfolio_link: portfolioLink.trim() || undefined,
        portfolio_url: portfolioLink.trim() || undefined,
        notes: notes.trim() ? `${rateType === "fixed" ? "[Per-Deliverable Rate] " : ""}${notes.trim()}` : undefined,
        skills: selectedSkills,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to onboard freelancer specialist. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#161F2D] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-5 text-white max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Onboard Freelancer Specialist</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Role Scoped
                </span>
              </div>
              <p className="text-[11px] text-[#97A0B3]">
                Provision individual access to task rosters, review workflows & asset submissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#97A0B3] hover:text-white rounded-xl hover:bg-[#0B111C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Security Sandbox Banner */}
        <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-purple-200">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Role-Based Security Boundary:</strong> Freelancer accounts are strictly restricted. They will only have visibility over tasks and deliverables explicitly assigned to them. Agency billing, client lists, and internal squad financials remain invisible.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  const name = e.target.value;
                  setFullName(name);
                  if (!email && name) {
                    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
                    setEmail(`${clean}@freelancer.agency`);
                  }
                }}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.editor@creo.agency"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Specialty Dropdown & Custom Option */}
          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Specialty & Creative Track *</label>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs cursor-pointer font-medium"
              >
                {COMMON_SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec} className="bg-[#161F2D] text-white">
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            {selectedSpecialty === "Custom Specialty" && (
              <input
                type="text"
                required
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                placeholder="Type custom specialty (e.g. Drone Pilot / Aerial Cinematographer)..."
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-purple-500/40 bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
              />
            )}
          </div>

          {/* Rate & Pricing Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#F1F5F9]">Agreed Compensation Rate</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRateType("hourly")}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      rateType === "hourly"
                        ? "bg-purple-600 text-white"
                        : "text-[#97A0B3] hover:text-white"
                    }`}
                  >
                    Per Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateType("fixed")}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      rateType === "fixed"
                        ? "bg-purple-600 text-white"
                        : "text-[#97A0B3] hover:text-white"
                    }`}
                  >
                    Per Project
                  </button>
                </div>
              </div>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  placeholder="1500"
                  className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs font-semibold"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-[#97A0B3] font-bold">
                  {rateType === "hourly" ? "₹ / hr" : "₹ / task"}
                </span>
              </div>
            </div>

            {/* Portfolio Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#F1F5F9]">Portfolio / Showreel URL</label>
                {portfolioLink && (
                  <a
                    href={portfolioLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold hover:underline"
                  >
                    Test Link
                  </a>
                )}
              </div>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
                <input
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://behance.net/username or vimeo.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Interactive Skills Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-[#F1F5F9]">Core Software & Production Skills</label>
              <span className="text-[10px] text-[#97A0B3]">Click to toggle or add custom below</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-[#0B111C] border border-[#2A3446]">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                        : "bg-[#161F2D] text-[#97A0B3] hover:text-white border border-[#2A3446]"
                    }`}
                  >
                    {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={handleAddCustomSkill}
                placeholder="Type additional skill and press Enter (e.g. Mocha Pro, Midjourney)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:border-purple-400"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-3 py-1.5 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-purple-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Initial Password with Generator & Copy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#F1F5F9]">Initial Account Password</label>
              <button
                type="button"
                onClick={() => setPassword(generateSecurePassword())}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Generate New
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#97A0B3] hover:text-white rounded-md"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all"
                  title="Copy password to clipboard"
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <span className="text-[10px] text-[#97A0B3] mt-1 block">
              Share these credentials with the freelancer. They can sign in at /login.
            </span>
          </div>

          {/* Engagement Notes / Contract Details */}
          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">
              Internal Engagement Notes & Contract Terms (Optional)
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="NDA signed, preferred working hours, turnaround SLA expectations, WhatsApp/Slack channel ID..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-[#2A3446] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-lg shadow-purple-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              {busy ? "Provisioning Specialist..." : "Onboard Freelancer Specialist"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
