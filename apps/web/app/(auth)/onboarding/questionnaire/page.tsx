"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches the backend schema exact requirements
type FormData = {
  industry: string;
  businessDescription: string;
  targetAudienceAge: string;
  targetAudienceLocation: string;
  targetAudienceInterests: string;
  socialHandleInstagram: string;
  socialHandleFacebook: string;
  socialHandleLinkedIn: string;
  currentPostingFrequency: string;
  contentWhatWorks: string;
  contentWhatDoesnt: string;
  primaryGoal: string;
  brandTone: string[];
  competitorRefs: string;
  topicsToAvoid: string;
  styleReferences: string;
};

const STEPS = ["Business Details", "Content & Goals", "Brand Preferences"];

const FREQUENCY_OPTIONS = [
  "Daily",
  "A few times a week",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Rarely / Never",
];

const PRIMARY_GOALS = [
  { id: "brand_awareness", label: "Brand Awareness" },
  { id: "lead_generation", label: "Lead Generation" },
  { id: "engagement", label: "Engagement & Community" },
  { id: "sales", label: "Direct Sales" },
  { id: "thought_leadership", label: "Thought Leadership" },
];

const TONE_OPTIONS = [
  "Professional",
  "Friendly",
  "Bold",
  "Playful",
  "Minimalist",
  "Inspirational",
  "Educational",
  "Witty",
];

export default function QuestionnairePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      industry: "",
      businessDescription: "",
      targetAudienceAge: "",
      targetAudienceLocation: "",
      targetAudienceInterests: "",
      socialHandleInstagram: "",
      socialHandleFacebook: "",
      socialHandleLinkedIn: "",
      currentPostingFrequency: "",
      contentWhatWorks: "",
      contentWhatDoesnt: "",
      primaryGoal: "",
      brandTone: [],
      competitorRefs: "",
      topicsToAvoid: "",
      styleReferences: "",
    },
  });

  const brandTone = watch("brandTone") ?? [];

  function toggleTone(tone: string) {
    const current = brandTone;
    if (current.includes(tone)) {
      setValue(
        "brandTone",
        current.filter((t) => t !== tone),
        { shouldValidate: true }
      );
    } else {
      setValue("brandTone", [...current, tone], { shouldValidate: true });
    }
  }

  async function handleNext() {
    const fieldsToValidate: Record<number, (keyof FormData)[]> = {
      1: ["industry", "businessDescription", "targetAudienceAge", "targetAudienceLocation", "targetAudienceInterests"],
      2: ["primaryGoal"], // Only primary goal is mandatory in step 2
      3: ["brandTone"],
    };

    const valid = await trigger(fieldsToValidate[step]);
    if (valid) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setApiError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setApiError("You must be logged in to submit the questionnaire.");
      setIsSubmitting(false);
      return;
    }

    // Map React Hook Form data strictly to Backend Schema payload
    const payload = {
      industry: data.industry,
      business_description: data.businessDescription,
      target_audience: {
        age: data.targetAudienceAge,
        location: data.targetAudienceLocation,
        interests: data.targetAudienceInterests,
      },
      social_handles: {
        instagram: data.socialHandleInstagram,
        facebook: data.socialHandleFacebook,
        linkedin: data.socialHandleLinkedIn,
      },
      current_posting_frequency: data.currentPostingFrequency || null,
      content_what_works: data.contentWhatWorks || null,
      content_what_doesnt: data.contentWhatDoesnt || null,
      primary_goal: data.primaryGoal,
      brand_tone: data.brandTone,
      competitor_refs: data.competitorRefs
        ? data.competitorRefs.split(",").map((s) => s.trim())
        : null,
      topics_to_avoid: data.topicsToAvoid || null,
      style_references: data.styleReferences
        ? data.styleReferences.split(",").map((s) => s.trim())
        : null,
    };

    try {
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
        const errorData = await res.json();
        setApiError(
          errorData.detail || "Failed to submit questionnaire. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      // Success! Move to the next page to handle the loading/polling
      router.push("/onboarding/complete");
    } catch {
      setApiError("Failed to connect to server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <CardContent className="py-2">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-brand mb-1">
          Step {step} of 3: {STEPS[step - 1]}
        </p>
        <h2 className="text-xl font-bold text-brand-dark">Brand Profile</h2>
        <p className="mt-1 text-sm text-text-muted">
          Help us understand your brand to create content that resonates.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label htmlFor="industry" className="mb-1.5 block">
                Industry / Niche <span className="text-error">*</span>
              </Label>
              <Input
                id="industry"
                placeholder="e.g. Restaurant, Fitness, Real Estate"
                className="h-10"
                {...register("industry", { required: "Industry is required" })}
              />
              {errors.industry && (
                <p className="mt-1 text-xs text-error">{errors.industry.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="businessDescription" className="mb-1.5 block">
                Business Description <span className="text-error">*</span>
              </Label>
              <textarea
                id="businessDescription"
                placeholder="Describe what your business does in a few sentences..."
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
                {...register("businessDescription", { required: "Description is required" })}
              />
              {errors.businessDescription && (
                <p className="mt-1 text-xs text-error">{errors.businessDescription.message}</p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">
                Target Audience <span className="text-error">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Input
                    placeholder="Age (e.g. 25-45)"
                    {...register("targetAudienceAge", { required: "Required" })}
                  />
                  {errors.targetAudienceAge && (
                    <p className="mt-1 text-xs text-error">Required</p>
                  )}
                </div>
                <div>
                  <Input
                    placeholder="Location"
                    {...register("targetAudienceLocation", { required: "Required" })}
                  />
                  {errors.targetAudienceLocation && (
                    <p className="mt-1 text-xs text-error">Required</p>
                  )}
                </div>
                <div>
                  <Input
                    placeholder="Interests"
                    {...register("targetAudienceInterests", { required: "Required" })}
                  />
                  {errors.targetAudienceInterests && (
                    <p className="mt-1 text-xs text-error">Required</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Social Media Handles</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Instagram (@handle)" {...register("socialHandleInstagram")} />
                <Input placeholder="Facebook" {...register("socialHandleFacebook")} />
                <Input placeholder="LinkedIn" {...register("socialHandleLinkedIn")} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label htmlFor="postingFrequency" className="mb-1.5 block">
                Current Posting Frequency
              </Label>
              <select
                id="postingFrequency"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
                {...register("currentPostingFrequency")}
              >
                <option value="">Select frequency</option>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="contentWhatWorks" className="mb-1.5 block">
                What type of content has worked well?
              </Label>
              <textarea
                id="contentWhatWorks"
                placeholder="e.g. Behind-the-scenes reels, customer testimonials..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
                {...register("contentWhatWorks")}
              />
            </div>

            <div>
              <Label htmlFor="contentWhatDoesnt" className="mb-1.5 block">
                What type of content has NOT worked?
              </Label>
              <textarea
                id="contentWhatDoesnt"
                placeholder="e.g. Long text-heavy posts, overly promotional content..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
                {...register("contentWhatDoesnt")}
              />
            </div>

            <div>
              <Label className="mb-2 block">
                Primary Goal <span className="text-error">*</span>
              </Label>
              <div className="space-y-2">
                {PRIMARY_GOALS.map((goal) => (
                  <label
                    key={goal.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                      watch("primaryGoal") === goal.id
                        ? "border-brand bg-brand/5 text-brand-dark"
                        : "border-border hover:bg-bg-internal text-text"
                    )}
                  >
                    <input
                      type="radio"
                      value={goal.id}
                      className="sr-only"
                      {...register("primaryGoal", { required: "Please select a primary goal" })}
                    />
                    <div
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2 shrink-0",
                        watch("primaryGoal") === goal.id
                          ? "border-brand bg-brand text-white"
                          : "border-border"
                      )}
                    >
                      {watch("primaryGoal") === goal.id && <Check className="size-3" />}
                    </div>
                    <span className="text-sm font-medium">{goal.label}</span>
                  </label>
                ))}
              </div>
              {errors.primaryGoal && (
                <p className="mt-1 text-xs text-error">{errors.primaryGoal.message}</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label className="mb-2 block">
                Brand Tone <span className="text-error">*</span>
              </Label>
              <p className="text-xs text-text-muted mb-2">
                Select all that apply to your brand voice.
              </p>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => toggleTone(tone)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      brandTone.includes(tone)
                        ? "border-brand bg-brand text-white"
                        : "border-border text-text hover:bg-bg-internal"
                    )}
                  >
                    {tone}
                  </button>
                ))}
              </div>
              {/* Hidden input to register the array for validation */}
              <input
                type="hidden"
                {...register("brandTone", { validate: (val) => val.length > 0 || "Select at least one brand tone" })}
              />
              {errors.brandTone && (
                <p className="mt-1 text-xs text-error">{errors.brandTone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="competitorRefs" className="mb-1.5 block">
                Competitor References
              </Label>
              <Input
                id="competitorRefs"
                placeholder="Instagram handles or brand names (comma-separated)"
                className="h-10"
                {...register("competitorRefs")}
              />
            </div>

            <div>
              <Label htmlFor="topicsToAvoid" className="mb-1.5 block">
                Topics to Avoid
              </Label>
              <textarea
                id="topicsToAvoid"
                placeholder="e.g. Politics, controversial topics, competitor mentions..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
                {...register("topicsToAvoid")}
              />
            </div>

            <div>
              <Label htmlFor="styleReferences" className="mb-1.5 block">
                Style References
              </Label>
              <Input
                id="styleReferences"
                placeholder="Links to posts or accounts you like (comma-separated)"
                className="h-10"
                {...register("styleReferences")}
              />
            </div>
          </div>
        )}

        {apiError && (
          <div className="mt-4 p-3 text-sm text-error bg-error/10 border border-error/20 rounded-md">
            {apiError}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-border text-text h-11"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          ) : (
            <div className="w-full" /> // Spacer for alignment
          )}

          {step < 3 ? (
            <Button
              type="button"
              className="w-full bg-brand hover:bg-brand/90 text-white h-11"
              onClick={handleNext}
            >
              Next
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand/90 text-white h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit & Analyze"
              )}
            </Button>
          )}
        </div>
      </form>
    </CardContent>
  );
}