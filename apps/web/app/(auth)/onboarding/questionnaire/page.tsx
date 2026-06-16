"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ClipboardList, Sparkles } from "lucide-react";

const STEPS = ["Business Details", "Content & Goals", "Brand Preferences"];

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

interface FormData {
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
}

const initialFormData: FormData = {
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
};

export default function QuestionnairePage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTone(tone: string) {
    setFormData((prev) => ({
      ...prev,
      brandTone: prev.brandTone.includes(tone)
        ? prev.brandTone.filter((t) => t !== tone)
        : [...prev.brandTone, tone],
    }));
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  const pollStatus = useCallback(
    async (token: string) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/questionnaire/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "completed") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          sessionStorage.setItem("ai_summary_line", data.summary_line ?? "");
          router.push("/onboarding/complete");
        }
      } catch {
        // Silently retry on next interval
      }
    },
    [router]
  );

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("You must be logged in to submit the questionnaire.");
      setSubmitting(false);
      return;
    }

    const payload = {
      industry: formData.industry,
      business_description: formData.businessDescription,
      target_audience: {
        age: formData.targetAudienceAge,
        location: formData.targetAudienceLocation,
        interests: formData.targetAudienceInterests,
      },
      social_handles: {
        instagram: formData.socialHandleInstagram,
        facebook: formData.socialHandleFacebook,
        linkedin: formData.socialHandleLinkedIn,
      },
      current_posting_frequency: formData.currentPostingFrequency || null,
      content_what_works: formData.contentWhatWorks || null,
      content_what_doesnt: formData.contentWhatDoesnt || null,
      primary_goal: formData.primaryGoal,
      brand_tone: formData.brandTone,
      competitor_refs: formData.competitorRefs
        ? formData.competitorRefs.split(",").map((s) => s.trim())
        : null,
      topics_to_avoid: formData.topicsToAvoid || null,
      style_references: formData.styleReferences
        ? formData.styleReferences.split(",").map((s) => s.trim())
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
        const data = await res.json();
        setError(
          data.detail || "Failed to submit questionnaire. Please try again."
        );
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setPolling(true);

      intervalRef.current = setInterval(() => {
        pollStatus(session.access_token);
      }, 3000);

      pollStatus(session.access_token);
    } catch {
      setError("Failed to connect to server. Please try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (polling) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand/20 h-16 w-16" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
                <Sparkles className="h-8 w-8 text-brand animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-brand-dark">
                Analyzing your brand...
              </h2>
              <p className="text-sm text-text-muted">
                Our AI is reviewing your responses to create a personalized
                content strategy. This usually takes 30-60 seconds.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
            <ClipboardList className="h-6 w-6 text-brand" />
          </div>
          <CardTitle className="text-2xl font-bold text-brand-dark">
            Tell Us About Your Brand
          </CardTitle>
          <CardDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </CardDescription>
          <div className="mt-4 flex gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? "bg-brand" : "bg-border"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-text">
                  Industry / Niche <span className="text-error">*</span>
                </Label>
                <Input
                  id="industry"
                  placeholder="e.g. Restaurant, Fitness, Real Estate"
                  value={formData.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessDescription" className="text-text">
                  Business Description <span className="text-error">*</span>
                </Label>
                <textarea
                  id="businessDescription"
                  placeholder="Describe what your business does in a few sentences..."
                  value={formData.businessDescription}
                  onChange={(e) =>
                    updateField("businessDescription", e.target.value)
                  }
                  className="flex min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-text">
                  Target Audience <span className="text-error">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Age range (e.g. 25-45)"
                    value={formData.targetAudienceAge}
                    onChange={(e) =>
                      updateField("targetAudienceAge", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                  <Input
                    placeholder="Location"
                    value={formData.targetAudienceLocation}
                    onChange={(e) =>
                      updateField("targetAudienceLocation", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                  <Input
                    placeholder="Interests"
                    value={formData.targetAudienceInterests}
                    onChange={(e) =>
                      updateField("targetAudienceInterests", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-text">Social Media Handles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Instagram"
                    value={formData.socialHandleInstagram}
                    onChange={(e) =>
                      updateField("socialHandleInstagram", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                  <Input
                    placeholder="Facebook"
                    value={formData.socialHandleFacebook}
                    onChange={(e) =>
                      updateField("socialHandleFacebook", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                  <Input
                    placeholder="LinkedIn"
                    value={formData.socialHandleLinkedIn}
                    onChange={(e) =>
                      updateField("socialHandleLinkedIn", e.target.value)
                    }
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="postingFrequency" className="text-text">
                  Current Posting Frequency
                </Label>
                <select
                  id="postingFrequency"
                  value={formData.currentPostingFrequency}
                  onChange={(e) =>
                    updateField("currentPostingFrequency", e.target.value)
                  }
                  className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="few_times_week">A few times a week</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="rarely">Rarely / Never</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentWhatWorks" className="text-text">
                  What type of content has worked well for you?
                </Label>
                <textarea
                  id="contentWhatWorks"
                  placeholder="e.g. Behind-the-scenes reels, customer testimonials..."
                  value={formData.contentWhatWorks}
                  onChange={(e) =>
                    updateField("contentWhatWorks", e.target.value)
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentWhatDoesnt" className="text-text">
                  What type of content has NOT worked?
                </Label>
                <textarea
                  id="contentWhatDoesnt"
                  placeholder="e.g. Long text-heavy posts, overly promotional content..."
                  value={formData.contentWhatDoesnt}
                  onChange={(e) =>
                    updateField("contentWhatDoesnt", e.target.value)
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryGoal" className="text-text">
                  Primary Goal <span className="text-error">*</span>
                </Label>
                <select
                  id="primaryGoal"
                  value={formData.primaryGoal}
                  onChange={(e) =>
                    updateField("primaryGoal", e.target.value)
                  }
                  className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="">Select your primary goal</option>
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="lead_generation">Lead Generation</option>
                  <option value="engagement">Engagement & Community</option>
                  <option value="sales">Direct Sales</option>
                  <option value="thought_leadership">Thought Leadership</option>
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label className="text-text">
                  Brand Tone <span className="text-error">*</span>
                </Label>
                <p className="text-xs text-text-muted">
                  Select all that apply to your brand voice
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleTone(tone)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        formData.brandTone.includes(tone)
                          ? "bg-brand text-white"
                          : "bg-brand-light text-brand-dark hover:bg-brand/10"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitorRefs" className="text-text">
                  Competitor References
                </Label>
                <Input
                  id="competitorRefs"
                  placeholder="Instagram handles or brand names (comma-separated)"
                  value={formData.competitorRefs}
                  onChange={(e) =>
                    updateField("competitorRefs", e.target.value)
                  }
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topicsToAvoid" className="text-text">
                  Topics to Avoid
                </Label>
                <textarea
                  id="topicsToAvoid"
                  placeholder="e.g. Politics, controversial topics, competitor mentions..."
                  value={formData.topicsToAvoid}
                  onChange={(e) =>
                    updateField("topicsToAvoid", e.target.value)
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="styleReferences" className="text-text">
                  Style References
                </Label>
                <Input
                  id="styleReferences"
                  placeholder="Links to posts or accounts you like (comma-separated)"
                  value={formData.styleReferences}
                  onChange={(e) =>
                    updateField("styleReferences", e.target.value)
                  }
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-error bg-error-light p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={prevStep}
              className="border-border text-text"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={
                (step === 0 &&
                  (!formData.industry ||
                    !formData.businessDescription ||
                    !formData.targetAudienceAge)) ||
                (step === 1 && !formData.primaryGoal)
              }
              className="bg-brand hover:bg-brand/90 text-white"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || formData.brandTone.length === 0}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit & Analyze"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
