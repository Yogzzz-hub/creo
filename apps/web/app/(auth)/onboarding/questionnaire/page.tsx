"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

type FormData = {
  // Step 1 — Business Info
  coreProduct: string;
  targetAudience: string;
  competitiveAdvantage: string;
  // Step 2 — Social Presence
  instagramUrl: string;
  linkedinUrl: string;
  competitors: string;
  brandAssetsStatus: string;
  // Step 3 — Content Goals
  primaryGoal: string;
  toneOfVoice: string;
  priorityTopics: string;
};

const STEPS = ["Business Info", "Social Presence", "Content Goals"];

const AUDIENCE_OPTIONS = [
  "Gen Z (18-24)",
  "Millennials (25-40)",
  "Gen X (41-56)",
  "B2B Professionals",
  "Broad Consumer Base",
];

const GOAL_OPTIONS = [
  "Brand Awareness & Reach",
  "Lead Generation & Conversion",
  "Audience Engagement & Community",
  "Direct Sales",
];

const TONE_OPTIONS = [
  "Professional & Authoritative",
  "Playful & Witty",
  "Educational & Informative",
  "Bold & Edgy",
  "Warm & Empathetic",
];

const BRAND_ASSET_OPTIONS = ["Yes", "No", "Partially"];

const FIELDS_BY_STEP: Record<number, (keyof FormData)[]> = {
  1: ["coreProduct", "targetAudience", "competitiveAdvantage"],
  2: ["instagramUrl", "linkedinUrl", "competitors", "brandAssetsStatus"],
  3: ["primaryGoal", "toneOfVoice", "priorityTopics"],
};

export default function QuestionnairePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      coreProduct: "",
      targetAudience: "",
      competitiveAdvantage: "",
      instagramUrl: "",
      linkedinUrl: "",
      competitors: "",
      brandAssetsStatus: "",
      primaryGoal: "",
      toneOfVoice: "",
      priorityTopics: "",
    },
  });

  const targetAudience = watch("targetAudience");
  const brandAssetsStatus = watch("brandAssetsStatus");
  const primaryGoal = watch("primaryGoal");
  const toneOfVoice = watch("toneOfVoice");

  async function handleNext() {
    const valid = await trigger(FIELDS_BY_STEP[step]);
    if (valid) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(_data: FormData) {
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        onboarding_stage: 4,
      });
    }

    router.push("/onboarding/complete");
  }

  return (
    <CardContent className="py-2">
      {/* Header */}
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
        {/* Step 1 — Business Info */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label htmlFor="coreProduct" className="mb-1.5 block">
                What is your primary product or service?{" "}
                <span className="text-error">*</span>
              </Label>
              <Textarea
                id="coreProduct"
                placeholder="Describe what you sell and the problem it solves..."
                {...register("coreProduct", {
                  required: "Primary product or service is required",
                })}
              />
              {errors.coreProduct && (
                <p className="mt-1 text-xs text-error">
                  {errors.coreProduct.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="targetAudience" className="mb-1.5 block">
                Primary Target Audience{" "}
                <span className="text-error">*</span>
              </Label>
              <Select
                value={targetAudience}
                onValueChange={(value) => {
                  if (value) {
                    setValue("targetAudience", value, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register("targetAudience", {
                  required: "Target audience is required",
                })}
              />
              {errors.targetAudience && (
                <p className="mt-1 text-xs text-error">
                  {errors.targetAudience.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="competitiveAdvantage" className="mb-1.5 block">
                What is your biggest competitive advantage?{" "}
                <span className="text-error">*</span>
              </Label>
              <Textarea
                id="competitiveAdvantage"
                placeholder="What makes you different from competitors?"
                {...register("competitiveAdvantage", {
                  required: "Competitive advantage is required",
                })}
              />
              {errors.competitiveAdvantage && (
                <p className="mt-1 text-xs text-error">
                  {errors.competitiveAdvantage.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Social Presence */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label htmlFor="instagramUrl" className="mb-1.5 block">
                Instagram URL
              </Label>
              <Input
                id="instagramUrl"
                type="url"
                placeholder="https://instagram.com/your-brand"
                {...register("instagramUrl")}
              />
            </div>

            <div>
              <Label htmlFor="linkedinUrl" className="mb-1.5 block">
                LinkedIn URL
              </Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/company/your-brand"
                {...register("linkedinUrl")}
              />
            </div>

            <div>
              <Label htmlFor="competitors" className="mb-1.5 block">
                List 2-3 competitors or brands whose social media presence you
                admire. <span className="text-error">*</span>
              </Label>
              <Textarea
                id="competitors"
                placeholder="e.g. Nike, HubSpot, Glossier"
                {...register("competitors", {
                  required: "Please list at least one competitor or admired brand",
                })}
              />
              {errors.competitors && (
                <p className="mt-1 text-xs text-error">
                  {errors.competitors.message}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">
                Do you have existing brand guidelines (colors, fonts, logo)?{" "}
                <span className="text-error">*</span>
              </Label>
              <div className="flex gap-4">
                {BRAND_ASSET_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={option}
                      className="accent-brand size-4"
                      checked={brandAssetsStatus === option}
                      onChange={() =>
                        setValue("brandAssetsStatus", option, {
                          shouldValidate: true,
                        })
                      }
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
              <input
                type="hidden"
                {...register("brandAssetsStatus", {
                  required: "Please select an option",
                })}
              />
              {errors.brandAssetsStatus && (
                <p className="mt-1 text-xs text-error">
                  {errors.brandAssetsStatus.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Content Goals */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <Label htmlFor="primaryGoal" className="mb-1.5 block">
                Primary 3-Month Goal{" "}
                <span className="text-error">*</span>
              </Label>
              <Select
                value={primaryGoal}
                onValueChange={(value) => {
                  if (value) {
                    setValue("primaryGoal", value, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register("primaryGoal", {
                  required: "Please select a primary goal",
                })}
              />
              {errors.primaryGoal && (
                <p className="mt-1 text-xs text-error">
                  {errors.primaryGoal.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="toneOfVoice" className="mb-1.5 block">
                Brand Tone of Voice{" "}
                <span className="text-error">*</span>
              </Label>
              <Select
                value={toneOfVoice}
                onValueChange={(value) => {
                  if (value) {
                    setValue("toneOfVoice", value, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register("toneOfVoice", {
                  required: "Please select a tone of voice",
                })}
              />
              {errors.toneOfVoice && (
                <p className="mt-1 text-xs text-error">
                  {errors.toneOfVoice.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="priorityTopics" className="mb-1.5 block">
                Are there any specific promotions we should prioritize this
                month?
              </Label>
              <Textarea
                id="priorityTopics"
                placeholder="Describe any upcoming launches, seasonal campaigns, or promotions..."
                {...register("priorityTopics")}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
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
            <div className="w-full" />
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
                  Generating AI Brand Analysis...
                </>
              ) : (
                "Submit Questionnaire"
              )}
            </Button>
          )}
        </div>
      </form>
    </CardContent>
  );
}
