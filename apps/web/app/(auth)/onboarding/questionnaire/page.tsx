"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = {
  businessName: string;
  industry: string;
  targetAudience: string;
  instagramHandle: string;
  postingFrequency: string;
  whatsWorking: string;
  primaryGoal: string;
  brandTone: string[];
};

const FREQUENCY_OPTIONS = [
  "Daily",
  "A few times a week",
  "Weekly",
  "A few times a month",
  "Rarely",
  "Not currently posting",
];

const PRIMARY_GOALS = [
  "Brand Awareness",
  "Drive Sales",
  "Community Engagement",
];

const BRAND_TONES = [
  "Formal",
  "Casual",
  "Energetic",
  "Inspirational",
  "Educational",
  "Humorous",
];

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      businessName: "",
      industry: "",
      targetAudience: "",
      instagramHandle: "",
      postingFrequency: "",
      whatsWorking: "",
      primaryGoal: "",
      brandTone: [],
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
    const fields: Record<number, (keyof FormData)[]> = {
      1: ["businessName", "industry", "targetAudience"],
      2: ["instagramHandle", "postingFrequency", "whatsWorking"],
      3: ["primaryGoal", "brandTone"],
    };

    const valid = await trigger(fields[step]);
    if (valid) {
      setStep(step + 1);
    }
  }

  function onSubmit() {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/onboarding/complete");
    }, 2000);
  }

  return (
    <CardContent className="py-2">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-brand mb-1">
          Step {step} of 3
        </p>
        <h2 className="text-xl font-bold text-brand-dark">Brand Profile</h2>
        <p className="mt-1 text-sm text-text-muted">
          Help us understand your brand to create content that resonates.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName" className="mb-1.5 block">
                Business Name
              </Label>
              <Input
                id="businessName"
                placeholder="e.g. Acme Foods"
                className="h-10"
                {...register("businessName")}
              />
              {errors.businessName && (
                <p className="mt-1 text-xs text-error">{errors.businessName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="industry" className="mb-1.5 block">
                Industry
              </Label>
              <Input
                id="industry"
                placeholder="e.g. Food & Beverage"
                className="h-10"
                {...register("industry")}
              />
              {errors.industry && (
                <p className="mt-1 text-xs text-error">{errors.industry.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="targetAudience" className="mb-1.5 block">
                Target Audience Demographics
              </Label>
              <textarea
                id="targetAudience"
                placeholder="e.g. Women aged 22-35, urban, health-conscious"
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                {...register("targetAudience")}
              />
              {errors.targetAudience && (
                <p className="mt-1 text-xs text-error">{errors.targetAudience.message}</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="instagramHandle" className="mb-1.5 block">
                Instagram Handle
              </Label>
              <Input
                id="instagramHandle"
                placeholder="@yourbrand"
                className="h-10"
                {...register("instagramHandle")}
              />
              {errors.instagramHandle && (
                <p className="mt-1 text-xs text-error">{errors.instagramHandle.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postingFrequency" className="mb-1.5 block">
                Current Posting Frequency
              </Label>
              <select
                id="postingFrequency"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                {...register("postingFrequency")}
              >
                <option value="">Select frequency</option>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.postingFrequency && (
                <p className="mt-1 text-xs text-error">{errors.postingFrequency.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="whatsWorking" className="mb-1.5 block">
                What&apos;s Working / Not Working
              </Label>
              <textarea
                id="whatsWorking"
                placeholder="Describe what content performs well and what doesn't"
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                {...register("whatsWorking")}
              />
              {errors.whatsWorking && (
                <p className="mt-1 text-xs text-error">{errors.whatsWorking.message}</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Primary Goal</Label>
              <div className="space-y-2">
                {PRIMARY_GOALS.map((goal) => (
                  <label
                    key={goal}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                      watch("primaryGoal") === goal
                        ? "border-brand bg-brand/5 text-brand-dark"
                        : "border-border hover:bg-bg-internal text-text"
                    )}
                  >
                    <input
                      type="radio"
                      value={goal}
                      className="sr-only"
                      {...register("primaryGoal")}
                    />
                    <div
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2 shrink-0",
                        watch("primaryGoal") === goal
                          ? "border-brand bg-brand text-white"
                          : "border-border"
                      )}
                    >
                      {watch("primaryGoal") === goal && (
                        <Check className="size-3" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{goal}</span>
                  </label>
                ))}
              </div>
              {errors.primaryGoal && (
                <p className="mt-1 text-xs text-error">{errors.primaryGoal.message}</p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Brand Tone</Label>
              <div className="flex flex-wrap gap-2">
                {BRAND_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => toggleTone(tone)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      brandTone.includes(tone)
                        ? "border-brand bg-brand text-white"
                        : "border-border text-text hover:bg-bg-internal"
                    )}
                  >
                    {tone}
                  </button>
                ))}
              </div>
              {errors.brandTone && (
                <p className="mt-1 text-xs text-error">{errors.brandTone.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
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
                "Submit Profile"
              )}
            </Button>
          )}
        </div>
      </form>
    </CardContent>
  );
}
