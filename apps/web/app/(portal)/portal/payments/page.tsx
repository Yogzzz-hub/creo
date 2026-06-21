"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Download,
  ArrowRight,
  Check,
  Sparkles,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  features: string[]
  recommended?: boolean
}

interface PaymentRecord {
  id: string
  date: string
  amount: number
  status: string
  gateway: string
}

const AVAILABLE_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter Plan",
    price: 2499,
    period: "month",
    features: [
      "6 Posters / month",
      "3 Reels / month",
      "6 Stories / month",
      "Content Calendar",
    ],
  },
  {
    id: "growth",
    name: "Growth Plan",
    price: 4999,
    period: "month",
    features: [
      "12 Posters / month",
      "6 Reels / month",
      "12 Stories / month",
      "Content Calendar",
      "Priority Support",
    ],
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 9999,
    period: "month",
    features: [
      "24 Posters / month",
      "12 Reels / month",
      "24 Stories / month",
      "Content Calendar",
      "Priority Support",
      "Dedicated Manager",
      "Instagram Publishing",
    ],
  },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending_payment: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  past_due: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
}

export default function PaymentsPage() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [planChangeOpen, setPlanChangeOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isChangingPlan, setIsChangingPlan] = useState(false)

  useEffect(() => {
    async function fetchPayments() {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/history`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        )

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data: {
          id: string
          plan_id: string
          status: string
          gateway: string
          current_period_start: string
          current_period_end: string
          created_at: string
        }[] = await res.json()

        const activeSub = data.find((s) => s.status === "active")
        if (activeSub) {
          const plan = AVAILABLE_PLANS.find((p) => p.id === activeSub.plan_id)
          if (plan) setCurrentPlan(plan)
        }

        setPaymentHistory(
          data.map((s) => ({
            id: s.id,
            date: s.created_at,
            amount: AVAILABLE_PLANS.find((p) => p.id === s.plan_id)?.price ?? 0,
            status: s.status,
            gateway: s.gateway,
          }))
        )
      } catch {
        // Silent fail — show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  function handleDownloadReceipt(invoice: string) {
    toast.success(`Receipt for ${invoice} downloaded.`)
  }

  async function handleChangePlan() {
    if (!selectedPlan || selectedPlan === currentPlan?.id) {
      setPlanChangeOpen(false)
      return
    }

    setIsChangingPlan(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Not authenticated")
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/change-plan`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ new_plan_id: selectedPlan }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to change plan")
      }

      const plan = AVAILABLE_PLANS.find((p) => p.id === selectedPlan)
      setCurrentPlan(plan ?? currentPlan)
      toast.success(`Plan changed to ${plan?.name}. Changes take effect next billing cycle.`)
      setPlanChangeOpen(false)
      setSelectedPlan(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change plan")
    } finally {
      setIsChangingPlan(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="size-4 animate-spin" />
          Loading payment data...
        </div>
      </div>
    )
  }

  if (!currentPlan) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your subscription and billing history.
          </p>
        </div>
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
              No active subscription
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You don&apos;t have an active plan yet. Sign up to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and billing history.
        </p>
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="border-l-4 border-[#2B7BC4] bg-[#E8F4FD] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-[#2B7BC4]" />
                <h2 className="text-lg font-bold text-[#0D2137]">
                  {currentPlan.name}
                </h2>
                <Badge className="border bg-[#2B7BC4]/10 text-[#2B7BC4] border-[#2B7BC4]/20 text-xs">
                  Active
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#0D2137]">
                  {formatCurrency(currentPlan.price)}
                </span>
                <span className="text-sm text-gray-500">
                  / {currentPlan.period}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="border-[#2B7BC4] text-[#2B7BC4] hover:bg-[#2B7BC4] hover:text-white"
              onClick={() => {
                setSelectedPlan(currentPlan.id)
                setPlanChangeOpen(true)
              }}
            >
              Change Plan
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[#0D2137] mb-3">
            Included in your plan
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {currentPlan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="size-4 shrink-0 text-[#2B7BC4]" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0D2137]">
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-gray-500">No payment history yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-medium text-gray-500">Date</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Gateway</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Receipt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => {
                  const statusConfig = STATUS_BADGE[payment.status] ?? STATUS_BADGE.active
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm text-[#0D2137]">
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-[#0D2137]">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border text-[10px] font-medium",
                            statusConfig.className
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 capitalize">
                        {payment.gateway}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                          className="text-[#2B7BC4] hover:text-[#2B7BC4]/80"
                        >
                          <Download className="size-3.5" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={planChangeOpen} onOpenChange={setPlanChangeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Your Plan</DialogTitle>
            <DialogDescription>
              Select a new plan. Changes will take effect at your next billing date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {AVAILABLE_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  selectedPlan === plan.id
                    ? "border-[#2B7BC4] bg-[#E8F4FD] ring-1 ring-[#2B7BC4]/20"
                    : "border-gray-200 hover:border-gray-300",
                  plan.id === currentPlan.id && "opacity-60 cursor-not-allowed"
                )}
                disabled={plan.id === currentPlan.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.recommended && (
                      <Sparkles className="size-4 text-amber-500" />
                    )}
                    <span className="text-sm font-semibold text-[#0D2137]">
                      {plan.name}
                    </span>
                    {plan.id === currentPlan.id && (
                      <Badge className="text-[10px] bg-gray-100 text-gray-500 border-gray-200">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-[#0D2137]">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-xs text-gray-500">/mo</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.features.slice(0, 3).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                    >
                      {feature}
                    </span>
                  ))}
                  {plan.features.length > 3 && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
                      +{plan.features.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPlanChangeOpen(false)
                setSelectedPlan(null)
              }}
              disabled={isChangingPlan}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || selectedPlan === currentPlan.id || isChangingPlan}
              className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            >
              {isChangingPlan ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Confirm Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
