import type { Ref } from "react";
import "./select.css";
import * as RadixSelect from "@radix-ui/react-select";
import { clsx } from "clsx";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({ className, children, ...props }: RadixSelect.SelectTriggerProps & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <RadixSelect.Trigger
      className={clsx(
        "creo-select-trigger flex min-h-[40px] w-full items-center justify-between rounded-xl border border-[#2A3446] bg-[#161F2D] px-3.5 py-2 text-sm text-white placeholder:text-[#97A0B3] disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-[#7FA0D6]/60 focus:outline-none focus:border-[#7FA0D6] focus:ring-2 focus:ring-[#7FA0D6]/20 cursor-pointer shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-70 transition-transform duration-200" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: RadixSelect.SelectContentProps) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        sideOffset={6}
        collisionPadding={12}
        position={position}
        className={clsx(
          "creo-select-menu relative z-[10050] max-h-96 min-w-[10rem] overflow-hidden rounded-2xl border border-[#2A3446] bg-[#161F2D] text-[#F8FAFC] shadow-2xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1 text-[#97A0B3] hover:text-white">
          <ChevronUp className="h-4 w-4" />
        </RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport
          className={clsx(
            "creo-select-viewport p-1.5",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1 text-[#97A0B3] hover:text-white">
          <ChevronDown className="h-4 w-4" />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }: RadixSelect.SelectItemProps) {
  return (
    <RadixSelect.Item
      className={clsx(
        "creo-select-item relative flex min-h-[38px] w-full cursor-pointer select-none items-center rounded-xl py-1.5 pl-8 pr-3 text-sm text-[#BCCCE6] outline-hidden hover:bg-[#1E293B] hover:text-white focus:bg-[#1E293B] focus:text-white data-[highlighted]:bg-[#1E293B] data-[highlighted]:text-white data-[state=checked]:bg-[#7FA0D6]/15 data-[state=checked]:text-[#7FA0D6] data-[state=checked]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-40 transition-colors",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-4 w-4 text-[#7FA0D6]" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export function SelectLabel({ className, ...props }: RadixSelect.SelectLabelProps) {
  return (
    <RadixSelect.Label
      className={clsx(
        "py-1.5 pl-8 pr-2 text-xs font-semibold text-[var(--surface-muted)]",
        className,
      )}
      {...props}
    />
  );
}
