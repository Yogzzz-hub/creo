import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useSearchParams } from "react-router";
import { request } from "../../lib/http";
import { Instagram, Upload, Palette } from "lucide-react";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

export function PortalAccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "settings";

  const { data: profile } = useQuery<any>({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request("/api/v1/portal/profile"),
  });

  // Profile, security and notification settings stay available during setup;
  // only the Brand DNA tabs depend on a finished onboarding.
  const gate = useOnboardingGate();
  const isBrandTab = tab === "brand" || tab === "edit-brand";

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      alert("Changes saved successfully!");
    },
  });

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    brandName: "",
    igHandle: "",
    whatYouSell: "",
    voiceWords: [] as string[],
    audience: "",
    competitors: "",
    colors: ["#D8BF9B", "#161F2D", "#0B111C", "#7FA0D6"],
  });

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        name: profile.full_name || user?.full_name || "",
        company: profile.company_name || user?.company_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        brandName: profile.company_name || "",
        igHandle: profile.instagram_username || "",
        whatYouSell: profile.brand_dna?.summary_line || "",
        audience: profile.brand_dna?.target_audience || "",
        voiceWords: profile.brand_dna?.tone_keywords || ["Warm", "Craft-first", "Local"],
      }));
    }
  }, [profile, user]);

  const handleSaveSettings = () => {
    updateProfileMutation.mutate({
      full_name: form.name,
      company_name: form.company,
      phone: form.phone,
    });
  };

  const handleSaveBrandDNA = () => {
    updateProfileMutation.mutate({
      company_name: form.brandName,
      instagram_username: form.igHandle,
      brand_dna: {
        ...(profile?.brand_dna || {}),
        summary_line: form.whatYouSell,
        target_audience: form.audience,
        tone_keywords: form.voiceWords,
        palette: form.colors,
      }
    });
    setSearchParams({ tab: "brand" });
  };

  const toggleVoiceWord = (word: string) => {
    setForm((prev) => ({
      ...prev,
      voiceWords: prev.voiceWords.includes(word)
        ? prev.voiceWords.filter((w) => w !== word)
        : [...prev.voiceWords, word],
    }));
  };

  const updateColor = (idx: number, hex: string) => {
    const newColors = [...form.colors];
    newColors[idx] = hex;
    setForm((prev) => ({ ...prev, colors: newColors }));
  };

  if (!gate.isComplete && isBrandTab) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Brand DNA Locked"
          description="Complete your onboarding setup to manage your brand DNA, visual assets, and brand guidelines."
        />
      </div>
    );
  }

  if (tab === "edit-brand") {
    return (
      <div className="animate-in fade-in duration-500 max-w-2xl">
        <h1 className="text-3xl font-semibold text-white mb-6">Edit Brand DNA</h1>

        <div className="flex gap-6">
          <div className="flex-1 bg-nebula-surface border border-nebula-steel rounded-[24px] p-8 space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-white mb-2">Brand name</label>
                <input type="text" value={form.brandName} onChange={(e) => setForm({...form, brandName: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-white mb-2">Instagram handle</label>
                <input type="text" value={form.igHandle} onChange={(e) => setForm({...form, igHandle: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">What do you sell, in one line?</label>
              <input type="text" value={form.whatYouSell} onChange={(e) => setForm({...form, whatYouSell: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="e.g. Premium sustainable activewear and performance essentials." />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">Pick three words for your voice</label>
              <div className="flex flex-wrap gap-2">
                {["Warm", "Playful", "Premium", "Craft-first", "Bold", "Minimal", "Local", "Witty"].map(word => (
                  <button key={word} onClick={() => toggleVoiceWord(word)} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${form.voiceWords.includes(word) ? "bg-[#BCCCE6] text-[#0B111C]" : "bg-white/[0.05] text-white hover:bg-white/[0.1]"}`}>
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">Who buys from you?</label>
              <textarea rows={2} value={form.audience} onChange={(e) => setForm({...form, audience: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-white/[0.2]" placeholder="e.g. Urban professionals aged 25-40, fitness and wellness enthusiasts." />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">Two or three brands you admire (or compete with)</label>
              <input type="text" value={form.competitors} onChange={(e) => setForm({...form, competitors: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="e.g. @brandone, @brandtwo" />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">Brand Colors</label>
              <div className="flex gap-4">
                {form.colors.map((color, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded-lg border border-white/[0.1] overflow-hidden cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => updateColor(idx, e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" 
                    />
                    <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: color }} />
                    <Palette className="w-4 h-4 text-white/50 z-0 drop-shadow-md" />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-white/[0.1] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/[0.2] transition-colors">
              <Upload className="w-5 h-5 text-nebula-mist mb-3" />
              <p className="text-[13px] font-bold text-white mb-1">Drop your logo, fonts and product photos</p>
              <p className="text-xs text-nebula-mist">Optional now, you can add them later in Brand DNA</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-nebula-mist">Saved automatically</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSearchParams({ tab: "brand" })} className="px-5 py-2.5 rounded-full border border-nebula-steel text-[13px] font-bold text-white hover:bg-nebula-surface transition-colors">
                  Back
                </button>
                <button onClick={handleSaveBrandDNA} className="px-5 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors flex items-center justify-center">
                  {updateProfileMutation.isPending ? "Saving..." : "Save and continue"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (tab === "brand") {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold text-nebula-mist uppercase tracking-[0.15em] mb-1">
              VERSION 3 · UPDATED BY YOU ON 2 SEP
            </p>
            <h1 className="text-3xl font-semibold text-white">Brand DNA</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-full border border-nebula-steel text-[13px] font-bold text-white hover:bg-nebula-surface transition-colors">
              Version history
            </button>
            <button onClick={() => setSearchParams({ tab: "edit-brand" })} className="px-5 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors">
              Suggest an edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
              <h3 className="text-[15px] font-bold text-white mb-4">Voice</h3>
              <p className="text-[13px] text-nebula-mist mb-5 leading-relaxed">
                {profile?.brand_dna?.summary_line || form.whatYouSell || "Strategic, engaging, and aligned with your target audience brand guidelines."}
              </p>
              <div className="flex flex-wrap gap-2">
                {((profile?.brand_dna?.tone?.voice_words || form.voiceWords) as string[])?.map((word: string) => (
                  <span key={word} className="px-3 py-1.5 rounded-lg border border-nebula-steel text-[13px] font-medium text-white">{word}</span>
                ))}
              </div>
            </div>

            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8 flex flex-col gap-6">
              <div className="flex-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-nebula-mist mb-2">MAIN AUDIENCE</h3>
                <p className="text-[13px] text-white leading-relaxed">
                  {profile?.brand_dna?.audience_segments?.[0]?.description || form.audience || profile?.brand_dna?.target_audience || "Target customer demographic and core audience segment."}
                </p>
              </div>
              <div className="flex-1 pt-6 border-t border-nebula-steel">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-nebula-mist mb-2">CORE PAIN POINTS & WHAT THEY CARE ABOUT</h3>
                <p className="text-[13px] text-white leading-relaxed">
                  {profile?.brand_dna?.audience_segments?.[0]?.core_pain_point || profile?.brand_dna?.value_propositions || "Authenticity, product quality, value proposition, and brand reliability."}
                </p>
              </div>
            </div>

            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
              <h3 className="text-[15px] font-bold text-white mb-6">Do & don't</h3>
              <div className="flex gap-8">
                <div className="flex-1 space-y-3">
                  <h4 className="text-[13px] font-bold text-white">Do</h4>
                  <ul className="text-[13px] text-nebula-mist space-y-2 list-disc list-inside">
                    {profile?.brand_dna?.tone?.writing_rules?.length > 0 ? (
                      profile.brand_dna.tone.writing_rules.map((item: string, i: number) => <li key={i} className="leading-snug">{item}</li>)
                    ) : (
                      <>
                        <li>Highlight clear product value & storytelling</li>
                        <li>Consistent brand palette & typography</li>
                        <li>High-definition native vertical formats</li>
                      </>
                    )}
                  </ul>
                </div>
                <div className="flex-1 space-y-3">
                  <h4 className="text-[13px] font-bold text-[#F87171]">Don't</h4>
                  <ul className="text-[13px] text-nebula-mist space-y-2 list-disc list-inside">
                    {(profile?.brand_dna?.guidelines?.donts?.length > 0 || profile?.brand_dna?.do_not?.length > 0) ? (
                      (profile.brand_dna.guidelines?.donts || profile.brand_dna.do_not).map((item: string, i: number) => <li key={i} className="leading-snug">{item}</li>)
                    ) : (
                      <>
                        <li>Generic stock photos without custom grading</li>
                        <li>Cluttered typography or off-palette overlays</li>
                        <li>Unclear or missing calls to action</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
              <h3 className="text-[15px] font-bold text-white mb-6">Palette</h3>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {form.colors.map((hex, idx) => (
                  <div key={idx}>
                    <div className="w-full aspect-[4/3] rounded-lg mb-2 border border-nebula-steel" style={{ backgroundColor: hex || "#161F2D" }} />
                    <p className="text-xs font-bold text-white">Color {idx + 1}</p>
                    <p className="text-[11px] text-nebula-mist uppercase">{hex || "None"}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-nebula-steel">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-nebula-mist mb-1">TYPE</h3>
                <p className="text-[13px] text-nebula-mist">
                  Headlines: {profile?.brand_dna?.typography?.headline || "Inter"} · Body: {profile?.brand_dna?.typography?.body || "Inter"}
                </p>
              </div>
            </div>

            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
              <h3 className="text-[15px] font-bold text-white mb-5">High-Performing Hooks</h3>
              <div className="space-y-2">
                {profile?.brand_dna?.hooks && profile.brand_dna.hooks.length > 0 ? (
                  profile.brand_dna.hooks.map((hook: string, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-nebula-steel last:border-0 last:pb-0">
                      <p className="text-[13px] text-white flex-1 leading-relaxed">"{hook}"</p>
                      <span className="px-2 py-0.5 rounded bg-[#7FA0D6]/15 text-nebula-periwinkle text-[11px] font-bold whitespace-nowrap">approved</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-nebula-mist py-2">
                    Campaign hook angles and high-CTR concepts generated during sprints will appear here.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
              <h3 className="text-[15px] font-bold text-white mb-5">Brand Files</h3>
              <div className="space-y-2 mb-5">
                {profile?.brand_dna?.files && profile.brand_dna.files.length > 0 ? (
                  profile.brand_dna.files.map((file: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-[13px]">
                      <span className="text-nebula-mist">{file.name || `Asset-${idx + 1}`}</span>
                      <span className="text-nebula-mist text-xs">{file.size || "Ready"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-nebula-mist py-2">
                    No brand files or logo packs uploaded yet.
                  </p>
                )}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] text-white text-[13px] font-medium hover:bg-white/[0.08] transition-colors">
                <Upload className="w-4 h-4" /> Upload files
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Settings Tab
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold text-nebula-mist uppercase tracking-[0.15em] mb-1">
            ACCOUNT
          </p>
          <h1 className="text-3xl font-semibold text-white">Settings</h1>
        </div>
        <button onClick={handleSaveSettings} className="px-5 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors">
          {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="space-y-6">
          
          <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
            <h3 className="text-[15px] font-bold text-white mb-5">Profile</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] text-nebula-mist mb-2">Your name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="[Owner name]" />
              </div>
              <div>
                <label className="block text-[13px] text-nebula-mist mb-2">Company</label>
                <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="Company Name" />
              </div>
              <div>
                <label className="block text-[13px] text-nebula-mist mb-2">Work email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="Email address" />
              </div>
              <div>
                <label className="block text-[13px] text-nebula-mist mb-2">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-nebula-navy border border-nebula-steel rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2]" placeholder="[+91 ...]" />
              </div>
            </div>
          </div>

          <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
            <h3 className="text-[15px] font-bold text-white mb-5">Instagram Integration</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-nebula-steel flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-nebula-mist" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-0.5">Automated Publishing</h4>
                  <p className="text-xs text-nebula-mist">Direct Instagram Graph API publishing will activate when Meta approval completes.</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-nebula-navy border border-nebula-steel text-nebula-mist text-xs font-semibold whitespace-nowrap">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
            <h3 className="text-[15px] font-bold text-white mb-5">Team access</h3>
            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-white">[{form.name || "Owner name"}] · <span className="text-nebula-mist">owner</span></span>
                <span className="px-3 py-1 rounded-full bg-white/[0.08] text-white text-xs font-bold">Admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-nebula-mist">Marketing manager</span>
                <button
                  type="button"
                  onClick={() => alert("Team invitation sent!")}
                  className="px-4 py-1.5 rounded-full border border-nebula-steel text-white text-[13px] font-bold hover:bg-nebula-surface transition-colors cursor-pointer"
                >
                  Invite
                </button>
              </div>
            </div>
            <p className="text-xs text-nebula-mist">Invited people can review and comment; only admins can approve and pay.</p>
          </div>
          
        </div>

        <div className="space-y-6">
          <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
            <h3 className="text-[15px] font-bold text-white mb-6">Notifications</h3>
            <div className="space-y-6">
              {[
                { key: "emailBatch", label: "Email me when a batch is ready", defaultOn: true },
                { key: "whatsappReminder", label: "WhatsApp reminder the day before a review is due", defaultOn: true },
                { key: "weeklySummary", label: "Weekly summary every Monday", defaultOn: false },
                { key: "billingEmails", label: "Billing emails", defaultOn: true },
              ].map((notif, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] text-white">{notif.label}</span>
                  <div
                    onClick={() => {
                      alert(`Notification setting "${notif.label}" updated.`);
                    }}
                    className={`w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${
                      notif.defaultOn ? "bg-[#7FA0D6]" : "bg-white/[0.1]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        notif.defaultOn ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-nebula-surface border border-nebula-steel rounded-[24px] p-6 lg:p-8">
            <h3 className="text-[15px] font-bold text-white mb-6">Security & Authentication</h3>
            <div className="space-y-5 mb-6">
              <div className="flex items-center justify-between border-b border-nebula-steel pb-5">
                <div>
                  <span className="text-[13px] text-white block">Password Reset</span>
                  <span className="text-xs text-nebula-mist">Sends secure reset link to your email</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Password reset link sent to ${form.email || user?.email}`)}
                  className="px-4 py-1.5 rounded-full border border-nebula-steel text-white text-[13px] font-bold hover:bg-nebula-surface transition-colors cursor-pointer"
                >
                  Reset password
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-nebula-steel pb-5">
                <div>
                  <span className="text-[13px] text-white block">2-Step Verification</span>
                  <span className="text-xs text-nebula-mist">Protected by OAuth / Session tokens</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-bold">
                  Enforced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-white">Active Sessions</span>
                <span className="text-[13px] text-nebula-mist">Current Session</span>
              </div>
            </div>
            <p className="text-xs text-nebula-mist">Authentication credentials are encrypted using Fernet AES-256 tokens.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
