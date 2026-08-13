"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "@/context/session-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

const BRAND_TONES = [
  "Professional", "Casual", "Humorous", "Inspirational", "Educational",
  "Bold", "Friendly", "Luxurious", "Minimalist", "Playful",
  "Warm", "Authoritative", "Witty"
]

const GOALS = [
  "Brand Awareness", "Lead Generation", "Community Building",
  "Sales & Conversions", "Content Engagement", "Thought Leadership",
  "Event Promotion", "Customer Retention"
]

const GENDERS = [
  "All Genders", "Female-Identifying", "Male-Identifying", "Non-Binary", "No Preference"
]

interface AIAnalysis {
  brand_tone: string[]
  content_themes: string[]
  audience_persona: string
  goal_alignment: string
  ai_summary_line: string
}

interface QuestionnaireData {
  industry: string
  business_description: string
  primary_goal: string
  target_audience: any
  social_handles: any
  brand_tone: string[]
  style_references: string[] | null
  competitor_refs: string[] | null
  content_types_focus: string | null
  content_what_works: string | null
  content_what_doesnt: string | null
  topics_to_avoid: string | null
  current_posting_frequency: string | null
  ai_analysis?: AIAnalysis | null
}

const INITIAL_FORM = {
  industry: "",
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
  brand_tone: [] as string[],
  style_references: "",
  competitor_refs: "",
  content_types_focus: "",
  content_what_works: "",
  content_what_doesnt: "",
  topics_to_avoid: "",
  current_posting_frequency: "",
}

export function BrandProfileTab() {
  const { user } = useSession()
  const [form, setForm] = useState(INITIAL_FORM)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const fetchQuestionnaire = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true)
    try {
      const data = await apiFetch("/api/v1/questionnaire") as QuestionnaireData
      
      setForm({
        industry: data.industry || "",
        business_description: data.business_description || "",
        primary_goal: data.primary_goal || "",
        target_audience: data.target_audience || INITIAL_FORM.target_audience,
        social_handles: data.social_handles || INITIAL_FORM.social_handles,
        brand_tone: data.brand_tone || [],
        style_references: data.style_references ? data.style_references.join(", ") : "",
        competitor_refs: data.competitor_refs ? data.competitor_refs.join(", ") : "",
        content_types_focus: "",
        content_what_works: data.content_what_works || "",
        content_what_doesnt: data.content_what_doesnt || "",
        topics_to_avoid: data.topics_to_avoid || "",
        current_posting_frequency: data.current_posting_frequency || "",
      })

      if (data.ai_analysis) {
        setAnalysis(data.ai_analysis)
      }
    } catch (err: any) {
      if (err.status !== 404) {
        setError(err.message || "Failed to load questionnaire")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestionnaire()
  }, [])

  const updateField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const updateNestedField = (parent: "target_audience" | "social_handles", field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }))
  }

  const toggleTone = (tone: string) => {
    setForm(prev => {
      const exists = prev.brand_tone.includes(tone)
      return {
        ...prev,
        brand_tone: exists
          ? prev.brand_tone.filter(t => t !== tone)
          : [...prev.brand_tone, tone],
      }
    })
  }

  const parseList = (value: string) => value.split(",").map(s => s.trim()).filter(Boolean)

  const handleSave = async () => {
    setIsSaving(true)
    setIsRegenerating(true)
    try {
      const payload = {
        industry: form.industry.trim(),
        business_description: form.business_description.trim(),
        primary_goal: form.primary_goal,
        target_audience: form.target_audience,
        social_handles: form.social_handles,
        brand_tone: form.brand_tone,
        current_posting_frequency: form.current_posting_frequency.trim() || null,
        content_what_works: form.content_what_works.trim() || null,
        content_what_doesnt: form.content_what_doesnt.trim() || null,
        topics_to_avoid: form.topics_to_avoid.trim() || null,
        competitor_refs: parseList(form.competitor_refs),
        style_references: parseList(form.style_references),
      }

      await apiFetch("/api/v1/questionnaire", {
        method: "PATCH",
        body: JSON.stringify(payload)
      })

      toast.success("Profile updated! AI Analysis is regenerating...")
      
      // Wait a bit and refetch to get updated AI analysis
      setTimeout(async () => {
        await fetchQuestionnaire(true)
        setIsRegenerating(false)
      }, 3500)

    } catch (err: any) {
      toast.error(err.message || "Failed to save updates")
      setIsRegenerating(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading profile...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0D2137]">
            Brand Questionnaire
          </CardTitle>
          <CardDescription>
            Update your business details below. Your AI Brand Analysis will automatically regenerate based on these changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Basics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#0D2137] border-b pb-2">Business Basics</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Industry / Sector</Label>
                <Input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <Select value={form.primary_goal} onValueChange={(v) => updateField("primary_goal", v)}>
                  <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
                  <SelectContent>
                    {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Description</Label>
              <Textarea 
                value={form.business_description} 
                onChange={(e) => updateField("business_description", e.target.value)} 
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#0D2137] border-b pb-2">Target Audience</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Input value={form.target_audience.age_range} onChange={e => updateNestedField("target_audience", "age_range", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.target_audience.gender ?? ""} onValueChange={(v) => updateNestedField("target_audience", "gender", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.target_audience.location} onChange={e => updateNestedField("target_audience", "location", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <Input value={form.target_audience.interests} onChange={e => updateNestedField("target_audience", "interests", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Problems Solved</Label>
              <Textarea 
                value={form.target_audience.problems_solved} 
                onChange={e => updateNestedField("target_audience", "problems_solved", e.target.value)} 
              />
            </div>
          </div>

          {/* Tone & Style */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#0D2137] border-b pb-2">Tone & Style</h3>
            <div className="space-y-2">
              <Label>Brand Tone</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {BRAND_TONES.map((tone) => {
                  const isSelected = form.brand_tone.includes(tone)
                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleTone(tone)}
                      disabled={!isSelected && form.brand_tone.length >= 10}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                        isSelected ? "border-[#2B7BC4] bg-[#2B7BC4] text-white" : "border-gray-200 bg-white hover:bg-gray-50"
                      )}
                    >
                      {tone}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label>Style References (comma separated)</Label>
                <Input value={form.style_references} onChange={(e) => updateField("style_references", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Competitor References (comma separated)</Label>
                <Input value={form.competitor_refs} onChange={(e) => updateField("competitor_refs", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Topics to Avoid</Label>
              <Input value={form.topics_to_avoid} onChange={(e) => updateField("topics_to_avoid", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90">
              {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
              Save & Regenerate Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)] overflow-hidden border-[#2B7BC4]/20">
        <div className="bg-gradient-to-r from-[#2B7BC4]/10 to-[#0EA5E9]/10 p-6 border-b border-[#2B7BC4]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0D2137]">AI Brand Analysis</h2>
              <p className="text-sm text-gray-600">Personalized strategy derived from your questionnaire responses.</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {isRegenerating ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <RefreshCw className="size-8 animate-spin text-[#2B7BC4] mb-4" />
              <p className="font-medium text-[#0D2137]">Regenerating your brand analysis...</p>
              <p className="text-sm text-gray-500 mt-1">This usually takes just a moment.</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-500 mb-1">Core Identity</p>
                <p className="text-lg font-medium text-[#0D2137]">"{analysis.ai_summary_line}"</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-[#0D2137] flex items-center gap-2 mb-3">
                    <span className="flex size-6 rounded-full bg-blue-100 items-center justify-center text-blue-700 text-xs">1</span>
                    Recommended Brand Tone
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.brand_tone.map(tone => (
                      <span key={tone} className="px-2.5 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-700">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0D2137] flex items-center gap-2 mb-3">
                    <span className="flex size-6 rounded-full bg-purple-100 items-center justify-center text-purple-700 text-xs">2</span>
                    Content Themes
                  </h3>
                  <ul className="space-y-2">
                    {analysis.content_themes.map(theme => (
                      <li key={theme} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="size-4 text-purple-600 shrink-0 mt-0.5" />
                        <span>{theme}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="font-semibold text-[#0D2137] mb-2">Audience Persona</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.audience_persona}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0D2137] mb-2">Goal Alignment</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.goal_alignment}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">
              <p>No analysis generated yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
