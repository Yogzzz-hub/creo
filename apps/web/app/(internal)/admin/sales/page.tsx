"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface PipelineLead {
  id: string
  name: string
  contact: string
  plan: string
  stage: string
  value: string
  addedDate: string
}

const PIPELINE_STAGES = ["Lead", "Custom Proposal Sent", "Negotiation", "Closed Won"]

const STAGE_COLORS: Record<string, string> = {
  Lead: "border-blue-200 bg-blue-50",
  "Custom Proposal Sent": "border-amber-200 bg-amber-50",
  Negotiation: "border-violet-200 bg-violet-50",
  "Closed Won": "border-emerald-200 bg-emerald-50",
}

const STAGE_TEXT_COLORS: Record<string, string> = {
  Lead: "text-blue-700",
  "Custom Proposal Sent": "text-amber-700",
  Negotiation: "text-violet-700",
  "Closed Won": "text-emerald-700",
}

const MOCK_PIPELINE: PipelineLead[] = [
  { id: "LD-018", name: "GreenLeaf Organics", contact: "Meera Iyer", plan: "Starter", stage: "Lead", value: "₹7,999/mo", addedDate: "Jun 14" },
  { id: "LD-017", name: "SpiceRoot Restaurant", contact: "Vikram Joshi", plan: "Growth", stage: "Lead", value: "₹14,999/mo", addedDate: "Jun 12" },
  { id: "LD-016", name: "UrbanFit Studios", contact: "Nisha Agarwal", plan: "Pro", stage: "Custom Proposal Sent", value: "₹29,999/mo", addedDate: "Jun 10" },
  { id: "LD-015", name: "CloudSync Technologies", contact: "Rajesh Kumar", plan: "Custom", stage: "Custom Proposal Sent", value: "₹35,000/mo", addedDate: "Jun 8" },
  { id: "LD-014", name: "Bloom & Beyond", contact: "Tanya Mehra", plan: "Growth", stage: "Negotiation", value: "₹14,999/mo", addedDate: "Jun 5" },
  { id: "LD-013", name: "FreshCart Express", contact: "Arjun Reddy", plan: "Starter", stage: "Negotiation", value: "₹7,999/mo", addedDate: "Jun 3" },
  { id: "LD-012", name: "StyleHaus Premium", contact: "Rohan Gupta", plan: "Growth", stage: "Closed Won", value: "₹14,999/mo", addedDate: "May 28" },
  { id: "LD-011", name: "Brew & Bloom Cafe", contact: "Sarah Chen", plan: "Growth", stage: "Closed Won", value: "₹14,999/mo", addedDate: "May 22" },
]

interface PricingRequest {
  id: string
  client: string
  salesRep: string
  requestedPlan: string
  customPrice: string
  reason: string
  status: string
}

const MOCK_PRICING_REQUESTS: PricingRequest[] = [
  {
    id: "CPR-009",
    client: "CloudSync Technologies",
    salesRep: "Arjun Reddy",
    requestedPlan: "Custom Pro + Add-ons",
    customPrice: "₹35,000/mo",
    reason: "Enterprise client — needs 15 deliverables/mo + priority support",
    status: "Pending",
  },
  {
    id: "CPR-008",
    client: "UrbanFit Studios",
    salesRep: "Arjun Reddy",
    requestedPlan: "Pro + Extra Reels",
    customPrice: "₹33,999/mo",
    reason: "Heavy video content needs — 8 Reels/month instead of 4",
    status: "Pending",
  },
  {
    id: "CPR-007",
    client: "Bloom & Beyond",
    salesRep: "Neha Gupta",
    requestedPlan: "Growth (Annual)",
    customPrice: "₹1,49,999/yr",
    reason: "Annual commitment — requesting 10% discount vs monthly",
    status: "Pending",
  },
  {
    id: "CPR-006",
    client: "FreshCart Express",
    salesRep: "Arjun Reddy",
    requestedPlan: "Starter (6-month lock)",
    customPrice: "₹6,999/mo",
    reason: "Long-term commitment discount request",
    status: "Pending",
  },
]

export default function SalesAdminPage() {
  const [pricingRequests, setPricingRequests] = useState(MOCK_PRICING_REQUESTS)
  const [processingId, setProcessingId] = useState<string | null>(null)

  function handleAction(id: string, action: "Approved" | "Rejected") {
    setProcessingId(id)
    setTimeout(() => {
      setPricingRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: action } : r))
      )
      const req = pricingRequests.find((r) => r.id === id)
      setProcessingId(null)
      toast.success(
        action === "Approved" ? "Pricing approved" : "Pricing rejected",
        {
          description: `${req?.client} — ${req?.customPrice} has been ${action.toLowerCase()}.`,
        }
      )
    }, 500)
  }

  const groupedPipeline = PIPELINE_STAGES.map((stage) => ({
    stage,
    leads: MOCK_PIPELINE.filter((l) => l.stage === stage),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Sales Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline overview and custom pricing approvals
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#0D2137]">
          Sales Pipeline
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groupedPipeline.map((group) => (
            <div
              key={group.stage}
              className={`rounded-lg border-2 ${STAGE_COLORS[group.stage]} p-3`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3
                  className={`text-sm font-semibold ${STAGE_TEXT_COLORS[group.stage]}`}
                >
                  {group.stage}
                </h3>
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#0D2137] shadow-sm">
                  {group.leads.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg bg-white p-2.5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-[#0D2137]">
                      {lead.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.contact}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {lead.plan}
                      </Badge>
                      <span className="text-[10px] font-semibold text-[#0D2137]">
                        {lead.value}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Added {lead.addedDate}
                    </p>
                  </div>
                ))}
                {group.leads.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No leads in this stage
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#0D2137]">
          Custom Pricing Requests
        </h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">
                  Sales Rep
                </TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden lg:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell className="font-medium text-[#0D2137]">
                    {req.client}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {req.salesRep}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {req.requestedPlan}
                  </TableCell>
                  <TableCell className="font-semibold text-[#0D2137]">
                    {req.customPrice}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[240px] truncate text-xs text-muted-foreground">
                    {req.reason}
                  </TableCell>
                  <TableCell>
                    {req.status === "Pending" ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Pending
                      </span>
                    ) : req.status === "Approved" ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Rejected
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "Pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={processingId === req.id}
                          onClick={() => handleAction(req.id, "Approved")}
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={processingId === req.id}
                          onClick={() => handleAction(req.id, "Rejected")}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
