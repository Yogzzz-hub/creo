import * as RadixTabs from "@radix-ui/react-tabs";
import { clsx } from "clsx";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={clsx(
        "inline-flex h-11 items-center justify-center rounded-lg bg-[var(--surface-hover)] p-1 text-[var(--surface-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={clsx(
        "inline-flex min-h-[36px] min-w-[44px] items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--surface-card)] data-[state=active]:text-[var(--surface-text)] data-[state=active]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return (
    <RadixTabs.Content className={clsx("mt-2 ring-offset-background", className)} {...props} />
  );
}
