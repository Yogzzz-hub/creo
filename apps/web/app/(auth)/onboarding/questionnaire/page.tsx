"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Briefcase,
  Users,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

const BRAND_TONES = [
  "Professional",
  "Casual",
  "Humorous",
  "Inspirational",
  "Educational",
  "Bold",
  "Friendly",
  "Luxurious",
  "Minimalist",
  "Playful",
  "Warm",
  "Authoritative",
  "Witty",
];

const GOALS = [
  "Brand Awareness",
  "Lead Generation",
  "Community Building",
  "Sales & Conversions",
  "Content Engagement",
  "Thought Leadership",
  "Event Promotion",
  "Customer Retention",
];

const GENDERS = [
  "All Genders",
  "Female-Identifying",
  "Male-Identifying",
  "Non-Binary",
  "No Preference",
];

interface FormData {
  // Theme 1: Brand Identity & Basics
  brand_name: string;
  industry: string;
  official_logo_assets: string;
  business_description: string;

  // Theme 2: Target Audience & Goals
  primary_goal: string;
  target_audience: {
    age_range: string;
    gender: string;
    location: string;
    interests: string;
    problems_solved: string;
  };
  social_handles: {
    instagram: string;
    facebook: string;
    tiktok: string;
    linkedin: string;
    other_platforms: string;
  };

  // Theme 3: Tone, Style & Preferences
  brand_tone: string[];
  style_references: string;
  competitor_refs: string;
  content_types_focus: string;
  content_what_works: string;
  content_what_doesnt: string;
  topics_to_avoid: string;
  current_posting_frequency: string;
}

const INITIAL_FORM: FormData = {
  brand_name: "",
  industry: "",
  official_logo_assets: "",
  business_description: "",
  primary_goal: "",
  target_audience: {
    age_range: "",
    gender: "",
    location: "",
    interests: "",
    problems_solved: "",
  },
  social_handles: {
    instagram: "",
    facebook: "",
    tiktok: "",
    linkedin: "",
    other_platforms: "",
  },
  brand_tone: [],
  style_references: "",
  competitor_refs: "",
  content_types_focus: "",
  content_what_works: "",
  content_what_doesnt: "",
  topics_to_avoid: "",
  current_posting_frequency: "",
};

const STEP_ICONS = [Briefcase, Users, Palette];
const STEP_TITLES = [
  "Brand Identity & Basics",
  "Target Audience & Goals",
  "Tone, Style & Preferences",
];

export default function QuestionnairePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateNestedField(
    parent: "target_audience" | "social_handles",
    field: string,
    value: string
  ) {
    setForm((prev) => {
      const nested = prev[parent] as Record<string, string>;

      return {
        ...prev,
        [parent]: {
          ...nested,
          [field]: value,
        },
      };
    });
  }

  function toggleTone(tone: string) {
    setForm((prev) => {
      const exists = prev.brand_tone.includes(tone);

      return {
        ...prev,
        brand_tone: exists
          ? prev.brand_tone.filter((t) => t !== tone)
          : [...prev.brand_tone, tone],
      };
    });
  }

  function parseList(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const canNext = useMemo(() => {
    if (step === 1) {
      return (
        form.brand_name.trim().length > 0 &&
        form.industry.trim().length > 0 &&
        form.business_description.trim().length > 0
      );
    }

    if (step === 2) {
      return (
        form.target_audience.age_range.trim().length > 0 &&
        form.target_audience.location.trim().length > 0 &&
        form.primary_goal.length > 0
      );
    }

    return form.brand_tone.length > 0;
  }, [step, form]);

  async function handleSubmit() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token || !session?.user?.id) {
        setError("You must be logged in to submit.");
        setIsSubmitting(false);
        return;
      }

      const formattedDesc = [
        `Brand Name: ${form.brand_name.trim()}`,
        form.official_logo_assets.trim() ? `Logo & Visual Assets: ${form.official_logo_assets.trim()}` : "",
        `Business Description: ${form.business_description.trim()}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const formattedWorks = [
        form.content_types_focus.trim() ? `Focus Content Types & Themes: ${form.content_types_focus.trim()}` : "",
        form.content_what_works.trim() ? `Effective Content: ${form.content_what_works.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        industry: form.industry.trim(),
        business_description: formattedDesc,
        primary_goal: form.primary_goal,

        target_audience: {
          brand_name: form.brand_name.trim(),
          official_logo_assets: form.official_logo_assets.trim(),
          age_range: form.target_audience.age_range.trim(),
          gender: form.target_audience.gender,
          location: form.target_audience.location.trim(),
          interests: form.target_audience.interests.trim(),
          problems_solved: form.target_audience.problems_solved.trim(),
        },

        social_handles: {
          instagram:
            form.social_handles.instagram.trim(),

          facebook:
            form.social_handles.facebook.trim(),

          tiktok:
            form.social_handles.tiktok.trim(),

          linkedin:
            form.social_handles.linkedin.trim(),

          other_platforms:
            form.social_handles.other_platforms.trim(),
        },

        current_posting_frequency:
          form.current_posting_frequency.trim() || null,

        brand_tone: form.brand_tone,
        content_what_works: formattedWorks || null,
        content_what_doesnt: form.content_what_doesnt.trim() || null,
        competitor_refs: parseList(form.competitor_refs),
        topics_to_avoid: form.topics_to_avoid.trim() || null,
        style_references: parseList(form.style_references),
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };

      console.log("Submitting questionnaire...");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") || "http://127.0.0.1:8000";

      let res = await fetch(
        `${apiUrl}/api/v1/questionnaire`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      /*
       * 409 means the questionnaire already exists.
       * In that case, update the existing questionnaire.
       */
      if (res.status === 409) {
        setError(null);
        res = await fetch(
          `${apiUrl}/api/v1/questionnaire`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
          }
        );
      }

      /*
       * If POST/PATCH failed, show the actual backend error.
       */
      if (!res.ok) {
        let errorMessage =
          "Submission failed. Please try again.";

        try {
          const data = await res.json();

          if (typeof data?.detail === "string") {
            errorMessage = data.detail;
          } else if (Array.isArray(data?.detail)) {
            errorMessage = data.detail
              .map(
                (item: { msg?: string }) =>
                  item?.msg || "Invalid questionnaire data"
              )
              .join(", ");
          }
        } catch {
          // Backend did not return JSON.
        }

        console.error(
          "Questionnaire API error:",
          res.status,
          errorMessage
        );

        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          onboarding_stage: 5,
          account_status: "active",
        })
        .eq("auth_id", session.user.id);

      /*
       * Try to update the user's onboarding state.
       *
       * This is intentionally non-blocking.
       * If Supabase RLS prevents this update, the user
       * should still be able to continue.
       */
      try {
        const { error: updateError } =
          await supabase
            .from("users")
            .update({
              onboarding_stage: 5,
              account_status: "active",
            })
            .eq("auth_id", session.user.id);

        if (updateError) {
          console.warn(
            "Could not update onboarding status:",
            updateError
          );
        }
      } catch (updateErr) {
        console.warn(
          "Supabase onboarding update failed:",
          updateErr
        );
      }

      /*
       * Stop loading before navigation.
       */
      setIsSubmitting(false);

      /*
       * Questionnaire is complete.
       */
      router.push("/onboarding/complete");
    } catch (err) {
      console.error(
        "Questionnaire submission error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to server. Please try again."
      );

      setIsSubmitting(false);
    }
  }

  const Icon = STEP_ICONS[step - 1];

  return (
    <CardContent>
      {/* Questionnaire Sub-Stepper */}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-light text-brand">
              <Icon className="size-5" />
            </div>

            <div>
              <p className="text-xs font-medium text-text-muted">
                Step {step} of {TOTAL_STEPS}
              </p>

              <h2 className="text-sm font-bold text-brand-dark">
                {STEP_TITLES[step - 1]}
              </h2>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-light">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error/20 bg-error-light p-4 text-sm font-medium text-error">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1: Brand Identity & Basics */}
        {step === 1 && (
          <div className="animate-in space-y-5 fade-in duration-300">
            <div className="space-y-2">
              <Label htmlFor="brand_name" className="text-sm font-semibold text-brand-dark">
                Brand Name
              </Label>
              <Input
                id="brand_name"
                type="text"
                placeholder="e.g., Acme Corporation, Creo Studio"
                value={form.brand_name}
                onChange={(e) => updateField("brand_name", e.target.value)}
                className="w-full border-border focus-visible:ring-brand focus-visible:border-brand"
              />
              <p className="text-xs text-[#6BAED6]">
                Official name of your brand, company, or agency.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="text-sm font-semibold text-brand-dark">
                Industry / Sector
              </Label>

              <Input
                id="industry"
                type="text"
                placeholder="e.g., E-commerce, SaaS, Fitness, Real Estate, Healthcare"
                value={form.industry}
                onChange={(e) =>
                  updateField(
                    "industry",
                    e.target.value
                  )
                }
                className="w-full border-border focus-visible:border-brand focus-visible:ring-brand"
              />

              <p className="text-xs text-[#6BAED6]">
                What sector or category does your business operate in?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="official_logo_assets" className="text-sm font-semibold text-brand-dark">
                Official Logo or Visual Assets (Optional)
              </Label>
              <Input
                id="official_logo_assets"
                type="text"
                placeholder="e.g., Link to Google Drive/Figma logo, brand color hex codes (#2B7BC4), or visual asset notes"
                value={form.official_logo_assets}
                onChange={(e) => updateField("official_logo_assets", e.target.value)}
                className="w-full border-border focus-visible:ring-brand focus-visible:border-brand"
              />
              <p className="text-xs text-[#6BAED6]">
                Provide a link to your official logo, brand kit drive, or brand colors description.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_description" className="text-sm font-semibold text-brand-dark">
                Business Description
              </Label>

              <Textarea
                id="business_description"
                placeholder="Briefly describe what your business does, products or services offered, and core value proposition..."
                value={form.business_description}
                onChange={(e) =>
                  updateField(
                    "business_description",
                    e.target.value
                  )
                }
                className="min-h-[120px] w-full border-border focus-visible:border-brand focus-visible:ring-brand"
              />

              <p className="text-xs text-[#6BAED6]">
                Provide clear details about what your business does so our strategic AI can model your brand.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Target Audience & Goals */}
        {step === 2 && (
          <div className="animate-in space-y-5 fade-in duration-300">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="age_range"
                  className="text-sm font-semibold text-brand-dark"
                >
                  Target Age Range
                </Label>

                <Input
                  id="age_range"
                  type="text"
                  placeholder="e.g., 18-35, 25-50, All ages"
                  value={
                    form.target_audience.age_range
                  }
                  onChange={(e) =>
                    updateNestedField(
                      "target_audience",
                      "age_range",
                      e.target.value
                    )
                  }
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-sm font-semibold text-brand-dark"
                >
                  Target Location
                </Label>

                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., United States, Mumbai, Global"
                  value={
                    form.target_audience.location
                  }
                  onChange={(e) =>
                    updateNestedField(
                      "target_audience",
                      "location",
                      e.target.value
                    )
                  }
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="gender"
                  className="text-sm font-semibold text-brand-dark"
                >
                  Target Gender
                </Label>

                <Select
                  value={
                    form.target_audience.gender
                  }
                  onValueChange={(val) =>
                    updateNestedField(
                      "target_audience",
                      "gender",
                      val ?? ""
                    )
                  }
                >
                  <SelectTrigger
                    id="gender"
                    className="w-full border-border focus:ring-brand"
                  >
                    <SelectValue placeholder="Select target gender" />
                  </SelectTrigger>

                  <SelectContent>
                    {GENDERS.map((gender) => (
                      <SelectItem
                        key={gender}
                        value={gender}
                      >
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests" className="text-sm font-semibold text-brand-dark">
                  Audience Demographics & Interests
                </Label>

                <Input
                  id="interests"
                  type="text"
                  placeholder="e.g., tech, fitness, career growth, luxury lifestyle"
                  value={form.target_audience.interests}
                  onChange={(e) => updateNestedField("target_audience", "interests", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problems_solved" className="text-sm font-semibold text-brand-dark">
                Problems You Solve for Your Customers
              </Label>
              <Textarea
                id="problems_solved"
                placeholder="What pain points or key problems do your ideal customers have, and how does your product/service solve them?"
                value={form.target_audience.problems_solved}
                onChange={(e) => updateNestedField("target_audience", "problems_solved", e.target.value)}
                className="w-full min-h-[90px] border-border focus-visible:ring-brand"
              />
              <p className="text-xs text-[#6BAED6]">
                Helps tailor marketing content around benefits and customer solution stories.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="primary_goal" className="text-sm font-semibold text-brand-dark">
                Main Objective / Marketing Strategy Goal
              </Label>
              <Select
                value={form.primary_goal}
                onValueChange={(val) => updateField("primary_goal", val ?? "")}
              >
                <SelectTrigger id="primary_goal" className="w-full border-border focus:ring-brand focus:border-brand">
                  <SelectValue placeholder="Select your primary marketing objective" />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6BAED6]">
                Select the core outcome you want your content campaign to accomplish.
              </p>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-bold text-brand-dark mb-4">Social Media Channels (Optional)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="instagram"
                    className="text-sm font-semibold text-brand-dark"
                  >
                    Instagram Handle
                  </Label>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-[#6BAED6]">
                      @
                    </span>

                    <Input
                      id="instagram"
                      type="text"
                      placeholder="username"
                      value={
                        form.social_handles.instagram
                      }
                      onChange={(e) =>
                        updateNestedField(
                          "social_handles",
                          "instagram",
                          e.target.value
                        )
                      }
                      className="w-full border-border pl-7 focus-visible:ring-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="text-sm font-semibold text-brand-dark">
                      Facebook Page
                    </Label>

                    <Input
                      id="facebook"
                      type="text"
                      placeholder="facebook.com/page"
                      value={
                        form.social_handles.facebook
                      }
                      onChange={(e) =>
                        updateNestedField(
                          "social_handles",
                          "facebook",
                          e.target.value
                        )
                      }
                      className="w-full border-border focus-visible:ring-brand"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tiktok" className="text-sm font-semibold text-brand-dark">
                      TikTok Handle
                    </Label>

                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-semibold text-[#6BAED6]">
                        @
                      </span>

                      <Input
                        id="tiktok"
                        type="text"
                        placeholder="username"
                        value={
                          form.social_handles.tiktok
                        }
                        onChange={(e) =>
                          updateNestedField(
                            "social_handles",
                            "tiktok",
                            e.target.value
                          )
                        }
                        className="w-full border-border pl-7 focus-visible:ring-brand"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="text-sm font-semibold text-brand-dark">
                      LinkedIn Page
                    </Label>

                    <Input
                      id="linkedin"
                      type="text"
                      placeholder="linkedin.com/company/page"
                      value={
                        form.social_handles.linkedin
                      }
                      onChange={(e) =>
                        updateNestedField(
                          "social_handles",
                          "linkedin",
                          e.target.value
                        )
                      }
                      className="w-full border-border focus-visible:ring-brand"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="other_platforms" className="text-sm font-semibold text-brand-dark">
                      Other Platforms
                    </Label>

                    <Input
                      id="other_platforms"
                      type="text"
                      placeholder="e.g., YouTube, Pinterest, X/Twitter"
                      value={form.social_handles.other_platforms}
                      onChange={(e) => updateNestedField("social_handles", "other_platforms", e.target.value)}
                      className="w-full border-border focus-visible:ring-brand"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tone, Style & Preferences */}
        {step === 3 && (
          <div className="animate-in space-y-5 fade-in duration-300">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-brand-dark">
                Preferred Brand Voice / Tone (Select 1-10 keywords)
              </Label>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {BRAND_TONES.map((tone) => {
                  const isSelected =
                    form.brand_tone.includes(tone);

                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() =>
                        toggleTone(tone)
                      }
                      disabled={
                        !isSelected &&
                        form.brand_tone.length >= 10
                      }
                      className={cn(
                        "cursor-pointer rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all",
                        isSelected
                          ? "border-brand bg-brand text-white shadow-sm"
                          : "border-border bg-white text-brand-dark hover:bg-brand-light/50"
                      )}
                    >
                      {tone}
                    </button>
                  );
                })}
              </div>

              <p className="flex justify-between text-xs text-[#6BAED6]">
                <span>
                  Selected: {form.brand_tone.length} / 10
                </span>

                {form.brand_tone.length >= 10 && (
                  <span className="font-medium text-amber-600">
                    Max tone limit reached
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="style_references" className="text-sm font-semibold text-brand-dark">
                  Design Aesthetic & Style References
                </Label>
                <Input
                  id="style_references"
                  type="text"
                  placeholder="e.g., minimalist, bright colors, dark mode, vintage typography (comma separated)"
                  value={form.style_references}
                  onChange={(e) => updateField("style_references", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
                <p className="text-xs text-[#6BAED6]">
                  Aesthetic preferences for your graphics & visual assets.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitor_refs" className="text-sm font-semibold text-brand-dark">
                  Competitors / Inspiration References
                </Label>

                <Input
                  id="competitor_refs"
                  type="text"
                  placeholder="e.g., Apple, Nike, local competitors (comma separated)"
                  value={form.competitor_refs}
                  onChange={(e) =>
                    updateField(
                      "competitor_refs",
                      e.target.value
                    )
                  }
                  className="w-full border-border focus-visible:ring-brand"
                />
                <p className="text-xs text-[#6BAED6]">
                  Brands whose marketing style or content strategy you admire.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_types_focus" className="text-sm font-semibold text-brand-dark">
                Specific Content Types & Focus Themes
              </Label>
              <Input
                id="content_types_focus"
                type="text"
                placeholder="e.g., short-form video reels, educational carousels, product showcases, customer stories"
                value={form.content_types_focus}
                onChange={(e) => updateField("content_types_focus", e.target.value)}
                className="w-full border-border focus-visible:ring-brand"
              />
              <p className="text-xs text-[#6BAED6]">
                Highlight themes or formats you want your creative team to focus on.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="content_what_works" className="text-sm font-semibold text-brand-dark">
                  What Content Works Well? (Optional)
                </Label>
                <Textarea
                  id="content_what_works"
                  placeholder="Past campaigns or post styles that successfully engaged your audience..."
                  value={form.content_what_works}
                  onChange={(e) => updateField("content_what_works", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_what_doesnt" className="text-sm font-semibold text-brand-dark">
                  What Content Does NOT Work? (Optional)
                </Label>
                <Textarea
                  id="content_what_doesnt"
                  placeholder="Styles or post concepts you tried but found ineffective..."
                  value={form.content_what_doesnt}
                  onChange={(e) => updateField("content_what_doesnt", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topics_to_avoid" className="text-sm font-semibold text-brand-dark">
                  Topics / Words to Avoid (Optional)
                </Label>
                <Input
                  id="topics_to_avoid"
                  type="text"
                  placeholder="Sensitive topics, words, or competitors to exclude"
                  value={form.topics_to_avoid}
                  onChange={(e) => updateField("topics_to_avoid", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_posting_frequency" className="text-sm font-semibold text-brand-dark">
                  Current Posting Frequency (Optional)
                </Label>
                <Input
                  id="current_posting_frequency"
                  type="text"
                  placeholder="e.g., 3 posts/week, daily, irregular"
                  value={form.current_posting_frequency}
                  onChange={(e) => updateField("current_posting_frequency", e.target.value)}
                  className="w-full border-border focus-visible:ring-brand"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-border">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setStep((prev) => prev - 1)
            }
            disabled={isSubmitting}
            className="flex cursor-pointer items-center gap-2 border-border text-brand-dark"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={() =>
              setStep((prev) => prev + 1)
            }
            disabled={!canNext}
            className="flex h-11 cursor-pointer items-center gap-2 bg-brand px-6 text-white transition-colors hover:bg-brand/90"
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canNext || isSubmitting}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 bg-brand px-6 font-semibold text-white shadow-sm transition-colors hover:bg-brand/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting Profile...
              </>
            ) : (
              "Submit Questionnaire"
            )}
          </Button>
        )}
      </div>
    </CardContent>
  );
}
