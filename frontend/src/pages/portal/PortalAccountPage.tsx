import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useSearchParams } from "react-router";
import { request } from "../../lib/http";
import {
  Instagram,
  CheckCircle2,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Zap,
  Clock,
  ShieldCheck,
  ArrowRight,
  Info,
  UploadCloud,
  Download,
  Plus,
  FileText,
  Image as ImageIcon,
  Upload,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  RotateCcw
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
  assigned_team?: Array<{
    id: string;
    name: string;
    email: string;
    raw_role: string;
    role: string;
    is_primary?: boolean;
  }>;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class TabErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TabErrorBoundary caught an error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="card-surface p-8 border border-rose-200 bg-rose-50/50 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <X className="size-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || "Unable to display this section"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              A data formatting issue occurred while loading this section. You can refresh or reset it below.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl hover:bg-[#0045D8] transition-all shadow-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const BRAND_TONE_KEYWORDS = [
  "Professional",
  "Innovative",
  "Direct",
  "Confident",
  "Playful",
  "Casual",
  "Luxury",
];

function extractAudienceSegments(dna: Record<string, any> = {}, answers: Record<string, any> = {}): string[] {
  const raw = dna?.audience_segments || answers?.audience_segments || dna?.target_audience || answers?.target_audience;
  if (!raw) {
    return ["B2B Tech Leaders", "Enterprise Marketers", "SaaS Founders"];
  }
  if (Array.isArray(raw)) {
    const list = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return (item.name || item.title || item.label || item.description || "").trim();
        }
        return String(item || "").trim();
      })
      .filter((s) => s.length > 0);
    return list.length > 0 ? list : ["B2B Tech Leaders", "Enterprise Marketers", "SaaS Founders"];
  }
  if (typeof raw === "string") {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : ["B2B Tech Leaders", "Enterprise Marketers", "SaaS Founders"];
  }
  return ["B2B Tech Leaders", "Enterprise Marketers", "SaaS Founders"];
}

function extractToneKeywords(dna: Record<string, any> = {}, answers: Record<string, any> = {}): string[] {
  let raw: any = dna?.tone_keywords || answers?.tone_keywords;
  if (!raw && Array.isArray(dna?.tone?.voice_words)) {
    raw = dna.tone.voice_words;
  }
  if (!raw && typeof dna?.tone === "string") {
    raw = dna.tone;
  }
  if (!raw) {
    return ["Professional", "Innovative", "Direct", "Confident"];
  }
  if (Array.isArray(raw)) {
    const list = raw
      .map((item) => {
        const str = typeof item === "string" ? item.trim() : String(item?.name || item || "").trim();
        return str.charAt(0).toUpperCase() + str.slice(1);
      })
      .filter(Boolean);
    return list.length > 0 ? list : ["Professional", "Innovative", "Direct", "Confident"];
  }
  if (typeof raw === "string") {
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .filter(Boolean);
    return list.length > 0 ? list : ["Professional", "Innovative", "Direct", "Confident"];
  }
  return ["Professional", "Innovative", "Direct", "Confident"];
}

function extractColorSwatches(dna: Record<string, any> = {}, answers: Record<string, any> = {}): Array<{ id: string; label: string; hex: string }> {
  let list: string[] = [];
  if (Array.isArray(dna?.color_swatches) && dna.color_swatches.length > 0) {
    return dna.color_swatches.map((item: any, idx: number) => {
      if (typeof item === "string") {
        const hex = item.trim().startsWith("#") ? item.trim() : `#${item.trim()}`;
        return {
          id: String(idx + 1),
          label: idx === 0 ? "Primary Brand" : idx === 1 ? "Secondary Accent" : idx === 2 ? "Dark Neutral" : `Color ${idx + 1}`,
          hex: hex.toUpperCase(),
        };
      }
      const rawHex = String(item?.hex || item?.color || "#0551E5").trim();
      const hex = rawHex.startsWith("#") ? rawHex : `#${rawHex}`;
      return {
        id: String(item?.id || idx + 1),
        label: String(item?.label || (idx === 0 ? "Primary Brand" : idx === 1 ? "Secondary Accent" : `Color ${idx + 1}`)),
        hex: hex.toUpperCase(),
      };
    });
  }

  if (Array.isArray(dna?.palette) && dna.palette.length > 0) {
    list = dna.palette;
  } else if (Array.isArray(dna?.visual_direction?.primary_colors) && dna.visual_direction.primary_colors.length > 0) {
    list = dna.visual_direction.primary_colors;
  } else if (Array.isArray(answers?.hex_codes) && answers.hex_codes.length > 0) {
    list = answers.hex_codes;
  }

  if (list.length > 0) {
    return list.map((colorStr, idx) => {
      const hex = colorStr.trim().startsWith("#") ? colorStr.trim() : `#${colorStr.trim()}`;
      return {
        id: String(idx + 1),
        label: idx === 0 ? "Primary Brand" : idx === 1 ? "Secondary Accent" : idx === 2 ? "Dark Neutral" : `Color ${idx + 1}`,
        hex: hex.toUpperCase(),
      };
    });
  }

  return [
    { id: "1", label: "Primary Brand", hex: "#0551E5" },
    { id: "2", label: "Secondary Accent", hex: "#D1FADF" },
    { id: "3", label: "Dark Neutral", hex: "#101828" },
  ];
}

export function PortalAccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as "business" | "brand" | "security" | "integrations" | "pod";
  const [activeTab, setActiveTabState] = useState<"business" | "brand" | "security" | "integrations" | "pod">(tabFromUrl || "business");

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const setActiveTab = (tab: "business" | "brand" | "security" | "integrations" | "pod") => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  // Tab 1: Business Profile Fields
  const [fullName, setFullName] = useState("David K.");
  const [roleTitle, setRoleTitle] = useState("VP of Marketing");
  const [businessName, setBusinessName] = useState("Northwind Labs Inc.");
  const [phone, setPhone] = useState("+1 415 890-2410");
  const [location, setLocation] = useState("San Francisco, CA");
  const [instagram, setInstagram] = useState("@northwindlabs");
  const [website, setWebsite] = useState("https://www.northwindlabs.com");
  const [taxId, setTaxId] = useState("US-94-3829104");
  const [address, setAddress] = useState("440 Brannan St, Suite 300, San Francisco, CA 94107");
  const [billingEmail, setBillingEmail] = useState("billing@northwindlabs.com");

  // Tab 2: Brand Profile Fields
  const [industry, setIndustry] = useState("Tech & SaaS");
  const [primaryGoal, setPrimaryGoal] = useState("Brand Awareness");
  const [_brandDescription, setBrandDescription] = useState("");
  const [brandVision, setBrandVision] = useState("To lead sustainable innovation in enterprise SaaS software and empower creative teams with automated agility.");
  const [missionStatement, setMissionStatement] = useState("Describe what problem your company solves and why customers choose you over legacy alternatives. Deliver high-fidelity design execution at scale while eliminating operational friction.");
  const [_targetAudience, setTargetAudience] = useState("");
  const [audienceSegments, setAudienceSegments] = useState<string[]>([
    "B2B Tech Leaders",
    "Enterprise Marketers",
    "SaaS Founders"
  ]);
  const [newAudienceInput, setNewAudienceInput] = useState("");
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [toneKeywords, setToneKeywords] = useState<string[]>([
    "Professional",
    "Innovative",
    "Direct",
    "Confident"
  ]);
  const [_brandColors, setBrandColors] = useState("#0D2137, #2B7BC4, #059669");
  const [colorSwatches, setColorSwatches] = useState<{ id: string; label: string; hex: string }[]>([
    { id: "1", label: "Primary Brand", hex: "#0551E5" },
    { id: "2", label: "Secondary Accent", hex: "#D1FADF" },
    { id: "3", label: "Dark Neutral", hex: "#101828" },
  ]);
  const [uploadedAssets, setUploadedAssets] = useState<{ id: string; name: string; size: string; type: "image" | "pdf"; status: string }[]>([
    { id: "1", name: "Primary_Logo_Dark.svg", size: "24 KB", type: "image", status: "Uploaded" },
    { id: "2", name: "Brand_Style_Guide_2026.pdf", size: "4.8 MB", type: "pdf", status: "Uploaded" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState("Last saved 2 hours ago");
  const [showExportToast, setShowExportToast] = useState(false);
  const [_styleReferences, _setStyleReferences] = useState("");
  const [topicsToAvoid, setTopicsToAvoid] = useState("");
  const [_aiSummary, setAiSummary] = useState("");
  const [aiPersona, setAiPersona] = useState("");
  const [contentThemes, setContentThemes] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
      const dna = profile.brand_dna || {};
      setFullName(profile.full_name || "David K.");
      setRoleTitle(dna.role_title || "VP of Marketing");
      setBusinessName(profile.company_name || "Northwind Labs Inc.");
      setPhone(profile.phone || "+1 415 890-2410");
      setLocation(dna.location || "San Francisco, CA");
      setInstagram(profile.instagram_username || "@northwindlabs");
      setWebsite(dna.website || "https://www.northwindlabs.com");
      setTaxId(dna.tax_id || "US-94-3829104");
      setAddress(dna.address || "440 Brannan St, Suite 300, San Francisco, CA 94107");
      setBillingEmail(dna.billing_email || profile.email || user?.email || "billing@northwindlabs.com");

      // Brand details
      const answers = profile.questionnaire_answers || {};

      setIndustry(String(answers.industry || dna.industry || "Tech & SaaS"));
      setPrimaryGoal(String(answers.primary_goal || dna.primary_goal || "Brand Awareness"));
      
      const initialVision = String(
        dna.brand_vision ||
        answers.business_description ||
        dna.business_description ||
        dna.summary_line ||
        dna.positioning ||
        profile.brand_summary ||
        "To lead sustainable innovation in enterprise SaaS software and empower creative teams with automated agility."
      );
      setBrandVision(initialVision);
      setBrandDescription(initialVision);
      
      const initialMission = String(
        dna.mission_statement ||
        dna.positioning ||
        "Describe what problem your company solves and why customers choose you over legacy alternatives. Deliver high-fidelity design execution at scale while eliminating operational friction."
      );
      setMissionStatement(initialMission);

      setTargetAudience(String(answers.target_audience || dna.target_audience || ""));
      setAudienceSegments(extractAudienceSegments(dna, answers));
      setToneKeywords(extractToneKeywords(dna, answers));
      setColorSwatches(extractColorSwatches(dna, answers));

      if (Array.isArray(dna.visual_direction?.primary_colors) && dna.visual_direction.primary_colors.length > 0) {
        setBrandColors(dna.visual_direction.primary_colors.join(", "));
      } else if (Array.isArray(dna.palette) && dna.palette.length > 0) {
        setBrandColors(dna.palette.join(", "));
      } else if (dna.brand_colors) {
        setBrandColors(String(dna.brand_colors));
      }

      _setStyleReferences(Array.isArray(answers.style_references) ? answers.style_references.join(", ") : "");
      setTopicsToAvoid(String(answers.topics_to_avoid || ""));
      setAiSummary(String(profile.brand_summary || dna.ai_summary_line || ""));
      setAiPersona(String(dna.audience_persona || ""));
      setContentThemes(Array.isArray(dna.content_themes) ? dna.content_themes : []);

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

  const handleSaveBusinessProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfileMutation.mutate({
      full_name: fullName,
      company_name: businessName,
      phone,
      instagram_username: instagram,
      brand_dna: {
        ...(profile?.brand_dna || {}),
        website,
        phone,
        role_title: roleTitle,
        location,
        tax_id: taxId,
        address,
        billing_email: billingEmail,
        industry,
      },
    });
  };

  const handleDiscardBusinessProfile = () => {
    if (profile) {
      const dna = profile.brand_dna || {};
      setFullName(profile.full_name || "David K.");
      setRoleTitle(dna.role_title || "VP of Marketing");
      setBusinessName(profile.company_name || "Northwind Labs Inc.");
      setPhone(profile.phone || "+1 415 890-2410");
      setLocation(dna.location || "San Francisco, CA");
      setInstagram(profile.instagram_username || "@northwindlabs");
      setWebsite(dna.website || "https://www.northwindlabs.com");
      setTaxId(dna.tax_id || "US-94-3829104");
      setAddress(dna.address || "440 Brannan St, Suite 300, San Francisco, CA 94107");
      setBillingEmail(dna.billing_email || profile.email || user?.email || "billing@northwindlabs.com");
      setIndustry(dna.industry || "AI & Creative Technology");
    }
  };

  const handleSaveBrandProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const swatches = Array.isArray(colorSwatches) ? colorSwatches : [];
    const paletteList = swatches.map((c) => c?.hex || "#0551E5");
    const safeAudience = Array.isArray(audienceSegments) ? audienceSegments : [];
    const safeTones = Array.isArray(toneKeywords) ? toneKeywords : [];

    updateProfileMutation.mutate(
      {
        company_name: businessName,
        brand_summary: brandVision,
        brand_dna: {
          ...(profile?.brand_dna || {}),
          industry,
          primary_goal: primaryGoal,
          business_description: brandVision,
          brand_vision: brandVision,
          mission_statement: missionStatement,
          target_audience: safeAudience.join(", "),
          audience_segments: safeAudience,
          tone: safeTones.join(", "),
          tone_keywords: safeTones,
          palette: paletteList,
          color_swatches: swatches,
          audience_persona: aiPersona,
          content_themes: contentThemes,
        },
        questionnaire_answers: {
          ...(profile?.questionnaire_answers || {}),
          industry,
          primary_goal: primaryGoal,
          business_description: brandVision,
          target_audience: safeAudience.join(", "),
          tone_keywords: safeTones,
          color_palette: paletteList,
          topics_to_avoid: topicsToAvoid,
        },
      },
      {
        onSuccess: () => {
          setLastSavedTime("Last saved just now");
        },
      }
    );
  };

  const handleDiscardBrandProfile = () => {
    if (profile) {
      const dna = profile.brand_dna || {};
      const answers = profile.questionnaire_answers || {};
      setBrandVision(
        String(
          dna.brand_vision ||
            answers.business_description ||
            dna.business_description ||
            dna.summary_line ||
            dna.positioning ||
            profile.brand_summary ||
            "To lead sustainable innovation in enterprise SaaS software and empower creative teams with automated agility."
        )
      );
      setMissionStatement(
        String(
          dna.mission_statement ||
            dna.positioning ||
            "Describe what problem your company solves and why customers choose you over legacy alternatives. Deliver high-fidelity design execution at scale while eliminating operational friction."
        )
      );
      setAudienceSegments(extractAudienceSegments(dna, answers));
      setToneKeywords(extractToneKeywords(dna, answers));
      setColorSwatches(extractColorSwatches(dna, answers));
    }
  };

  const handleAddAudience = () => {
    const trimmed = newAudienceInput.trim();
    if (trimmed) {
      setAudienceSegments((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (!arr.includes(trimmed)) {
          return [...arr, trimmed];
        }
        return arr;
      });
      setNewAudienceInput("");
      setShowAddAudience(false);
    }
  };

  const handleRemoveAudience = (segment: string) => {
    setAudienceSegments((prev) =>
      (Array.isArray(prev) ? prev : []).filter((s) => {
        const text = typeof s === "string" ? s : (s as any)?.name || String(s);
        return text !== segment;
      })
    );
  };

  const handleColorChange = (index: number, newHex: string) => {
    setColorSwatches((prev) =>
      (Array.isArray(prev) ? prev : []).map((item, idx) =>
        idx === index ? { ...item, hex: newHex } : item
      )
    );
  };

  const handleAddColorSwatch = () => {
    const current = Array.isArray(colorSwatches) ? colorSwatches : [];
    const newId = String(current.length + 1);
    const presets = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];
    const presetHex = presets[current.length % presets.length] || "#8B5CF6";
    setColorSwatches([
      ...current,
      { id: newId, label: `Accent ${current.length}`, hex: presetHex },
    ]);
  };

  const handleExportTokens = () => {
    const swatches = Array.isArray(colorSwatches) ? colorSwatches : [];
    const tokens = {
      brand: businessName || "Creo Brand",
      version: "1.0.0",
      colors: swatches.reduce((acc, s) => {
        const key = (s?.label || "color").toLowerCase().replace(/\s+/g, "_");
        acc[key] = s?.hex || "#000000";
        return acc;
      }, {} as Record<string, string>),
      typography: {
        primary: "Inter, Plus Jakarta Sans",
        weights: [400, 500, 600, 700],
      },
      tone: Array.isArray(toneKeywords) ? toneKeywords : [],
      audience: Array.isArray(audienceSegments) ? audienceSegments : [],
    };
    const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(businessName || "brand").toLowerCase().replace(/\s+/g, "-")}-design-tokens.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 3000);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.name.endsWith(".svg") || file.name.endsWith(".png") || file.name.endsWith(".eps");
    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
    setUploadedAssets((prev) => [
      {
        id: String(Date.now()),
        name: file.name,
        size: sizeStr,
        type: isImg ? "image" : "pdf",
        status: "Uploaded",
      },
      ...prev,
    ]);
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const isImg = file.name.endsWith(".svg") || file.name.endsWith(".png") || file.name.endsWith(".eps");
    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
    setUploadedAssets((prev) => [
      {
        id: String(Date.now()),
        name: file.name,
        size: sizeStr,
        type: isImg ? "image" : "pdf",
        status: "Uploaded",
      },
      ...prev,
    ]);
  };

  const handleDownloadAsset = (name: string) => {
    const dummyContent = `Mock asset file export: ${name}`;
    const blob = new Blob([dummyContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTone = (tone: string) => {
    setToneKeywords((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const match = arr.find((t) => typeof t === "string" && t.toLowerCase() === tone.toLowerCase());
      if (match) {
        return arr.filter((t) => typeof t === "string" && t.toLowerCase() !== tone.toLowerCase());
      }
      return [...arr, tone];
    });
  };

  const displayToneKeywords = Array.from(
    new Set([
      ...BRAND_TONE_KEYWORDS,
      ...(Array.isArray(toneKeywords)
        ? toneKeywords.map((t) => (typeof t === "string" ? t.charAt(0).toUpperCase() + t.slice(1) : ""))
        : []
      ).filter(Boolean),
    ])
  );

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-12">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] text-sm font-medium overflow-x-auto">
        <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setActiveTab("business")}
          className={`flex items-center gap-2 pb-3 px-3 whitespace-nowrap focus:outline-none transition-colors ${
            activeTab === "business"
              ? "text-[#0052FF] border-b-2 border-[#0052FF] font-semibold"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          Company & Contact
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("brand")}
          className={`pb-3 px-3 whitespace-nowrap focus:outline-none transition-colors ${
            activeTab === "brand"
              ? "text-[#0052FF] border-b-2 border-[#0052FF] font-semibold"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Brand Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 pb-3 px-3 whitespace-nowrap focus:outline-none transition-colors ${
            activeTab === "security"
              ? "text-[#0052FF] border-b-2 border-[#0052FF] font-semibold"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          {activeTab === "security" && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          Security & Access
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 pb-3 px-3 whitespace-nowrap focus:outline-none transition-colors ${
            activeTab === "integrations"
              ? "text-[#0052FF] border-b-2 border-[#0052FF] font-semibold"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Social Integrations
          {igConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        </button>
        </div>
        <div className="hidden sm:block shrink-0 pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-xs font-medium text-[#64748B] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>System Active</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-[#0052FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Global Alert */}
          {saved && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* ═══════════════ TAB 1: Company & Contact ═══════════════ */}
          {activeTab === "business" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ── Left Column: Profile & Creative Pod ── */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                {/* 1. Profile Details Card */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-[#0F172A] tracking-tight">Profile</h3>
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          ACTIVE CLIENT
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        title="Upload Avatar"
                      >
                        <Upload className="size-4" />
                      </button>
                    </div>

                    {/* Avatar & User Info */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-14 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
                        {fullName?.charAt(0)?.toUpperCase() || "D"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-[#0F172A] leading-tight truncate">
                          {fullName || "David K."}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                          {roleTitle || "VP of Marketing"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {businessName || "Northwind Labs Inc."}
                        </p>
                      </div>
                    </div>

                    {/* Contact Rows */}
                    <div className="space-y-3 mb-6 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-3">
                        <Mail className="size-4 text-slate-400 shrink-0" />
                        <span className="truncate">{user?.email || profile?.email || "david@northwindlabs.com"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="size-4 text-slate-400 shrink-0" />
                        <span>{phone || "+1 415 890-2410"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="size-4 text-slate-400 shrink-0" />
                        <span>{location || "San Francisco, CA"}</span>
                      </div>
                    </div>

                    {/* Connect Instagram ID Box */}
                    <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 mb-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs font-bold text-[#0F172A]">Connect Instagram ID</label>
                        {igConnected ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            Live
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <div className="size-6 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                              <Instagram className="size-3.5" />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder="@northwindlabs"
                            className="w-full pl-10 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-[#0F172A] font-semibold focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (instagram) connectInstagramMutation.mutate(instagram);
                          }}
                          className="px-3.5 py-2 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-lg transition-all shadow-sm shrink-0 active:scale-95"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("security")}
                      className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <RotateCcw className="size-3.5" />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("company-name-input");
                        el?.focus();
                      }}
                      className="font-bold text-[#0052FF] hover:underline"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>

                {/* 2. Creative Pod Card */}
                <div className="card-surface p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#0F172A]">Creative Pod</h4>
                      <span className="bg-blue-50 text-[#0052FF] font-bold text-[11px] px-2.5 py-0.5 rounded-md border border-blue-100">
                        Pod Alpha
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">#creo-northwind-labs</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="size-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300">
                          ML
                        </div>
                        <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0F172A] truncate">Maya Lin</span>
                          <span className="bg-[#0052FF] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            POD LEAD
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Creative Director • Fast triage
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-emerald-100 shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active in Slack
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right Column: Company Information Form ── */}
              <div className="lg:col-span-7 xl:col-span-8">
                <div className="card-surface p-6 sm:p-8 border border-slate-100">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Company Information</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage your legal business entity, primary contact details, and billing registry.
                    </p>
                  </div>

                  <form onSubmit={handleSaveBusinessProfile} className="space-y-4">
                    {/* Row 1: Business / Legal Name & Official Website URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                          Business / Legal Name
                        </label>
                        <input
                          id="company-name-input"
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Northwind Labs Inc."
                          className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                          Official Website URL
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://www.northwindlabs.com"
                            className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                          />
                          <a
                            href={website.startsWith("http") ? website : `https://${website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#0052FF] transition-colors"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Tax ID / EIN & Industry & Sector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-[#0F172A]">Tax ID / EIN</label>
                          <span className="text-[11px] text-slate-400 font-medium">(Optional)</span>
                        </div>
                        <input
                          type="text"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="US-94-3829104"
                          className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                          Industry &amp; Sector
                        </label>
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="AI & Creative Technology"
                          className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                    </div>

                    {/* Row 3: Primary Business Address */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                        Primary Business Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="440 Brannan St, Suite 300, San Francisco, CA 94107"
                        className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>

                    {/* Row 4: Billing Registry Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                        Billing Registry Email
                      </label>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        placeholder="billing@northwindlabs.com"
                        className="w-full text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                        Monthly statements and VAT invoices will be dispatched to this address.
                      </p>
                    </div>

                    {/* Retainer Status Block */}
                    <div className="mt-6 pt-4">
                      <div className="border border-slate-200/80 bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded uppercase tracking-wider">
                              ACTIVE RETAINER
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Renews Nov 1, 2024</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#0F172A]">Enterprise Growth Tier</span>
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <div className="text-xl font-extrabold text-[#0052FF] leading-none tracking-tight">
                            $8,500 <span className="text-xs text-slate-400 font-medium">/mo</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            Unlimited revisions included
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-end gap-3 pt-6 mt-2">
                      <button
                        type="button"
                        onClick={handleDiscardBusinessProfile}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        Discard Changes
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-5 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5 stroke-[2.5]" />
                        )}
                        Save Company Details
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 2: Brand Profile ═══════════════ */}
          {activeTab === "brand" && (
            <TabErrorBoundary fallbackTitle="Brand Profile Details">
              <div className="space-y-6">
                {/* Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* ── Left Column ── */}
                  <div className="space-y-6">
                    {/* Card 1: Vision, Mission & Value Proposition */}
                    <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-5">
                          <div>
                            <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                              Vision, Mission &amp; Value Proposition
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Define the strategic North Star that guides every creative sprint.
                            </p>
                          </div>
                          <div className="text-slate-400 hover:text-slate-600 transition-colors p-1" title="Strategic North Star Guidance">
                            <Info className="size-4" />
                          </div>
                        </div>

                        {/* Brand Vision & Core Purpose */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
                            <label>Brand Vision &amp; Core Purpose</label>
                            <span className="text-[11px] font-medium text-slate-400 font-mono">
                              {(brandVision || "").length} / 250
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            maxLength={250}
                            value={brandVision || ""}
                            onChange={(e) => setBrandVision(e.target.value)}
                            className="w-full text-xs font-medium text-[#0F172A] bg-white border border-slate-200 rounded-xl p-3.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all resize-none shadow-xs leading-relaxed"
                            placeholder="To lead sustainable innovation in enterprise SaaS software..."
                          />
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Synthesized by AI to anchor visual hierarchy &amp; campaign key visuals.
                          </p>
                        </div>

                        {/* Mission Statement & Key Differentiator */}
                        <div className="space-y-1.5 mt-5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
                            <label>Mission Statement &amp; Key Differentiator</label>
                            <span className="text-[11px] font-medium text-slate-400 font-mono">
                              {(missionStatement || "").length} / 350
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            maxLength={350}
                            value={missionStatement || ""}
                            onChange={(e) => setMissionStatement(e.target.value)}
                            className="w-full text-xs font-medium text-[#0F172A] bg-white border border-slate-200 rounded-xl p-3.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all resize-none shadow-xs leading-relaxed"
                            placeholder="Describe what problem your company solves and why customers choose you over legacy alternatives..."
                          />
                        </div>
                      </div>

                      {/* Blue Pod Callout */}
                      <div className="mt-6 rounded-xl bg-[#F0F5FF] border border-blue-100 p-3.5 flex items-start sm:items-center gap-2.5 text-[#0052FF]">
                        <Zap className="size-4 shrink-0 text-[#0052FF] mt-0.5 sm:mt-0" />
                        <span className="text-xs font-medium text-[#1E40AF] leading-snug">
                          Shared directly with Pod Alpha creative directors to contextualize all AI-assisted concept generations.
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Target Audience & Brand Tone */}
                    <div className="card-surface p-6 sm:p-7 border border-slate-100 space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                          Target Audience &amp; Brand Tone
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Demographics and tonal directives applied to visual assets &amp; copywriting.
                        </p>
                      </div>

                      {/* Primary Target Audience */}
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">Who is your primary target audience?</h4>
                          <p className="text-[11px] text-slate-400">Select or add audience segments</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {(Array.isArray(audienceSegments) ? audienceSegments : []).map((segment, sIdx) => {
                            const segText = typeof segment === "string" ? segment : (segment as any)?.name || (segment as any)?.title || String(segment || "Audience");
                            return (
                              <span
                                key={`${segText}-${sIdx}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all shadow-xs"
                              >
                                <span>{segText}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAudience(segText)}
                                  className="text-slate-400 hover:text-rose-500 transition-colors"
                                  title="Remove segment"
                                >
                                  <X className="size-3 stroke-[2.5]" />
                                </button>
                              </span>
                            );
                          })}
                          {showAddAudience ? (
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={newAudienceInput}
                                onChange={(e) => setNewAudienceInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddAudience();
                                  } else if (e.key === "Escape") {
                                    setShowAddAudience(false);
                                    setNewAudienceInput("");
                                  }
                                }}
                                placeholder="e.g. CMOs"
                                className="px-2.5 py-1 text-xs border border-[#0052FF] rounded-lg outline-none w-32 shadow-xs font-medium"
                              />
                              <button
                                type="button"
                                onClick={handleAddAudience}
                                className="px-2.5 py-1 bg-[#0052FF] text-white text-[11px] font-bold rounded-lg hover:bg-[#0045D8]"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddAudience(false);
                                  setNewAudienceInput("");
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddAudience(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-[#0052FF] text-xs font-semibold text-slate-600 hover:text-[#0052FF] transition-all bg-white hover:bg-blue-50/40"
                            >
                              <Plus className="size-3 stroke-[2.5]" />
                              Add Audience
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Brand Tone Keywords */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">
                            How should your brand sound? (Brand Tone Keywords)
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Active tonal traits used for voice guidelines &amp; AI review
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                          {displayToneKeywords.map((tone) => {
                            const isSelected = (Array.isArray(toneKeywords) ? toneKeywords : []).some(
                              (k) => typeof k === "string" && k.toLowerCase() === tone.toLowerCase()
                            );
                            return (
                              <button
                                key={tone}
                                type="button"
                                onClick={() => toggleTone(tone)}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow-xs ${
                                  isSelected
                                    ? "bg-[#F0F7FF] text-[#0052FF] border-[#0052FF]/60 shadow-blue-500/5 ring-1 ring-[#0052FF]/20"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  {isSelected && (
                                    <Check className="size-3.5 text-[#0052FF] stroke-[2.5]" />
                                  )}
                                  {tone}
                                </span>
                                {!isSelected && (
                                  <Plus className="size-3.5 text-slate-400 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Right Column ── */}
                  <div className="space-y-6">
                    {/* Card 3: Color Palette Configuration */}
                    <div className="card-surface p-6 sm:p-7 border border-slate-100">
                      <div className="flex items-start justify-between gap-2 mb-5">
                        <div>
                          <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                            Color Palette Configuration
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Primary, secondary, and neutral swatches synced to Pod design tokens.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleExportTokens}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0052FF] hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 shrink-0"
                        >
                          <Upload className="size-3.5 rotate-90 stroke-[2.5]" />
                          Export Tokens (JSON)
                        </button>
                      </div>

                      {/* Color Swatches Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(Array.isArray(colorSwatches) ? colorSwatches : []).map((swatch, idx) => {
                          const rawHex = swatch?.hex || "#0551E5";
                          const safeHex = rawHex.startsWith("#") ? rawHex : `#${rawHex}`;
                          const hexForInput = safeHex.length === 7 ? safeHex : "#0551E5";
                          const label = swatch?.label || (idx === 0 ? "Primary Brand" : idx === 1 ? "Secondary Accent" : `Color ${idx + 1}`);
                          return (
                            <div
                              key={swatch?.id || idx}
                              className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center gap-3"
                            >
                              <div className="relative group shrink-0">
                                <div
                                  className="w-10 h-10 rounded-lg shadow-xs border border-black/10 cursor-pointer transition-transform group-hover:scale-105"
                                  style={{ backgroundColor: safeHex }}
                                />
                                <input
                                  type="color"
                                  value={hexForInput}
                                  onChange={(e) => handleColorChange(idx, e.target.value.toUpperCase())}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <label className="block text-[11px] font-bold text-slate-700 truncate">
                                  {label}
                                </label>
                                <input
                                  type="text"
                                  value={safeHex}
                                  onChange={(e) => handleColorChange(idx, e.target.value.toUpperCase())}
                                  className="w-full text-xs font-mono font-semibold uppercase text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 mt-0.5 focus:bg-white focus:border-[#0052FF] outline-none"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Color Swatch */}
                      <button
                        type="button"
                        onClick={handleAddColorSwatch}
                        className="w-full mt-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#0052FF] text-slate-500 hover:text-[#0052FF] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 hover:bg-blue-50/30"
                      >
                        <Plus className="size-3.5 stroke-[2.5]" />
                        Add Color Swatch
                      </button>
                    </div>

                    {/* Card 4: Brand Assets & Guidelines Upload */}
                    <div className="card-surface p-6 sm:p-7 border border-slate-100 space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                          Brand Assets &amp; Guidelines Upload
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Source vectors and typography specifications for Figma pod sync.
                        </p>
                      </div>

                      {/* Dropzone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDropFiles}
                        className={`rounded-2xl border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center cursor-pointer group ${
                          isDragging
                            ? "border-[#0052FF] bg-blue-50/50"
                            : "border-blue-200/90 bg-[#F8FAFC] hover:bg-blue-50/30 hover:border-blue-400"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".svg,.png,.eps,.pdf"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <div className="w-11 h-11 rounded-full bg-blue-50 text-[#0052FF] flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-110 transition-transform">
                          <UploadCloud className="size-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Upload Vector Logos (SVG, PNG, EPS) &amp; Guidelines PDF
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Drag and drop files here or click to browse (Max 50MB)
                        </span>
                      </div>

                      {/* Uploaded Files List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(Array.isArray(uploadedAssets) ? uploadedAssets : []).map((asset) => (
                          <div
                            key={asset?.id || asset?.name}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between"
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  asset?.type === "image"
                                    ? "bg-blue-50 text-[#0052FF]"
                                    : "bg-rose-50 text-rose-600"
                                }`}
                              >
                                {asset?.type === "image" ? (
                                  <ImageIcon className="size-4" />
                                ) : (
                                  <FileText className="size-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="text-xs font-bold text-slate-800 truncate"
                                    title={asset?.name}
                                  >
                                    {asset?.name}
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                                    {asset?.status}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {asset?.size}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-slate-100 text-xs">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="font-semibold text-[#0052FF] hover:underline"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAsset(asset?.name || "asset")}
                                className="font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                              >
                                <Download className="size-3" />
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Font Family Specification */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-900">Font Family Specification</h4>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052FF] border border-blue-100">
                            Primary Webfont
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              Inter / Plus Jakarta Sans
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 italic font-medium">
                            &quot;The quick brown fox jumps over the lazy dog (400, 500, 600, 700)&quot;
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 font-medium">
                            <span>400 Regular</span>
                            <span>500 Medium</span>
                            <span>600 SemiBold</span>
                            <span className="font-bold text-slate-800">700 Bold</span>
                          </div>
                        </div>
                      </div>

                      {/* Verified Banner */}
                      <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 shadow-xs">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span>Assets Verified &amp; Cleaned of Legacy Errors</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Bottom Action Bar ── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Clock className="size-3.5 text-slate-400" />
                    <span>{lastSavedTime}</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleDiscardBrandProfile}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBrandProfile()}
                      disabled={updateProfileMutation.isPending}
                      className="px-5 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5 stroke-[2.5]" />
                      )}
                      Save Brand Specs
                    </button>
                  </div>
                </div>

                {/* Design Token Export Notification Toast */}
                {showExportToast && (
                  <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Design tokens exported to JSON</span>
                  </div>
                )}
              </div>
            </TabErrorBoundary>
          )}

          {/* ═══════════════ TAB 3: Security ═══════════════ */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-24">
              
              {/* ── Left Column: Change Password ── */}
              <div className="lg:col-span-5">
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Change Password</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Update your password regularly to keep your account secure.</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Last changed 45 days ago</span>
                  </div>

                  {passwordMsg && (
                    <div className={`mb-5 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
                      passwordMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}>
                      {passwordMsg.type === "success" ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
                      {passwordMsg.text}
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); changePasswordMutation.mutate(); }} className="space-y-4 flex-1">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-[#0F172A] pr-10 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-[#0F172A] pr-10 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className={`w-full rounded-xl border bg-white text-[13px] font-semibold text-[#0F172A] pr-10 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium ${
                            confirmPassword && confirmPassword === newPassword
                              ? "border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                              : "border-slate-200 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20"
                          }`}
                        />
                        {confirmPassword && confirmPassword === newPassword && (
                          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 pointer-events-none">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Password Strength: <span className="text-emerald-600">Strong</span></span>
                        <span className="text-[9px] text-slate-400 font-semibold">Meets requirements</span>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                        <div className="flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-700">At least 8 characters</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 leading-tight">Includes uppercase & lowercase letters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-700">Includes at least one number</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 leading-tight">Includes special character (#, !, @, etc.)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-auto flex items-center justify-between">
                      <button type="submit" disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
                        className="bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer">
                        {changePasswordMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Update Password
                      </button>
                      <button type="button" className="text-[11px] font-bold text-[#0052FF] hover:underline cursor-pointer">
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ── Right Column: 2FA, Sessions & SSO ── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Two-Factor Authentication (2FA) Card */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-5">
                    <div className="flex items-start gap-3.5">
                      <div className="size-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-[#0052FF] shrink-0">
                        <Shield className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Two-Factor Authentication (2FA)</h2>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold mt-1 ${
                          twoFactorEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {twoFactorEnabled ? "Active via Authenticator App" : "Disabled"}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          Requires a 6-digit authentication code from your authenticator app (Google Authenticator, 1Password, or Authy) when signing in from an unrecognized device.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-700">{twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactorEnabled}
                        onClick={() => toggle2FAMutation.mutate(!twoFactorEnabled)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 ${
                          twoFactorEnabled ? "bg-[#0052FF]" : "bg-slate-300"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          twoFactorEnabled ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 transition-colors shadow-xs cursor-pointer">
                      <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                      Reconfigure Authenticator App
                    </button>
                    <button className="text-[11px] font-bold text-[#0052FF] hover:underline flex items-center gap-1.5 cursor-pointer">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      View Backup Recovery Codes (8 Remaining)
                    </button>
                  </div>
                </div>

                {/* 2. Active Sessions & Devices */}
                <div className="card-surface border border-slate-100 overflow-hidden">
                  <div className="p-6 sm:p-7 border-b border-slate-100">
                    <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Active Sessions & Devices</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Manage devices and active browsers currently authorized to access your Creo workspace.</p>
                  </div>
                  <div className="divide-y divide-slate-100/80">
                    
                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">MacBook Pro 16" • San Francisco, CA, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Chrome v122 • Active Now • IP 172.56.21.89</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Current Session
                      </span>
                    </div>

                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">iPhone 15 Pro • San Francisco, CA, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Creo Mobile App v2.4 • Last active 2 hours ago</p>
                        </div>
                      </div>
                      <button className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                        Log Out
                      </button>
                    </div>

                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">iPad Pro 12.9" • Austin, TX, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Safari • Last active 3 days ago</p>
                        </div>
                      </div>
                      <button className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                        Log Out
                      </button>
                    </div>

                  </div>
                  <div className="p-5 sm:px-7 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <span className="text-[10px] text-slate-400 font-medium">Need to revoke access everywhere?</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer">
                      <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Log Out All Other Device Sessions
                    </button>
                  </div>
                </div>

                {/* 3. Single Sign-On (SSO) & SAML */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="size-10 rounded-xl bg-purple-50 border border-purple-100/50 flex items-center justify-center text-purple-600 shrink-0">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Single Sign-On (SSO) & SAML</h2>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-[#0052FF] border border-blue-100">Okta Verified</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                          Your enterprise workspace has active SAML authentication linked with <strong className="text-slate-700">identity.creocreative.io</strong>.
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold rounded-lg shadow-xs cursor-pointer whitespace-nowrap">
                      Audit SAML Logs
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
          
          {/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}{/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}
          {activeTab === "integrations" && (
            <div className="flex flex-col h-full space-y-6">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-24">
                {/* ── Left: Meta/Facebook API ── */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                          <svg className="size-5 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">Meta / Facebook API Configuration</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage direct access tokens and permissions for Meta Business Suite & Facebook Graph API.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 rounded-full shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        API Active & Verified
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">App Name / Business Page</p>
                          <p className="text-[13px] font-black text-slate-900">{businessName || "Northwind Labs Official Page"}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#0052FF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Verified Entity
                        </span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Meta App ID</p>
                          <div className="flex items-center gap-2">
                            <code className="text-[12px] font-bold text-slate-700 font-mono">app_9482019482</code>
                            <span className="text-[10px] font-medium text-slate-400">• v19.0 API</span>
                          </div>
                        </div>
                        <button className="text-[11px] font-bold text-[#0052FF] hover:underline whitespace-nowrap">Copy</button>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Access Token Status</p>
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <p className="text-[12px] font-bold text-slate-900">Valid <span className="font-semibold text-slate-500">(Expires in 58 days)</span></p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">Auto-rotates in 45 days</span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Webhook Sync Mode</p>
                          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0052FF]">
                            <Zap className="size-3.5 fill-[#0052FF]" />
                            Active (Real-time listener)
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">Latency ~180ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                        Manage Permissions
                      </button>
                      <button className="px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl hover:bg-[#0045D8] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                        <Check className="size-3.5" /> Test Connection
                      </button>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 hidden sm:block">Last tested: 12 minutes ago</span>
                  </div>
                </div>

                {/* ── Right: Instagram Handles ── */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-500/20">
                          <Instagram className="size-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">Connected Instagram Handles</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage linked Instagram accounts and monitor real-time content delivery syncs.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 rounded-full shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Syncing
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Connected Account Preview */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="size-10 rounded-full bg-[#E2E8F0] border border-slate-200 flex items-center justify-center font-black text-xs text-[#0F172A] shrink-0">
                            {igUsername ? igUsername.charAt(0).toUpperCase() : "NL"}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1">
                              @{igUsername || "northwindlabs"}
                              <div className="size-3.5 rounded-full bg-[#0052FF] flex items-center justify-center text-white"><Check className="size-2.5" /></div>
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">42.5K followers • 184 posts • Connected to {businessName || "Northwind Labs Inc."}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">
                          Primary Sync
                        </span>
                      </div>

                      {/* Input & Connect Action */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Connected Instagram ID / Handle</label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-medium text-sm">@</div>
                            <input
                              type="text"
                              value={igUsername || instagram}
                              onChange={(e) => { setIgUsername(e.target.value); setInstagram(e.target.value); }}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-10 py-2.5 text-[13px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] transition-all"
                            />
                            {igConnected && (
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-500">
                                <Check className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => connectInstagramMutation.mutate(igUsername || instagram)}
                              disabled={connectInstagramMutation.isPending}
                              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0045D8] rounded-xl transition shadow-sm whitespace-nowrap disabled:opacity-50 cursor-pointer active:scale-95"
                            >
                              {connectInstagramMutation.isPending ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : "Verify & Sync Handle"}
                            </button>
                            {igConnected && (
                              <button
                                type="button"
                                onClick={() => disconnectInstagramMutation.mutate()}
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer whitespace-nowrap transition-colors"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sync Statuses List */}
                      {igConnected && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Sync Statuses</p>
                            <span className="text-[10px] font-bold text-[#0052FF]">Real-Time Polling</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-bold text-slate-700">Auto-Publishing Engine</span>
                              </div>
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-[#0052FF] rounded border border-blue-100 uppercase">ACTIVE (Every 6 hrs)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2 text-slate-500">
                                <Clock className="size-3.5" />
                                <span className="text-[11px] font-bold text-slate-700">Last Media Asset Sync</span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-600">12 minutes ago (Reel & Ad #1)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <ShieldCheck className="size-3.5" />
                                <span className="text-[11px] font-bold text-emerald-800">API Health Rate</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600">99.9% Uptime (All systems operational)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Next scheduled automatic sync in <strong className="text-slate-600">2h 48m</strong></span>
                    <button className="text-[10px] font-bold text-[#0052FF] hover:underline flex items-center gap-1 cursor-pointer">
                      View Delivery Log <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Fixed Bottom Bar ── */}
              <div className="fixed bottom-0 inset-x-0 sm:left-64 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <p className="text-[12px] font-bold text-slate-900">All social integration APIs active and operating normally.</p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                    Discard Changes
                  </button>
                  <button
                    onClick={() => updateProfileMutation.mutate({})}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Integration Settings"}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Connect Instagram Modal */}
          {showConnectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#0F172A]">Connect Instagram</h3>
                  <button type="button" onClick={() => setShowConnectModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                    <X className="size-5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={connectIgInput}
                  onChange={(e) => setConnectIgInput(e.target.value)}
                  placeholder="@yourbrand"
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm mb-4 focus:ring-[#0052FF] focus:border-[#0052FF] outline-none"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowConnectModal(false)} className="flex-1 py-2 text-sm font-semibold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8F9FC]">Cancel</button>
                  <button
                    type="button"
                    onClick={() => connectInstagramMutation.mutate(connectIgInput)}
                    disabled={connectInstagramMutation.isPending || !connectIgInput.trim()}
                    className="flex-1 py-2 text-sm font-bold text-white bg-[#0052FF] hover:bg-[#0045D8] rounded-lg disabled:opacity-50"
                  >
                    {connectInstagramMutation.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Authorize & Link"}
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

