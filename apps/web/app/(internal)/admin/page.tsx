import Link from "next/link"
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
import {
  AlertTriangle,
  Users,
  AlertCircle,
  ListTodo,
  HeadphonesIcon,
} from "lucide-react"

const METRICS = [
  {
    label: "Active Clients",
    value: "24",
    icon: Users,
    change: "+3 this month",
    changeType: "positive" as const,
  },
  {
    label: "Open Escalations",
    value: "5",
    icon: AlertCircle,
    change: "2 SLA breaches",
    changeType: "negative" as const,
  },
  {
    label: "Today's Task Load",
    value: "45 Tasks",
    icon: ListTodo,
    change: "12 due today",
    changeType: "neutral" as const,
  },
  {
    label: "Open Tickets",
    value: "8",
    icon: HeadphonesIcon,
    change: "3 awaiting reply",
    changeType: "neutral" as const,
  },
]

const RECENT_ESCALATIONS = [
  {
    id: "ESC-042",
    client: "Brew & Bloom Cafe",
    issue: "Deliverable not received in 5 days",
    priority: "High",
    status: "Open",
    assignedTo: "Priya S.",
  },
  {
    id: "ESC-041",
    client: "TechNova Solutions",
    issue: "Instagram posts off-brand",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "Rahul M.",
  },
  {
    id: "ESC-040",
    client: "FreshCart",
    issue: "Missing calendar updates",
    priority: "Medium",
    status: "Open",
    assignedTo: "Ananya K.",
  },
]

const TASKS_OVERDUE = [
  {
    task: "Instagram Reel — Brew & Bloom",
    client: "Brew & Bloom Cafe",
    dueDate: "Jun 14",
    daysOverdue: 3,
    assignee: "Priya S.",
  },
  {
    task: "Blog Post Draft — TechNova",
    client: "TechNova Solutions",
    dueDate: "Jun 15",
    daysOverdue: 2,
    assignee: "Rahul M.",
  },
  {
    task: "Social Calendar — FreshCart",
    client: "FreshCart",
    dueDate: "Jun 16",
    daysOverdue: 1,
    assignee: "Ananya K.",
  },
  {
    task: "Ad Creative Set — StyleHaus",
    client: "StyleHaus",
    dueDate: "Jun 13",
    daysOverdue: 4,
    assignee: "Vikram D.",
  },
]

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "Critical":
      return "destructive"
    case "High":
      return "secondary"
    case "Medium":
      return "outline"
    default:
      return "default"
  }
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Warning: 2 active SLA breaches require immediate attention.
            </p>
            <Link
              href="/admin/escalations"
              className="mt-1 inline-block text-sm font-medium text-red-600 underline-offset-2 hover:underline"
            >
              View Escalations →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <metric.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0D2137]">
                {metric.value}
              </div>
              <p
                className={
                  metric.changeType === "negative"
                    ? "mt-1 text-xs font-medium text-red-600"
                    : "mt-1 text-xs text-muted-foreground"
                }
              >
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0D2137]">
              Recent Escalations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_ESCALATIONS.map((esc) => (
                  <TableRow key={esc.id}>
                    <TableCell className="font-mono text-xs">
                      {esc.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {esc.client}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {esc.issue}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(esc.priority)}>
                        {esc.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          esc.status === "In Progress"
                            ? "default"
                            : "outline"
                        }
                      >
                        {esc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {esc.assignedTo}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0D2137]">
              Tasks Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TASKS_OVERDUE.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 rounded-lg border border-red-100 bg-red-50/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0D2137]">
                      {task.task}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.client} · Due {task.dueDate} · {task.assignee}
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {task.daysOverdue}d overdue
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
