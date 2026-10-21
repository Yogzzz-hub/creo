import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export interface CurvedSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface CurvedSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CurvedSelectOption[];
  ariaLabel?: string;
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CurvedSelect({
  value,
  onChange,
  options,
  ariaLabel = "Select option",
  triggerClassName = "",
  placeholder = "Select...",
  disabled = false,
}: CurvedSelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-between gap-2.5 rounded-xl bg-app-base border border-app-line hover:border-app-accent px-3 py-1.5 text-xs text-hi outline-none transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(127,160,214,0.2)] focus:border-app-accent focus:ring-1 focus:ring-[#7FA0D6]/50 ${triggerClassName}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-3.5 h-3.5 text-app-accent opacity-80 shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          sideOffset={6}
          position="popper"
          className="z-[99999] min-w-[170px] overflow-hidden rounded-2xl bg-app-surface border-2 border-app-accent shadow-[0_20px_40px_rgb(var(--shadow-rgb)/calc(0.85*var(--shadow-k))),0_0_25px_rgba(127,160,214,0.3)] p-1.5 text-hi animate-in fade-in-0 zoom-in-95"
        >
          <RadixSelect.Viewport className="space-y-0.5">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none select-none transition-all cursor-pointer hover:bg-app-accent/20 hover:text-hi focus:bg-[#7FA0D6]/20 focus:text-white data-[state=checked]:bg-[#7FA0D6]/25 data-[state=checked]:text-[#BCCCE6] data-[state=checked]:font-bold"
              >
                <div className="flex items-center gap-2">
                  {opt.color && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />}
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                </div>
                <RadixSelect.ItemIndicator>
                  <Check className="w-3.5 h-3.5 text-app-accent shrink-0 ml-2" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
