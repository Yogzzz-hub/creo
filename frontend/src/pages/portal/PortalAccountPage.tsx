import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import {
  Building2,
  Instagram,
  Globe,
  Save,
  CheckCircle2,
  Shield,
  Sparkles,
  Loader2,
  Link2,
  Phone,
  User,
  Eye,
  EyeOff,
  Unlink,
  Camera,
  Check,
  X,
  RefreshCw,
  Sliders,
  Lock,
} from "lucide-react";


interface ProfileResponse {
  full_name: string;
  email: string;
  phone?: string;
  company_name: string;
  instagram_username: string;
  instagram_connected?: boolean;
  two_fa_enabled?: boolean;
  brand_summary: string;
  brand_dna: Record<string, any>;
  questionnaire_answers?: Record<string, any>;
}

const TONE_OPTIONS = [
  "Bold",
  "Professional",
  "Playful",
  "Luxurious",
  "Minimalist",
  "Educational",
  "Inspirational",
  "Warm",
  "Authoritative",
  "Witty",
  "High-Energy",
  "Aesthetic & Editorial",
];

const GOAL_OPTIONS = [
  "Brand Awareness",
  "Lead Generation",
  "Sales & Conversions",
  "Community Building",
  "Content Engagement",
  "Event Promotion",
  "Thought Leadership",
];

export function PortalAccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"business" | "brand" | "security" | "integrations">("business");

  // Tab 1: Business Profile Fields
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  // Tab 2: Brand Profile Fields
  const [industry, setIndustry] = useState("Tech & SaaS");
  const [primaryGoal, setPrimaryGoal] = useState("Brand Awareness");
  const [brandDescription, setBrandDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [toneKeywords, setToneKeywords] = useState<string[]>(["Bold", "Modern"]);
  const [brandColors, setBrandColors] = useState("#0D2137, #2B7BC4, #059669");
  const [styleReferences, setStyleReferences] = useState("");
  const [topicsToAvoid, setTopicsToAvoid] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiPersona, setAiPersona] = useState("");
  const [contentThemes, setContentThemes] = useState<string[]>([]);

  // Tab 3: Security Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab 4: Integrations Fields
  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectIgInput, setConnectIgInput] = useState("");

  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Settings saved successfully");

  const { data: profile, isLoading } = useQuery<ProfileResponse>({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request<ProfileResponse>("/api/v1/portal/profile"),
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBusinessName(profile.company_name || "");
      setPhone(profile.phone || "");
      setInstagram(profile.instagram_username || "");
      setWebsite(profile.brand_dna?.website || "");

      // Brand details
      const dna = profile.brand_dna || {};
      const answers = profile.questionnaire_answers || {};

      setIndustry(answers.industry || dna.industry || "Tech & SaaS");
      setPrimaryGoal(answers.primary_goal || dna.primary_goal || "Brand Awareness");
      setBrandDescription(answers.business_description || dna.business_description || profile.brand_summary || "");
      setTargetAudience(answers.target_audience || dna.target_audience || "");
      setToneKeywords(
        answers.tone_keywords && answers.tone_keywords.length > 0
          ? answers.tone_keywords
          : dna.tone ? dna.tone.split(",").map((s: string) => s.trim()) : ["Bold", "Professional"]
      );
      if (Array.isArray(dna.palette)) {
        setBrandColors(dna.palette.join(", "));
      } else if (dna.brand_colors) {
        setBrandColors(dna.brand_colors);
      }

      setStyleReferences((answers.style_references || []).join(", "));
      setTopicsToAvoid(answers.topics_to_avoid || "");
      setAiSummary(profile.brand_summary || dna.ai_summary_line || "");
      setAiPersona(dna.audience_persona || "");
      setContentThemes(dna.content_themes || []);

      // Security
      setTwoFactorEnabled(profile.two_fa_enabled || false);

      // Integrations
      setIgConnected(Boolean(profile.instagram_connected || profile.instagram_username));
      setIgUsername(profile.instagram_username || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setSaved(true);
      setSaveMessage("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      setTimeout(() => setSaved(false), 3500);
    },
  });

  const regenerateBrandDnaMutation = useMutation({
    mutationFn: async () => {
      const paletteList = brandColors
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.startsWith("#"));

      const payload = {
        company_name: businessName,
        industry,
        primary_goal: primaryGoal,
        business_description: brandDescription,
        target_audience: targetAudience,
        tone_keywords: toneKeywords,
        color_palette: paletteList.length > 0 ? paletteList : ["#0D2137", "#2B7BC4"],
        topics_to_avoid: topicsToAvoid,
      };

      return await request<{ brand_dna: any; brand_summary: string }>(
        "/api/v1/portal/brand-dna/regenerate",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
    onSuccess: (data) => {
      setAiSummary(data.brand_summary || data.brand_dna?.ai_summary_line || "");
      setAiPersona(data.brand_dna?.audience_persona || "");
      setContentThemes(data.brand_dna?.content_themes || []);
      setSaved(true);
      setSaveMessage("Brand Strategy regenerated successfully!");
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      setTimeout(() => setSaved(false), 3500);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match.");
      }
      return await request<{ status: string; message: string }>("/api/v1/portal/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
    },
    onSuccess: (res) => {
      if (res.status === "error") {
        setPasswordMsg({ type: "error", text: res.message });
      } else {
        setPasswordMsg({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMsg(null), 4000);
      }
    },
    onError: (err: any) => {
      setPasswordMsg({ type: "error", text: err.message || "Failed to update password." });
    },
  });

  const toggle2FAMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await request<{ status: string; two_fa_enabled: boolean }>("/api/v1/portal/2fa", {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: (res) => {
      setTwoFactorEnabled(res.two_fa_enabled);
      setSaved(true);
      setSaveMessage(res.two_fa_enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const connectInstagramMutation = useMutation({
    mutationFn: async (handle: string) => {
      return await request<{ status: string; instagram_connected: boolean; instagram_username: string }>(
        "/api/v1/portal/integrations/instagram/connect",
        {
          method: "POST",
          body: JSON.stringify({ username: handle }),
        }
      );
    },
    onSuccess: (res) => {
      setIgConnected(true);
      setIgUsername(res.instagram_username);
      setShowConnectModal(false);
      setSaved(true);
      setSaveMessage("Instagram Business account connected!");
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      setTimeout(() => setSaved(false), 3500);
    },
  });

  const disconnectInstagramMutation = useMutation({
    mutationFn: async () => {
      return await request<{ status: string }>("/api/v1/portal/integrations/instagram", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      setIgConnected(false);
      setIgUsername("");
      setSaved(true);
      setSaveMessage("Instagram account disconnected.");
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      setTimeout(() => setSaved(false), 3500);
    },
  });

  const handleSaveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      full_name: fullName,
      company_name: businessName,
      phone,
      instagram_username: instagram,
      brand_dna: {
        ...(profile?.brand_dna || {}),
        website,
        phone,
      },
    });
  };

  const handleSaveBrandProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const paletteList = brandColors
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.startsWith("#"));

    updateProfileMutation.mutate({
      company_name: businessName,
      brand_summary: aiSummary || brandDescription,
      brand_dna: {
        ...(profile?.brand_dna || {}),
        industry,
        primary_goal: primaryGoal,
        business_description: brandDescription,
        target_audience: targetAudience,
        tone: toneKeywords.join(", "),
        palette: paletteList,
        audience_persona: aiPersona,
        content_themes: contentThemes,
      },
      questionnaire_answers: {
        industry,
        primary_goal: primaryGoal,
        business_description: brandDescription,
        target_audience: targetAudience,
        tone_keywords: toneKeywords,
        color_palette: paletteList,
        topics_to_avoid: topicsToAvoid,
      },
    });
  };

  const toggleTone = (tone: string) => {
    setToneKeywords((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5 animate-page-in pb-6">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="border-b border-border pb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
          Brand Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your business identity, AI brand guidelines, security controls, and social channel integrations.
        </p>
      </div>

      {/* ── Tab Navigation (4 Tabs exactly as in Creo) ─────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs max-w-full overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("business")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "business"
              ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("brand")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "brand"
              ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>Brand Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Shield className="size-3.5" />
          <span>Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "integrations"
              ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Link2 className="size-3.5" />
          <span>Integrations</span>
          {igConnected && (
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-6 text-[#2B7BC4] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Global Alert Notification */}
          {saved && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* ── TAB 1: Business Profile ──────────────────────────────────────── */}
          {activeTab === "business" && (
            <form onSubmit={handleSaveBusinessProfile} className="space-y-5">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                    <Building2 className="size-4" />
                    Company & Contact Information
                  </h3>
                  <span className="text-[11px] text-slate-400">Official business registration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <User className="size-3 text-slate-400" />
                      Account Contact Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      placeholder="e.g. Ashok Kumar"
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Business / Company Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      placeholder="e.g. Apex Studio"
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Authorized Contact Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || profile?.email || ""}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="size-3 text-slate-400" />
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      placeholder="+91 98765 43210"
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Instagram className="size-3.5 text-pink-500" />
                      Instagram Business Handle
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      placeholder="@yourbrand"
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Globe className="size-3.5 text-[#2B7BC4]" />
                      Official Website / Store URL
                    </label>
                    <input
                      type="text"
                      value={website}
                      placeholder="https://yourwebsite.com"
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Business Profile
                </button>
              </div>
            </form>
          )}

          {/* ── TAB 2: Brand Profile ─────────────────────────────────────────── */}
          {activeTab === "brand" && (
            <form onSubmit={handleSaveBrandProfile} className="space-y-6">
              {/* AI Brand Strategy Live Card */}
              <div className="rounded-2xl border-2 border-[#2B7BC4]/30 bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#C9DFF0]/60">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] flex items-center justify-center text-white">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-sm sm:text-base text-[#0D2137]">
                        AI Strategic Brand Positioning
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Synthesized by Creo Strategic AI based on your intake responses
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => regenerateBrandDnaMutation.mutate()}
                    disabled={regenerateBrandDnaMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#C9DFF0] text-xs font-bold text-[#2B7BC4] hover:bg-[#F0F7FD] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {regenerateBrandDnaMutation.isPending ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Regenerating…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5 text-amber-500" />
                        <span>Regenerate Strategy with AI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#C9DFF0] shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2B7BC4] block mb-1">
                    Positioning Headline
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-[#0D2137] leading-relaxed">
                    &ldquo;{aiSummary || "Premium strategic brand voice tailored for maximum audience retention and conversion."}&rdquo;
                  </p>
                </div>

                {aiPersona && (
                  <div className="mt-3 p-3.5 rounded-xl bg-white border border-[#C9DFF0] shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Audience Persona Profile
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{aiPersona}</p>
                  </div>
                )}

                {contentThemes && contentThemes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {contentThemes.map((theme) => (
                      <span
                        key={theme}
                        className="px-2.5 py-1 rounded-lg bg-[#E8F4FD] text-[#0D2137] border border-[#C9DFF0] text-[11px] font-semibold"
                      >
                        🎯 {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable Brand Questionnaire Fields */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                  <Sliders className="size-4" />
                  Brand Identity & Questionnaire Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Industry Sector
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Tech & SaaS"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Primary Content Objective
                    </label>
                    <select
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none cursor-pointer"
                    >
                      {GOAL_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Business Description & Core Value Proposition
                  </label>
                  <textarea
                    rows={3}
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    placeholder="Describe what your brand does, key services, and competitive advantages..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Audience Demographics
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Modern consumers, young professionals and founders aged 24–40"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                  />
                </div>

                {/* Tone Keywords */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Brand Tone Keywords
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONE_OPTIONS.map((tone) => {
                      const active = toneKeywords.includes(tone);
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toggleTone(tone)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-[#2B7BC4] text-white shadow-2xs border border-[#2B7BC4]"
                              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-white"
                          }`}
                        >
                          {tone}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Brand Color Palette (Comma-Separated Hex Codes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={brandColors}
                      onChange={(e) => setBrandColors(e.target.value)}
                      placeholder="#0D2137, #2B7BC4, #059669"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none font-mono"
                    />
                    <div className="flex items-center gap-1.5">
                      {brandColors
                        .split(",")
                        .map((c) => c.trim())
                        .filter((c) => c.startsWith("#"))
                        .map((c) => (
                          <span
                            key={c}
                            className="size-6 rounded-md border border-black/10 shadow-2xs shrink-0"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Style References & Visual Benchmarks
                    </label>
                    <input
                      type="text"
                      value={styleReferences}
                      onChange={(e) => setStyleReferences(e.target.value)}
                      placeholder="@apple, minimalist editorial"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Topics or Angles to Avoid
                    </label>
                    <input
                      type="text"
                      value={topicsToAvoid}
                      onChange={(e) => setTopicsToAvoid(e.target.value)}
                      placeholder="e.g. Overly corporate jargon"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Brand Profile
                </button>
              </div>
            </form>
          )}

          {/* ── TAB 3: Security & Session ────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Change Password Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                    <Lock className="size-4" />
                    Change Password
                  </h3>
                  <span className="text-[11px] text-slate-400">Protect your creative workspace</span>
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold ${
                      passwordMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}

                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => changePasswordMutation.mutate()}
                    disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {changePasswordMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </div>

              {/* Two-Factor Authentication Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0D2137]">Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                    Require OTP verification on each sign-in attempt to prevent unauthorized access.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggle2FAMutation.mutate(!twoFactorEnabled)}
                  disabled={toggle2FAMutation.isPending}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    twoFactorEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Session Security Details */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-3 text-xs text-slate-600">
                <h4 className="text-sm font-bold text-[#0D2137]">Active Authentication Security</h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p>
                    <span className="font-bold text-slate-800">Session Mode:</span> JWT HTTP-Only Bearer Tokens with automated rotation.
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">Authorized Account:</span> {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Integrations (Instagram Business - The 4th tab from creo) */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              {/* Instagram Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                        igConnected
                          ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Camera className="size-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#0D2137]">
                          Instagram Business Account
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            igConnected
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {igConnected ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                        {igConnected
                          ? `Connected as ${igUsername || "@yourbrand"}. Approved reels, carousels, and stories can be published automatically.`
                          : "Connect your Instagram Business account to enable direct, automated publishing of approved client deliverables."}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {igConnected ? (
                      <button
                        type="button"
                        onClick={() => disconnectInstagramMutation.mutate()}
                        disabled={disconnectInstagramMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {disconnectInstagramMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unlink className="size-3.5" />
                        )}
                        <span>Disconnect Account</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConnectIgInput(instagram || "@yourbrand");
                          setShowConnectModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold shadow-sm shadow-pink-500/20 transition-all cursor-pointer"
                      >
                        <Camera className="size-3.5" />
                        <span>Connect Instagram Business</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* API Publish Safety Quota Info */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Meta Graph API Quota
                    </span>
                    <p className="font-bold text-slate-800">25 Posts / 24 Hours (Standard Tier)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Supported Media
                    </span>
                    <p className="font-bold text-slate-800">Reels (9:16), Carousels, Stories</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Connect Modal */}
          {showConnectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center">
                      <Camera className="size-4" />
                    </div>
                    <h4 className="font-bold text-sm text-[#0D2137]">Connect Instagram Business</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Link your verified Instagram handle. In development / testing mode, this enables automatic
                  post dispatch and container creation for your creative schedule.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Instagram Business Handle
                  </label>
                  <input
                    type="text"
                    value={connectIgInput}
                    onChange={(e) => setConnectIgInput(e.target.value)}
                    placeholder="@yourbrand"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => connectInstagramMutation.mutate(connectIgInput)}
                    disabled={connectInstagramMutation.isPending || !connectIgInput.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {connectInstagramMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>Authorize & Link</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PortalAccountPage;
