import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TeamCalendarEntry {
  id: string;
  scheduled_date: string;
  display_date: string;
  deliverable_type: string;
  client_name: string;
  status: string;
  linked_task_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  ready_for_review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const TYPE_ICONS: Record<string, string> = {
  poster: "P",
  reel: "R",
  story: "S",
  shoot_day: "SD",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function TeamCalendarPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/team`,
    { headers, cache: "no-store" }
  );

  const entries: TeamCalendarEntry[] = res.ok ? await res.json() : [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const entriesByDate: Record<string, TeamCalendarEntry[]> = {};
  for (const entry of entries) {
    const key = entry.display_date;
    if (!entriesByDate[key]) {
      entriesByDate[key] = [];
    }
    entriesByDate[key].push(entry);
  }

  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
          My Calendar
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          1-day pre-assignment view — entries shown on the day before their scheduled date.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--color-brand-dark)]">
            {monthName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Pre-assignment day
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
                />
              );
            }

            const dateKey = formatDateKey(new Date(currentYear, currentMonth, day));
            const dayEntries = entriesByDate[dateKey] || [];
            const isToday =
              day === now.getDate() &&
              currentMonth === now.getMonth() &&
              currentYear === now.getFullYear();

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${
                  isToday ? "bg-blue-50/50" : ""
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isToday
                      ? "text-[var(--color-brand)] font-bold"
                      : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <Link
                      key={entry.id}
                      href={
                        entry.linked_task_id
                          ? `/dashboard/tasks/${entry.linked_task_id}`
                          : "#"
                      }
                      className="block"
                    >
                      <div className="group flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-1 hover:bg-amber-100 transition-colors cursor-pointer">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-[8px] font-bold text-white shrink-0">
                          {TYPE_ICONS[entry.deliverable_type] || "?"}
                        </span>
                        <span className="text-[10px] font-medium text-amber-800 truncate">
                          {entry.client_name}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[10px] text-gray-500 text-center">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[var(--color-brand-dark)]">
              Upcoming Assignments
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {entries.slice(0, 10).map((entry) => (
              <Link
                key={entry.id}
                href={
                  entry.linked_task_id
                    ? `/dashboard/tasks/${entry.linked_task_id}`
                    : "#"
                }
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                    {TYPE_ICONS[entry.deliverable_type] || "?"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.deliverable_type.charAt(0).toUpperCase() +
                        entry.deliverable_type.slice(1)}{" "}
                      — {entry.client_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Due:{" "}
                      {new Date(entry.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_COLORS[entry.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {entry.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    Submit by{" "}
                    {new Date(entry.display_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500">No calendar entries assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}
