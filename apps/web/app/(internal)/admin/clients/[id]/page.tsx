"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Sparkles,
  Target,
  Users,
  Clock,
  FileImage,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

const MOCK_CLIENTS: Record<
  string,
  {
    id: string
    businessName: string
    ownerName: string
    email: string
    phone: string
    onboardingStage: string
    plan: string
    mrr: string
    nextBilling: string
    aiAnalysis: string
    contentGoals: string[]
    assignedDesigner: string
    assignedEditor: string
    joinDate: string
  }
> = {
  "1": {
    id: "1",
    businessName: "Brew & Bloom Cafe",
    ownerName: "Sarah Chen",
    email: "sarah@brewandbloom.in",
    phone: "+91 98765 43210",
    onboardingStage: "Complete",
    plan: "Growth",
    mrr: "₹14,999",
    nextBilling: "Jul 15, 2026",
    aiAnalysis:
      "Brew & Bloom is a specialty coffee roaster and botanical cafe targeting urban millennials (25-38) who value artisanal experiences. Their visual identity leans warm and organic with earthy tones. Key differentiators: single-origin beans, living plant walls, and latte art workshops. Content should emphasize craft, community, and sustainability.",
    contentGoals: [
      "Increase Instagram engagement by 40% in 3 months",
      "Drive foot traffic via location-tagged Reels",
      "Build email list through lead magnet content",
      "Establish thought leadership in specialty coffee",
    ],
    assignedDesigner: "Priya Sharma",
    assignedEditor: "Rahul Mehta",
    joinDate: "Mar 22, 2026",
  },
  "2": {
    id: "2",
    businessName: "TechNova Solutions",
    ownerName: "Amit Patel",
    email: "amit@technova.io",
    phone: "+91 87654 32109",
    onboardingStage: "Complete",
    plan: "Pro",
    mrr: "₹29,999",
    nextBilling: "Jul 15, 2026",
    aiAnalysis:
      "TechNova is a B2B SaaS company selling AI-powered analytics to mid-market enterprises. Their brand voice is authoritative yet approachable. Visual identity uses a tech-forward palette (deep blues, electric accents). Content should focus on ROI-driven case studies, product walkthroughs, and industry insights.",
    contentGoals: [
      "Generate 50 MQLs per month via content",
      "Publish 2 case studies monthly",
      "Grow LinkedIn following to 10K",
      "Reduce customer acquisition cost by 20%",
    ],
    assignedDesigner: "Ananya Kumar",
    assignedEditor: "Vikram Desai",
    joinDate: "Feb 10, 2026",
  },
  "3": {
    id: "3",
    businessName: "FreshCart",
    ownerName: "Meera Iyer",
    email: "meera@freshcart.co",
    phone: "+91 76543 21098",
    onboardingStage: "Complete",
    plan: "Starter",
    mrr: "₹7,999",
    nextBilling: "Jul 15, 2026",
    aiAnalysis:
      "FreshCart is a hyperlocal grocery delivery app competing in Tier-2 Indian cities. Brand identity is fresh, vibrant, and trust-focused. Content should emphasize speed, freshness guarantees, and local sourcing. Visual style uses bright greens and clean product photography.",
    contentGoals: [
      "Build brand awareness in 3 new cities",
      "Achieve 5K app installs per month",
      "Create shareable recipe content",
      "Highlight local farmer partnerships",
    ],
    assignedDesigner: "Priya Sharma",
    assignedEditor: "Ananya Kumar",
    joinDate: "Apr 5, 2026",
  },
}

const TIMELINE_EVENTS = [
  {
    date: "Jun 12, 2026",
    time: "2:30 PM",
    title: "Deliverable #102 Approved",
    description: "Instagram carousel — Summer Menu Launch",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    date: "Jun 10, 2026",
    time: "11:15 AM",
    title: "Support Ticket Resolved",
    description: "Ticket #089 — Color palette adjustment request",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    date: "Jun 8, 2026",
    time: "9:00 AM",
    title: "Escalation Opened",
    description: "SLA Breach: Deliverable #101 delayed by 2 days",
    icon: AlertCircle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  {
    date: "Jun 5, 2026",
    time: "4:45 PM",
    title: "Deliverable #101 Submitted",
    description: "Blog post — 'Why Single-Origin Matters'",
    icon: FileImage,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    date: "Jun 1, 2026",
    time: "10:00 AM",
    title: "Monthly Content Calendar Published",
    description: "June 2026 — 12 posts, 4 Reels, 2 carousels",
    icon: Calendar,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
  },
  {
    date: "May 28, 2026",
    time: "3:20 PM",
    title: "Payment Confirmed",
    description: "₹14,999 — Growth Plan (Monthly)",
    icon: CreditCard,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    date: "May 20, 2026",
    time: "1:00 PM",
    title: "Onboarding Complete",
    description: "Questionnaire submitted, AI analysis generated",
    icon: Sparkles,
    iconColor: "text-[#2B7BC4]",
    iconBg: "bg-blue-100",
  },
  {
    date: "Mar 22, 2026",
    time: "11:30 AM",
    title: "Account Created",
    description: "Signed up via Google OAuth",
    icon: Users,
    iconColor: "text-[#0D2137]",
    iconBg: "bg-gray-100",
  },
]

export default function ClientProfilePage() {
  const params = useParams()
  const id = params.id as string
  const client = MOCK_CLIENTS[id] || MOCK_CLIENTS["1"]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clients"
          className="flex size-8 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-[#0D2137]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            {client.businessName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client.ownerName} · Member since {client.joinDate}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Building2 className="size-4 text-muted-foreground" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Business Name
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.businessName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Owner</span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.ownerName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm font-medium text-[#2B7BC4] hover:underline"
                >
                  {client.email}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.phone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Onboarding
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {client.onboardingStage}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <CreditCard className="size-4 text-muted-foreground" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Current Plan
                </span>
                <Badge variant="outline">{client.plan}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Monthly Revenue
                </span>
                <span className="text-sm font-bold text-[#0D2137]">
                  {client.mrr}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Next Billing
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.nextBilling}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Sparkles className="size-4 text-muted-foreground" />
                AI Brand Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {client.aiAnalysis}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Target className="size-4 text-muted-foreground" />
                Content Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {client.contentGoals.map((goal, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#2B7BC4]" />
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Users className="size-4 text-muted-foreground" />
                Team Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Graphic Designer
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.assignedDesigner}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Video Editor
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.assignedEditor}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Clock className="size-4 text-muted-foreground" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative ml-3 border-l-2 border-border pl-6">
                {TIMELINE_EVENTS.map((event, idx) => {
                  const Icon = event.icon
                  return (
                    <div key={idx} className="relative pb-8 last:pb-0">
                      <div
                        className={`absolute -left-[31px] flex size-6 items-center justify-center rounded-full ${event.iconBg}`}
                      >
                        <Icon className={`size-3 ${event.iconColor}`} />
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-sm font-medium text-[#0D2137]">
                          {event.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {event.date} · {event.time}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
