"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileImage,
  Film,
  Layers,
  MessageSquareWarning,
  CheckCircle2,
  Circle,
  ArrowRight,
  ShoppingCart,
  CalendarDays,
  Ticket,
  FileCheck,
  CreditCard,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/context/session-context"
import { cn } from "@/lib/utils"
import { TermsModal } from "@/components/portal/terms-modal"
import { PaymentModal } from "@/components/portal/payment-modal"

interface DashboardData {
  pending_deliverable_count: number
  open_ticket_count: number
  ai_summary_line: string | null
  onboarding_stage: number
}

const EMPTY_DASHBOARD: DashboardData = {
  pending_deliverable_count: 0,
  open_ticket_count: 0,
  ai_summary_line: null,
  onboarding_stage: 1,
}

const ONBOARDING_STEPS = [
  { label: "Account Created", stage: 1 },
  { label: "Terms Accepted", stage: 2 },
  { label: "Payment Done", stage: 3 },
  { label: "Questionnaire", stage: 4 },
  { label: "Active", stage: 5 },
]

const QUICK_ACCESS = [
  { label: "Review Deliverables", href: "/portal/deliverables", icon: FileCheck },
  { label: "View Calendar", href: "/portal/calendar", icon: CalendarDays },
  { label: "Buy Add-ons", href: "/portal/addons", icon: ShoppingCart },
  { label: "Raise a Ticket", href: "/portal/support", icon: Ticket },
]

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-4 w-32" />
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-6 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PortalDashboard() {
  const { user, token } = useSession()
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return

      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { data: profile } = await supabase
        .from("users")
        .select("terms_accepted, onboarding_stage, created_at")
        .eq("id", user.id)
        .single()

      setTermsAccepted(profile?.terms_accepted ?? false)
      setCreatedAt(profile?.created_at ?? null)
      setData({
        pending_deliverable_count: 0,
        open_ticket_count: 0,
        ai_summary_line: null,
        onboarding_stage: profile?.onboarding_stage ?? 1,
      })
      setLoading(false)
    }
    loadDashboard()
  }, [user])

  const effectiveStage = Math.max(
    data.onboarding_stage,
    termsAccepted ? 2 : 0,
    subscriptionActive ? 3 : 0,
  )

  useEffect(() => {
    if (!loading && effectiveStage === 1) {
      setTermsModalOpen(true)
    }
  }, [loading, effectiveStage])

  if (loading) {
    return <DashboardSkeleton />
  }

  const elapsedDays = createdAt
    ? Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    : 0
  const onboardingComplete = effectiveStage >= 5
  const withinWindow = elapsedDays < 7
  const showTracker = !onboardingComplete && withinWindow

  const completedSteps = ONBOARDING_STEPS.filter(
    (s) => s.stage <= effectiveStage
  ).length
  const progressPercent = (completedSteps / ONBOARDING_STEPS.length) * 100

  function handleTermsAccepted() {
    setTermsAccepted(true)
    setTermsModalOpen(false)
    setPaymentModalOpen(true)
  }

  return (
    <>
      <TermsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        onAccept={handleTermsAccepted}
      />
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onPaymentSuccess={() => setSubscriptionActive(true)}
      />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2137]">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back! Here&apos;s your account overview.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#2B7BC4]/10">
                <FileImage className="size-5 text-[#2B7BC4]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D2137]">
                  {data.pending_deliverable_count}
                </p>
                <p className="text-xs text-gray-500">Pending Deliverables</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                <MessageSquareWarning className="size-5 text-[#0EA5E9]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D2137]">
                  {data.open_ticket_count}
                </p>
                <p className="text-xs text-gray-500">Open Tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#6BAED6]/10">
                <Layers className="size-5 text-[#6BAED6]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D2137]">
                  {effectiveStage >= 5 ? "Active" : `${effectiveStage}/5`}
                </p>
                <p className="text-xs text-gray-500">Account Status</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#D97706]/10">
                <Film className="size-5 text-[#D97706]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D2137]">
                  {data.pending_deliverable_count > 0 ? "Review" : "All Clear"}
                </p>
                <p className="text-xs text-gray-500">Action Needed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {error ? (
            <Card className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 border-l-4 border-amber-400 bg-amber-50 p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                      Brand Summary
                    </p>
                    <p className="mt-2 text-sm text-amber-800 leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 border-l-4 border-[#2B7BC4] bg-[#E8F4FD] p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2B7BC4]/10">
                    <span className="text-lg">🏋️</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#2B7BC4]">
                      Brand Summary
                    </p>
                    <p className="mt-2 text-sm italic text-[#0D2137] leading-relaxed">
                      {data.ai_summary_line
                        ? `\u201C${data.ai_summary_line}\u201D`
                        : "\u201CYour brand analysis will appear here after onboarding.\u201D"}
                    </p>
                    <Link
                      href="/portal/account"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#2B7BC4] hover:underline"
                    >
                      Update profile
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showTracker && (
            <Card className="rounded-xl shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">
                  Onboarding Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-0 top-3 h-0.5 w-full bg-gray-200">
                    <div
                      className="h-full bg-[#065F46] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {ONBOARDING_STEPS.map((step) => {
                    const completed = step.stage <= effectiveStage
                    const isClickable =
                      (step.stage === 2 && effectiveStage === 1) ||
                      (step.stage === 3 && effectiveStage >= 2) ||
                      (step.stage === 4 && effectiveStage >= 3)
                    return (
                      <div
                        key={step.label}
                        className={cn(
                          "relative z-10 flex flex-col items-center",
                          isClickable && "cursor-pointer group"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                            completed
                              ? "border-[#065F46] bg-[#065F46] text-white"
                              : "border-gray-300 bg-white text-gray-400",
                            isClickable && "group-hover:border-[#2B7BC4] group-hover:bg-[#2B7BC4]/10 group-hover:text-[#2B7BC4]"
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <Circle className="size-3" />
                          )}
                        </div>
                        {step.stage === 2 && effectiveStage === 1 ? (
                          <button
                            type="button"
                            onClick={() => setTermsModalOpen(true)}
                            className="mt-2 w-16 text-center text-[10px] leading-tight font-medium text-[#065F46] transition-colors hover:text-[#2B7BC4] hover:underline cursor-pointer"
                          >
                            {step.label}
                          </button>
                        ) : step.stage === 3 ? (
                          <Link
                            href="/onboarding/payment"
                            className="mt-2 w-16 text-center text-[10px] leading-tight font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          >
                            {step.label}
                          </Link>
                        ) : step.stage === 4 ? (
                          <Link
                            href="/onboarding/questionnaire"
                            className="mt-2 w-16 text-center text-[10px] leading-tight font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          >
                            {step.label}
                          </Link>
                        ) : (
                          <p
                            className={cn(
                              "mt-2 w-16 text-center text-[10px] leading-tight transition-colors",
                              completed
                                ? "font-medium text-[#065F46]"
                                : "text-gray-400"
                            )}
                          >
                            {step.label}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {onboardingComplete && (
            <Card className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#065F46]/10">
                  <CheckCircle2 className="size-5 text-[#065F46]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0D2137]">
                    You&apos;re all set!
                  </p>
                  <p className="text-xs text-gray-500">
                    Onboarding is complete. Welcome to Creo.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {effectiveStage === 1 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <MessageSquareWarning className="size-5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">
                        Accept Terms to Continue
                      </p>
                      <p className="text-xs text-gray-500">
                        You must accept our Terms &amp; Conditions to proceed to payment.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTermsModalOpen(true)}
                    >
                      Review
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                ) : effectiveStage === 2 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <CreditCard className="size-5 shrink-0 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">
                        Payment Pending
                      </p>
                      <p className="text-xs text-gray-500">
                        Please complete your payment to activate your workspace.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      Pay Now
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                ) : effectiveStage === 3 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                    <FileCheck className="size-5 shrink-0 text-purple-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">
                        Complete Brand Questionnaire
                      </p>
                      <p className="text-xs text-gray-500">
                        Tell us about your brand so we can tailor your content strategy.
                      </p>
                    </div>
                    <Link href="/onboarding/questionnaire">
                      <Button variant="ghost" size="sm">
                        Start Brand Questionnaire
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                ) : data.pending_deliverable_count > 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <MessageSquareWarning className="size-5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">
                        {data.pending_deliverable_count} Deliverable{data.pending_deliverable_count !== 1 ? "s" : ""} awaiting approval
                      </p>
                      <p className="text-xs text-gray-500">
                        Review your latest content submissions.
                      </p>
                    </div>
                    <Link href="/portal/deliverables">
                      <Button variant="ghost" size="sm">
                        Review
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">
                        All caught up!
                      </p>
                      <p className="text-xs text-gray-500">
                        No pending deliverables to review.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACCESS.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:border-[#2B7BC4] hover:bg-[#E8F4FD]">
                      <item.icon className="size-6 text-[#2B7BC4]" />
                      <span className="text-xs font-medium text-[#0D2137]">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
