"use client"

import { useState } from "react"
import { toast } from "sonner"
import {

  Download,
  ArrowRight,
  Check,
  Sparkles,
  Crown,
} from "lucide-react"
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
  status: "paid" | "pending" | "failed"
  invoice: string
}

const CURRENT_PLAN: Plan = {
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

const PAYMENT_HISTORY: PaymentRecord[] = [
  { id: "pay_001", date: "2026-06-01", amount: 4999, status: "paid", invoice: "INV-2026-001" },
  { id: "pay_002", date: "2026-05-01", amount: 4999, status: "paid", invoice: "INV-2026-002" },
  { id: "pay_003", date: "2026-04-01", amount: 4999, status: "paid", invoice: "INV-2026-003" },
  { id: "pay_004", date: "2026-03-01", amount: 4999, status: "paid", invoice: "INV-2026-004" },
  { id: "pay_005", date: "2026-02-01", amount: 4999, status: "paid", invoice: "INV-2026-005" },
  { id: "pay_006", date: "2026-01-01", amount: 4999, status: "paid", invoice: "INV-2026-006" },
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
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
}

export default function PaymentsPage() {
  const [planChangeOpen, setPlanChangeOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  function handleDownloadReceipt(invoice: string) {
    toast.success(`Receipt for ${invoice} downloaded.`)
  }

  function handleChangePlan() {
    if (!selectedPlan || selectedPlan === CURRENT_PLAN.id) {
      setPlanChangeOpen(false)
      return
    }
    const plan = AVAILABLE_PLANS.find((p) => p.id === selectedPlan)
    toast.success(`Plan changed to ${plan?.name}. Changes take effect next billing cycle.`)
    setPlanChangeOpen(false)
    setSelectedPlan(null)
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
                  {CURRENT_PLAN.name}
                </h2>
                <Badge className="border bg-[#2B7BC4]/10 text-[#2B7BC4] border-[#2B7BC4]/20 text-xs">
                  Active
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#0D2137]">
                  {formatCurrency(CURRENT_PLAN.price)}
                </span>
                <span className="text-sm text-gray-500">
                  / {CURRENT_PLAN.period}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Next billing date: <span className="font-medium text-[#0D2137]">July 1, 2026</span>
              </p>
            </div>

            <Button
              variant="outline"
              className="border-[#2B7BC4] text-[#2B7BC4] hover:bg-[#2B7BC4] hover:text-white"
              onClick={() => {
                setSelectedPlan(CURRENT_PLAN.id)
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
            {CURRENT_PLAN.features.map((feature) => (
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
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500">Date</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Amount</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Invoice</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">
                  Receipt
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAYMENT_HISTORY.map((payment) => {
                const statusConfig = STATUS_BADGE[payment.status]
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
                    <TableCell className="text-sm text-gray-500 font-mono text-xs">
                      {payment.invoice}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment.invoice)}
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
                  plan.id === CURRENT_PLAN.id && "opacity-60 cursor-not-allowed"
                )}
                disabled={plan.id === CURRENT_PLAN.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.recommended && (
                      <Sparkles className="size-4 text-amber-500" />
                    )}
                    <span className="text-sm font-semibold text-[#0D2137]">
                      {plan.name}
                    </span>
                    {plan.id === CURRENT_PLAN.id && (
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || selectedPlan === CURRENT_PLAN.id}
              className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
