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

  return (<div className="p-10 text-xl font-bold text-[#0D2137]">Questionnaire Page Reached!</div>);
}
