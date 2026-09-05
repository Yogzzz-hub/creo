"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Download,
  Check,
  Crown,
  AlertCircle,
  MessageSquare,
  Copy,
  CheckCheck,
} from "lucide-react"
import { useSession } from "@/context/session-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useSubscription } from "@/context/subscription-context"
import { getApiUrl } from "@/lib/api-url"
import PaymentsLoading from "./loading"

const TEAM_PHONE = "+919941999415"
const TEAM_PHONE_DISPLAY = "+91 994 199 9415"
const WHATSAPP_PHONE = "919941999415"
const WHATSAPP_MESSAGE = "Hi, I would like to change my Creo plan."

interface Plan {
  id: string
  name: string
  display_name: string
  monthly_price: number
  poster_quota: number
  reel_quota: number
  story_quota: number
  revision_rounds: number
  has_dedicated_manager: boolean
  highlights: string[]
  is_recommended: boolean
  is_active: boolean
}

interface PaymentHistoryItem {
  id: string
  date: string
  amount: number
  status: string
  gateway: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Unpaid", className: "bg-rose-50 text-rose-700 border-rose-200" },
  suspended: { label: "Unpaid", className: "bg-rose-50 text-rose-700 border-rose-200" },
  lapsed: { label: "Lapsed", className: "bg-amber-50 text-amber-700 border-amber-200" },
  pending_verification: { label: "Pending", className: "bg-blue-50 text-blue-700 border-blue-200" },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function PaymentsPage() {
  const { token, loading: sessionLoading } = useSession()
  const { accountStatus } = useSubscription()
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [consultationModalOpen, setConsultationModalOpen] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)

  const isLapsed = accountStatus === "lapsed"

  function handleCopyPhone() {
    navigator.clipboard.writeText(TEAM_PHONE).then(() => {
      setPhoneCopied(true)
      toast.success("Phone number copied to clipboard")
      setTimeout(() => setPhoneCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (sessionLoading) return

    let isMounted = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    async function fetchPayments() {
      try {
        if (!token) {
          if (isMounted) setLoading(false)
          return
        }

        const [plansRes, historyRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/v1/plans`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }).catch(() => null),
          fetch(`${getApiUrl()}/api/v1/payments/history`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }).catch(() => null),
        ])

        let plans: Plan[] = []
        if (plansRes && plansRes.ok) {
          plans = await plansRes.json()
        }

        if (!historyRes || !historyRes.ok) {
          if (isMounted) setLoading(false)
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
        }[] = await historyRes.json()

        if (!isMounted) return

        const activeSub = data.find((s) => s.status === "active")
        if (activeSub) {
          const plan = plans.find((p) => p.id === activeSub.plan_id)
          if (plan) setCurrentPlan(plan)
        }

        setPaymentHistory(
          data.map((s) => ({
            id: s.id,
            date: s.created_at,
            amount: plans.find((p) => p.id === s.plan_id)?.monthly_price ?? 0,
            status: s.status,
            gateway: s.gateway,
          }))
        )
      } catch {
        // Silent fail — gracefully complete
      } finally {
        clearTimeout(timeoutId)
        if (isMounted) setLoading(false)
      }
    }

    fetchPayments()

    return () => {
      isMounted = false
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [token, sessionLoading])

  async function handleDownloadReceipt(subscriptionId: string) {
    if (!token) return
    try {
      const res = await fetch(
        `${getApiUrl()}/api/v1/payments/receipt/${subscriptionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        console.error("[Payments] receipt download failed:", res.status)
        toast.error("Failed to download receipt")
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch ? filenameMatch[1] : `creo-receipt-${subscriptionId.slice(0, 12)}.html`

      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      toast.success("Receipt downloaded")
    } catch (err) {
      console.error("[Payments] receipt download error:", err)
      toast.error("Failed to download receipt")
    }
  }

  // Graceful streaming skeleton while session or payment data is in flight
  if (loading || sessionLoading) {
    return <PaymentsLoading />
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
                  {currentPlan.display_name}
                </h2>
                <Badge className="border bg-[#2B7BC4]/10 text-[#2B7BC4] border-[#2B7BC4]/20 text-xs">
                  Active
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#0D2137]">
                  {formatCurrency(currentPlan.monthly_price)}
                </span>
                <span className="text-sm text-gray-500">
                  / month
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="border-[#2B7BC4] text-[#2B7BC4] hover:bg-[#2B7BC4] hover:text-white"
              disabled={isLapsed}
              onClick={() => setConsultationModalOpen(true)}
            >
              Change Plan
            </Button>
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[#0D2137] mb-3">
            Included in your plan
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {currentPlan.highlights.map((feature) => (
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
              <Download className="size-10 text-gray-300" />
              <h3 className="mt-3 text-sm font-semibold text-[#0D2137]">
                No payment history yet
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Your transactions will appear here once you make a payment.
              </p>
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

      <Dialog open={consultationModalOpen} onOpenChange={setConsultationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              Want to change a plan?
            </DialogTitle>
            <DialogDescription className="text-center">
              Chat with us on WhatsApp or copy our phone number below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <a
              href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90"
            >
              <MessageSquare className="size-4" />
              Chat on WhatsApp
            </a>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-sm font-medium text-[#0D2137] select-all">
                {TEAM_PHONE_DISPLAY}
              </span>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Copy phone number"
              >
                {phoneCopied ? (
                  <CheckCheck className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
