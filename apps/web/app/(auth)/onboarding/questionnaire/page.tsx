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
  CheckCircle2,
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

const GENDERS = ["All Genders", "Female-Identifying", "Male-Identifying", "Non-Binary", "No Preference"];

interface FormData {
  industry: string;
  business_description: string;
  primary_goal: string;
  target_audience: {
    age_range: string;
    gender: string;
    location: string;
    interests: string;
  };
  social_handles: {
    instagram: string;
    facebook: string;
    linkedin: string;
  };
  current_posting_frequency: string;
  brand_tone: string[];
  content_what_works: string;
  content_what_doesnt: string;
  competitor_refs: string;
  topics_to_avoid: string;
  style_references: string;
}

const INITIAL_FORM: FormData = {
  industry: "",
  business_description: "",
  primary_goal: "",
  target_audience: {
    age_range: "",
    gender: "",
    location: "",
    interests: "",
  },
  social_handles: {
    instagram: "",
    facebook: "",
    linkedin: "",
  },
  current_posting_frequency: "",
  brand_tone: [],
  content_what_works: "",
  content_what_doesnt: "",
  competitor_refs: "",
  topics_to_avoid: "",
  style_references: "",
};

const STEP_ICONS = [Briefcase, Users, Palette];
const STEP_TITLES = ["Business Details", "Target Audience & Social", "Brand Voice & Content"];

export default function QuestionnairePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateNestedField<K extends keyof FormData>(
    parent: K,
    field: string,
    value: string
  ) {
    setForm((prev) => {
      const nested = prev[parent] as Record<string, string>;
      return { ...prev, [parent]: { ...nested, [field]: value } };
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
        form.industry.trim().length > 0 &&
        form.business_description.trim().length > 0 &&
        form.primary_goal.length > 0
      );
    }
    if (step === 2) {
      return (
        form.target_audience.age_range.trim().length > 0 &&
        form.target_audience.location.trim().length > 0
      );
    }
    return form.brand_tone.length > 0;
  }, [step, form]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("You must be logged in to submit.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        industry: form.industry.trim(),
        business_description: form.business_description.trim(),
        primary_goal: form.primary_goal,
        target_audience: {
          age_range: form.target_audience.age_range.trim(),
          gender: form.target_audience.gender,
          location: form.target_audience.location.trim(),
          interests: form.target_audience.interests.trim(),
        },
        social_handles: {
          instagram: form.social_handles.instagram.trim(),
          facebook: form.social_handles.facebook.trim(),
          linkedin: form.social_handles.linkedin.trim(),
        },
        current_posting_frequency: form.current_posting_frequency.trim() || null,
        brand_tone: form.brand_tone,
        content_what_works: form.content_what_works.trim() || null,
        content_what_doesnt: form.content_what_doesnt.trim() || null,
        competitor_refs: parseList(form.competitor_refs),
        topics_to_avoid: form.topics_to_avoid.trim() || null,
        style_references: parseList(form.style_references),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/questionnaire`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Submission failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push("/onboarding/complete");
    } catch {
      setError("Failed to connect to server. Please try again.");
      setIsSubmitting(false);
    }
  }

  const Icon = STEP_ICONS[step - 1];

  return (
    <CardContent className="py-2">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
          <Icon className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-brand-dark">
          Step {step} of {TOTAL_STEPS}: {STEP_TITLES[step - 1]}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {step === 1 && "Tell us about your business and goals."}
          {step === 2 && "Who are you trying to reach?"}
          {step === 3 && "How should your brand sound and look?"}
        </p>
      </div>

      {/* Step 1: Business Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry / Niche</Label>
            <Input
              id="industry"
              placeholder="e.g. Fitness, SaaS, Restaurant, E-commerce"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              placeholder="Describe what your business does, what you sell, and what makes you unique..."
              value={form.business_description}
              onChange={(e) =>
                updateField("business_description", e.target.value)
              }
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Primary Goal</Label>
            <Select
              value={form.primary_goal}
              onValueChange={(val) => updateField("primary_goal", val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your primary goal" />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((goal) => (
                  <SelectItem key={goal} value={goal}>
                    {goal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2: Target Audience & Social */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Target Audience
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age_range">Age Range</Label>
              <Input
                id="age_range"
                placeholder="e.g. 25-40"
                value={form.target_audience.age_range}
                onChange={(e) =>
                  updateNestedField("target_audience", "age_range", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Gender</Label>
              <Select
                value={form.target_audience.gender}
                onValueChange={(val) =>
                  updateNestedField("target_audience", "gender", val ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Geographic Location</Label>
            <Input
              id="location"
              placeholder="e.g. Mumbai, India or Pan-India"
              value={form.target_audience.location}
              onChange={(e) =>
                updateNestedField("target_audience", "location", e.target.value)
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interests">Interests & Hobbies</Label>
            <Input
              id="interests"
              placeholder="e.g. fitness, technology, fashion"
              value={form.target_audience.interests}
              onChange={(e) =>
                updateNestedField("target_audience", "interests", e.target.value)
              }
            />
          </div>

          <div className="h-px bg-border" />

          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Social Presence
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@yourhandle or URL"
                value={form.social_handles.instagram}
                onChange={(e) =>
                  updateNestedField("social_handles", "instagram", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="Page URL or name"
                value={form.social_handles.facebook}
                onChange={(e) =>
                  updateNestedField("social_handles", "facebook", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                placeholder="Company page URL"
                value={form.social_handles.linkedin}
                onChange={(e) =>
                  updateNestedField("social_handles", "linkedin", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="posting_frequency">Current Posting Frequency</Label>
            <Input
              id="posting_frequency"
              placeholder="e.g. 3 times a week, daily, rarely"
              value={form.current_posting_frequency}
              onChange={(e) =>
                updateField("current_posting_frequency", e.target.value)
              }
            />
          </div>
        </div>
      )}

      {/* Step 3: Brand Voice & Content */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Brand Tone (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_TONES.map((tone) => {
                const selected = form.brand_tone.includes(tone);
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => toggleTone(tone)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-bg-internal text-text hover:border-brand/50 hover:bg-brand/5"
                    )}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content_what_works">Content That Works For You</Label>
            <Textarea
              id="content_what_works"
              placeholder="What types of posts or content have gotten the best engagement or feedback?"
              value={form.content_what_works}
              onChange={(e) => updateField("content_what_works", e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content_what_doesnt">Content That Doesn&apos;t Work</Label>
            <Textarea
              id="content_what_doesnt"
              placeholder="Any content styles or topics that haven't resonated with your audience?"
              value={form.content_what_doesnt}
              onChange={(e) =>
                updateField("content_what_doesnt", e.target.value)
              }
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competitor_refs">
              Competitor References (comma-separated)
            </Label>
            <Input
              id="competitor_refs"
              placeholder="e.g. brand1, brand2, brand3"
              value={form.competitor_refs}
              onChange={(e) => updateField("competitor_refs", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topics_to_avoid">Topics to Avoid</Label>
            <Textarea
              id="topics_to_avoid"
              placeholder="Any topics, keywords, or themes that should never appear in your content?"
              value={form.topics_to_avoid}
              onChange={(e) => updateField("topics_to_avoid", e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="style_references">
              Visual Style References (comma-separated)
            </Label>
            <Input
              id="style_references"
              placeholder="e.g. minimalist, bold colors, earthy tones"
              value={form.style_references}
              onChange={(e) => updateField("style_references", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 text-sm text-error bg-error-light p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSubmitting}
            className="text-text-muted"
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            Next
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canNext || isSubmitting}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit
                <CheckCircle2 className="ml-1.5 size-3.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </CardContent>
  );
}
