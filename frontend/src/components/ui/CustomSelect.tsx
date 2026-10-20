import { useId, type ReactNode } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/Select";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  ariaLabel?: string;
  className?: string;
  alignRight?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  icon?: ReactNode;
}

export function CustomSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  alignRight = false,
  disabled,
  size = "md",
  placeholder = "Select an option",
  icon,
}: CustomSelectProps) {
  const empty = `${useId()}-empty`;
  const isSm = size === "sm";

  return (
    <span className={`inline-block min-w-0 max-w-full ${className.includes("w-full") ? "w-full" : ""}`}>
      <Select
        value={value || empty}
        onValueChange={(next) => onChange(next === empty ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={ariaLabel || "Select option"}
          className={`flex items-center gap-2 rounded-xl transition-all ${
            isSm
              ? "creo-select-trigger--sm !min-h-[32px] !h-8 !px-3 !py-1 !text-xs !rounded-xl !bg-[#161F2D] !border-[#2A3446] hover:!border-[#7FA0D6]/60 text-white font-medium"
              : "!rounded-xl !bg-[#161F2D] !border-[#2A3446] hover:!border-[#7FA0D6]/60 text-white font-medium"
          } ${className}`}
        >
          {icon && <span className="shrink-0 text-[#97A0B3]">{icon}</span>}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          align={alignRight ? "end" : "start"}
          className="!rounded-2xl !bg-[#161F2D] !border-[#2A3446] shadow-2xl p-1.5"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value || empty}
              disabled={option.disabled}
              className={
                isSm
                  ? "creo-select-item--sm !min-h-[32px] !py-1.5 !px-2.5 !pl-7 !text-xs !rounded-lg"
                  : "!rounded-xl !py-2 !px-3 !pl-8"
              }
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

