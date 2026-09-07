import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import {
  Building2,
  Instagram,
  Globe,
  Palette,
  Save,
  CheckCircle2,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ProfileResponse {
  full_name: string;
  email: string;
  company_name: string;
  instagram_username: string;
  brand_summary: string;
  brand_dna: Record<string, any>;
}

export function PortalAccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"business" | "brand" | "security">("business");

  const [businessName, setBusinessName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [brandColors, setBrandColors] = useState("");
  const [usp, setUsp] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileResponse>({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request<ProfileResponse>("/api/v1/portal/profile"),
  });

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.company_name || "");
      setInstagram(profile.instagram_username || "");
      setWebsite(profile.brand_dna?.website || "");
      setBrandColors(profile.brand_dna?.brand_colors || "");
      setUsp(profile.brand_summary || profile.brand_dna?.usp || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: {
      company_name: string;
      instagram_username: string;
      brand_summary: string;
      brand_dna: Record<string, any>;
    }) => {
      return await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      setTimeout(() => setSaved(false), 3500);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      company_name: businessName,
      instagram_username: instagram,
      brand_summary: usp,
      brand_dna: {
        website,
        brand_colors: brandColors,
        usp,
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-page-in">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0D2137] tracking-tight">
          Brand Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your business identity, AI brand guidelines, and social channel integrations.
        </p>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs max-w-full overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("business")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "business"
              ? "bg-[#2B7BC4] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 className="size-3.5" />
          Business Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("brand")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "brand"
              ? "bg-[#2B7BC4] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="size-3.5" />
          Brand Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-[#2B7BC4] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Shield className="size-3.5" />
          Security
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-6 text-[#2B7BC4] animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === "business" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                <Building2 className="size-4" />
                Company Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Business / Brand Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    placeholder="e.g. Apex Studio"
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authorized Contact Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || profile?.email || ""}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Instagram className="size-3.5 text-pink-500" />
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    placeholder="@yourhandle"
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Globe className="size-3.5 text-[#2B7BC4]" />
                    Official Website
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
          )}

          {activeTab === "brand" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                <Palette className="size-4" />
                Creative Guidelines & Voice
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Brand Colors (Hex Codes)
                </label>
                <input
                  type="text"
                  value={brandColors}
                  placeholder="#2B7BC4, #0EA5E9, #FAF0E6"
                  onChange={(e) => setBrandColors(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Comma-separated hex values used for templates and subtitles.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Core Value Proposition / Brand Hook
                </label>
                <textarea
                  rows={3}
                  value={usp}
                  placeholder="Describe your brand positioning, core offering, or target demographic."
                  onChange={(e) => setUsp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
                <Shield className="size-4" />
                Security & Session
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <p>Session authentication is enforced with secure HTTP-only cookies and token rotation.</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-semibold text-slate-800">Password updates:</span> Contact your account manager or request a password reset via the login screen.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="size-4" />
                Settings saved successfully
              </span>
            )}
            {!saved && <div />}

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2B7BC4] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#2B7BC4]/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
