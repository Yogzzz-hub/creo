"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  MessageSquare,
  FileText,
  Video,

  BarChart,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Search,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/context/session-context"
import { useSubscription } from "@/context/subscription-context"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { TermsModal } from "@/components/portal/terms-modal"
import { PaymentModal } from "@/components/portal/payment-modal"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export interface DashboardData {
  pending_deliverable_count: number
  open_ticket_count: number
  ai_summary_line: string | null
  onboarding_stage: number
  brand_summary: string | null
}

const EMPTY_DASHBOARD: DashboardData = {
  pending_deliverable_count: 0,
  open_ticket_count: 0,
  ai_summary_line: null,
  onboarding_stage: 1,
  brand_summary: null,
}

export default function PortalDashboardClient({
  initialData,
  serverToken,
}: {
  initialData?: DashboardData | null
  serverToken?: string
}) {
  const { user, token, loading: sessionLoaded } = useSession()
  const { refresh: refreshSubscription, onboardingStage: contextOnboardingStage, loading: subscriptionLoading, accountStatus: contextAccountStatus } = useSubscription()
  const router = useRouter()
  const [data, setData] = useState<DashboardData>(initialData || EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const subscriptionActive = contextAccountStatus === "active"
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      const activeToken = token || serverToken
      if (!user || !activeToken) return

      try {
        const { apiFetch } = await import("@/lib/api")
        const dashboard = await apiFetch("/api/v1/portal/dashboard", {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }) as DashboardData

        setData({
          pending_deliverable_count: dashboard.pending_deliverable_count ?? 0,
          open_ticket_count: dashboard.open_ticket_count ?? 0,
          ai_summary_line: dashboard.ai_summary_line ?? null,
          onboarding_stage: dashboard.onboarding_stage ?? 1,
          brand_summary: dashboard.ai_summary_line ?? null,
        })

        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: profile } = await supabase
          .from("users")
          .select("terms_accepted, onboarding_stage, created_at, brand_summary")
          .eq("auth_id", user.id)
          .single()

        setTermsAccepted(profile?.terms_accepted ?? false)
        setCreatedAt(profile?.created_at ?? null)
      } catch (err) {
        console.error("Failed to load dashboard", err)
        setError("Unable to load your dashboard summary right now.")
      } finally {
        setLoading(false)
        refreshSubscription()
      }
    }
    loadDashboard()
  }, [user, token, serverToken, refreshSubscription])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "true") {
      setTermsAccepted(true)

      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())

      // Explicitly refresh the global subscription/onboarding state
      refreshSubscription()
    }
  }, [refreshSubscription])

  async function handleGenerateBrandSummary() {
    if (!user) return
    setGenerating(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error } = await supabase.functions.invoke("generate-brand-summary", {
        body: { userId: user.id }
      })
      if (error) throw error
      window.location.reload()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const effectiveStage = Math.max(
    contextOnboardingStage,
    termsAccepted ? 2 : 0,
    subscriptionActive ? 3 : 0,
  )

  if (loading || subscriptionLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <AlertCircle className="size-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  function handleTermsAccepted() {
    setTermsAccepted(true)
    setTermsModalOpen(false)
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <TermsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        onAccept={handleTermsAccepted}
      />
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onPaymentSuccess={() => refreshSubscription()}
      />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
            <p className="text-muted-foreground mt-1">
              {data.ai_summary_line || "Welcome back to your client portal."}
            </p>
          </div>
          {effectiveStage >= 5 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                System Active
              </div>
            </div>
          )}
        </div>

        {/* Action Required Banner */}
        {effectiveStage < 5 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertCircle className="size-4 text-amber-600" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Please complete your account setup to activate your dashboard.
            </AlertDescription>
          </Alert>
        )}

        {/* Onboarding Progress Card */}
        {effectiveStage < 5 && (
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Setup Progress
                  </CardTitle>
                  <CardDescription>Complete these steps to start generating leads</CardDescription>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {Math.round((effectiveStage / 5) * 100)}%
                </div>
              </div>
              <div className="w-full bg-primary/10 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 ease-in-out"
                  style={{ width: `${(effectiveStage / 5) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-6 bg-card">
              <StepItem
                number={1}
                title="Create Account"
                description="Verified email"
                status="completed"
              />
              <StepItem
                number={2}
                title="Service Agreement"
                description="Review and accept terms"
                status={effectiveStage >= 2 ? "completed" : "current"}
                onClick={() => setTermsModalOpen(true)}
              />
              <StepItem
                number={3}
                title="Payment Setup"
                description="Activate subscription"
                status={
                  effectiveStage >= 3 ? "completed" : effectiveStage >= 2 ? "current" : "upcoming"
                }
                onClick={() => router.push("/onboarding/payment")}
              />
              <StepItem
                number={4}
                title="Brand Profile"
                description="Complete questionnaire"
                status={
                  effectiveStage >= 4 ? "completed" : effectiveStage >= 3 ? "current" : "upcoming"
                }
                onClick={() => router.push("/onboarding/questionnaire")}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Upcoming Posts"
            value={data.pending_deliverable_count.toString()}
            description="Scheduled for this week"
            icon={<Calendar className="size-4 text-muted-foreground" />}
          />
          <StatCard
            title="Open Tickets"
            value={data.open_ticket_count.toString()}
            description="Awaiting response"
            icon={<HelpCircle className="size-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest workspace updates</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {createdAt && (
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <CheckCircle2 className="size-4 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">Account Created</p>
                      <p className="text-sm text-muted-foreground">
                        Welcome to Creo! Complete setup to get started.
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                )}
                {!termsAccepted && (
                  <div className="flex items-center">
                    <div className="bg-amber-500/10 p-2 rounded-full mr-4">
                      <AlertCircle className="size-4 text-amber-500" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">Terms Review Required</p>
                      <p className="text-sm text-muted-foreground">
                        Please review and accept our service agreement.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTermsModalOpen(true)}>
                      Review
                      <ArrowRight className="size-3 ml-2" />
                    </Button>
                  </div>
                )}
                {termsAccepted && !subscriptionActive && (
                  <div className="flex items-center">
                    <div className="bg-amber-500/10 p-2 rounded-full mr-4">
                      <CreditCard className="size-4 text-amber-500" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">Payment Required</p>
                      <p className="text-sm text-muted-foreground">
                        Activate your subscription to unlock services.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/onboarding/payment")}
                    >
                      Pay Now
                      <ArrowRight className="size-3 ml-2" />
                    </Button>
                  </div>
                )}
                {subscriptionActive && data.onboarding_stage < 4 && (
                  <div className="flex items-center">
                    <div className="bg-blue-500/10 p-2 rounded-full mr-4">
                      <FileText className="size-4 text-blue-500" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">Complete Questionnaire</p>
                      <p className="text-sm text-muted-foreground">
                        Help us understand your brand and goals.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/onboarding/questionnaire")}
                    >
                      Start
                      <ArrowRight className="size-3 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Frequently accessed resources</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickLink
                icon={<Search className="size-4" />}
                title="Brand Summary"
                description={
                  data.brand_summary
                    ? "View your AI-generated brand profile"
                    : "Complete questionnaire to generate"
                }
                href="/portal/account"
              />
              <QuickLink
                icon={<MessageSquare className="size-4" />}
                title="Support Chat"
                description="Talk with our team"
                href="/portal/support"
              />
            </CardContent>
            {!data.brand_summary && effectiveStage >= 4 && (
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleGenerateBrandSummary}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <div className="size-4 mr-2 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-2" />
                      Generate Brand Summary
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend?: string
}) {
  return (
    <Card className="group rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-[#2B7BC4]/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className="p-2 rounded-xl bg-[#E8F4FD] text-[#2B7BC4] transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#0D2137]">{value}</div>
        <p className="text-xs text-slate-500 flex items-center mt-1">
          {trend && (
            <span className="text-emerald-500 font-medium mr-1">{trend}</span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function StepItem({
  number,
  title,
  description,
  status,
  onClick,
}: {
  number: number
  title: string
  description: string
  status: "completed" | "current" | "upcoming"
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center text-center p-4 rounded-xl transition-all duration-200",
        status === "current" && "bg-primary/5 cursor-pointer hover:bg-primary/10 hover:scale-[1.02]",
        status === "upcoming" && "opacity-50 grayscale",
        onClick && status !== "upcoming" && "cursor-pointer hover:bg-accent hover:scale-[1.02]",
      )}
      onClick={status !== "upcoming" ? onClick : undefined}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold mb-3 transition-colors",
          status === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : status === "current"
              ? "border-primary text-primary"
              : "border-muted-foreground text-muted-foreground",
        )}
      >
        {status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : number}
      </div>
      <h3
        className={cn(
          "text-sm font-semibold mb-1",
          status === "completed" ? "text-foreground" : "text-foreground",
        )}
      >
        {title}
      </h3>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
    </div>
  )
}

function QuickLink({
  icon,
  title,
  description,
  href,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  disabled?: boolean
}) {
  return (
    <a
      href={disabled ? undefined : href}
      className={cn(
        "group flex items-center p-3.5 rounded-xl border border-slate-200/80 bg-white transition-all duration-200 shadow-2xs",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-[#E8F4FD]/40 hover:border-[#2B7BC4]/40 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer",
      )}
    >
      <div className="bg-[#E8F4FD] p-2.5 rounded-lg mr-4 text-[#2B7BC4] transition-all duration-200 group-hover:bg-[#2B7BC4] group-hover:text-white group-hover:scale-105">
        {icon}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-[#0D2137] leading-none group-hover:text-[#2B7BC4] transition-colors">
          {title}
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {!disabled && (
        <ArrowRight className="size-4 text-slate-400 ml-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#2B7BC4]" />
      )}
    </a>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Skeleton className="h-9 w-[250px] mb-2" />
          <Skeleton className="h-5 w-[400px]" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px] rounded-xl" />
          <Skeleton className="col-span-3 h-[400px] rounded-xl" />
        </div>
      </div>
    </div>
  )
}
