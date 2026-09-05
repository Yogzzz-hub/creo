"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export function TaskSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("sort") ?? "date";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (value === "date") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={14} className="text-[var(--color-text-muted)]" />
      <select
        value={current}
        onChange={handleChange}
        className="h-8 rounded-md border border-[var(--color-border)] bg-white px-2 pr-7 text-xs font-medium text-[var(--color-brand-dark)] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 cursor-pointer"
      >
        <option value="date">Sort by Due Date</option>
        <option value="priority">Sort by Priority</option>
      </select>
    </div>
  );
}
