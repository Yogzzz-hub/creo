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
import { CustomSelect } from "../ui/CustomSelect";

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

  const [dispatchEmail, setDispatchEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

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
        dispatch_email: dispatchEmail.trim() || undefined,
        send_email: sendEmail,
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
        className="bg-app-surface rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-app-line space-y-5 text-hi max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-hi">Onboard Freelancer</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Role Scoped
                </span>
              </div>
              <p className="text-[11px] text-app-mist">
                Assign project access & task deliverables
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-app-mist hover:text-hi rounded-xl hover:bg-app-base transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Security Sandbox Banner - Minimalist 1-Line */}
        <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center gap-2 text-xs text-purple-300">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-[11px]">Restricted to assigned tasks & deliverables only. Financials hidden.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-ink-2 mb-1">Full Name *</label>
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
                className="w-full px-3 py-2 rounded-lg border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-app-ink-2 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-app-mist absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.editor@creo.agency"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Dispatch / Personal Email Option - Minimalist */}
          <div className="bg-app-base/60 p-2.5 sm:p-3 rounded-xl border border-app-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-app-ink-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>Personal Email</span>
                <span className="text-[10px] text-app-mist font-normal">(Optional dispatch)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-purple-300 text-[11px] font-medium select-none">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="size-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>Send credentials</span>
              </label>
            </div>
            <input
              type="email"
              value={dispatchEmail}
              onChange={(e) => setDispatchEmail(e.target.value)}
              placeholder="e.g. alex.personal@gmail.com"
              className="w-full px-3 py-2 rounded-lg border border-app-line bg-app-surface text-hi focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          {/* Specialty Dropdown & Custom Option */}
          <div>
            <label className="block font-bold text-app-ink-2 mb-1">Specialty & Creative Track *</label>
            <CustomSelect
              value={selectedSpecialty || ""}
              onChange={setSelectedSpecialty}
              ariaLabel="Specialty & Creative Track"
              className="w-full"
              icon={<Briefcase className="w-3.5 h-3.5" />}
              options={COMMON_SPECIALTIES.map((spec) => ({
                value: spec,
                label: spec,
              }))}
            />
            {selectedSpecialty === "Custom Specialty" && (
              <input
                type="text"
                required
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                placeholder="Type custom specialty (e.g. Drone Pilot / Aerial Cinematographer)..."
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-purple-500/40 bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
              />
            )}
          </div>

          {/* Rate & Pricing Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-app-ink-2">Agreed Compensation Rate</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRateType("hourly")}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      rateType === "hourly"
                        ? "bg-purple-600 text-app-on-accent!"
                        : "text-app-mist hover:text-hi"
                    }`}
                  >
                    Per Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateType("fixed")}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      rateType === "fixed"
                        ? "bg-purple-600 text-app-on-accent!"
                        : "text-app-mist hover:text-hi"
                    }`}
                  >
                    Per Project
                  </button>
                </div>
              </div>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  placeholder="1500"
                  className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs font-semibold"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-app-mist font-bold">
                  {rateType === "hourly" ? "₹ / hr" : "₹ / task"}
                </span>
              </div>
            </div>

            {/* Portfolio Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-app-ink-2">Portfolio / Showreel URL</label>
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
                <LinkIcon className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
                <input
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://behance.net/username or vimeo.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Interactive Skills Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-app-ink-2">Core Software & Production Skills</label>
              <span className="text-[10px] text-app-mist">Click to toggle or add custom below</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-app-base border border-app-line">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-app-on-accent! shadow-sm shadow-purple-500/20"
                        : "bg-app-surface text-app-mist hover:text-hi border border-app-line"
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
                className="flex-1 px-3 py-1.5 rounded-xl border border-app-line bg-app-base text-hi text-xs focus:outline-none focus:border-purple-400"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-line border border-app-line text-purple-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Initial Password with Generator & Copy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-app-ink-2">Initial Account Password</label>
              <button
                type="button"
                onClick={() => setPassword(generateSecurePassword())}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Generate New
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-app-line bg-app-base text-hi font-mono text-xs focus:outline-none focus:border-purple-400"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-app-mist hover:text-hi rounded-md"
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
          </div>

          {/* Engagement Notes / Contract Details */}
          <div>
            <label className="block font-bold text-app-ink-2 mb-1">
              Internal Notes & Terms (Optional)
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-app-mist absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="NDA status, turnaround SLA, working hours..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-app-line">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-app-line font-bold text-app-mist hover:text-hi hover:bg-app-base transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-app-on-accent! shadow-lg shadow-purple-600/25 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer active:scale-95 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {busy ? "Onboarding..." : "Onboard Freelancer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
