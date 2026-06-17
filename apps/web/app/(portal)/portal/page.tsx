"use client"

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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const METRICS = [
  { label: "Posters Delivered", value: 24, icon: FileImage, color: "#2B7BC4" },
  { label: "Reels Delivered", value: 12, icon: Film, color: "#0EA5E9" },
  { label: "Stories Delivered", value: 36, icon: Layers, color: "#6BAED6" },
  { label: "Open Tickets", value: 2, icon: MessageSquareWarning, color: "#D97706" },
]

const ONBOARDING_STEPS = [
  { label: "Account Created", completed: true },
  { label: "Payment", completed: true },
  { label: "Content Plan Received", completed: false },
  { label: "Plan Approved", completed: false },
]

const QUICK_ACCESS = [
  { label: "Review Deliverables", href: "/portal/deliverables", icon: FileCheck },
  { label: "View Calendar", href: "/portal/calendar", icon: CalendarDays },
  { label: "Buy Add-ons", href: "/portal/addons", icon: ShoppingCart },
  { label: "Raise a Ticket", href: "/portal/support", icon: Ticket },
]

export default function PortalDashboard() {
  return (
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
        {METRICS.map((metric) => (
          <Card
            key={metric.label}
            className="rounded-xl shadow-[var(--shadow-card)]"
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${metric.color}15` }}
              >
                <metric.icon
                  className="size-5"
                  style={{ color: metric.color }}
                />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D2137]">
                  {metric.value}
                </p>
                <p className="text-xs text-gray-500">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                  &ldquo;Energetic voice, targeting gen-z fitness enthusiasts,
                  focused on engagement.&rdquo;
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
                  style={{ width: "50%" }}
                />
              </div>

              {ONBOARDING_STEPS.map((step, index) => (
                <div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2",
                      step.completed
                        ? "border-[#065F46] bg-[#065F46] text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    )}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Circle className="size-3" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-2 w-16 text-center text-[10px] leading-tight",
                      step.completed
                        ? "font-medium text-[#065F46]"
                        : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0D2137]">
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <MessageSquareWarning className="size-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0D2137]">
                    1 Deliverable awaiting approval
                  </p>
                  <p className="text-xs text-gray-500">
                    &ldquo;Instagram Reel — Gym Transformation&rdquo;
                  </p>
                </div>
                <Link href="/portal/deliverables">
                  <Button variant="ghost" size="sm">
                    Review
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
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
  )
}
