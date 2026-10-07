import { useId } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/Select";

export interface CustomSelectOption { value: string; label: string; disabled?: boolean }
interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  ariaLabel?: string;
  className?: string;
  alignRight?: boolean;
  disabled?: boolean;
}
export function CustomSelect({ value, onChange, options, ariaLabel, className = "", alignRight = false, disabled }: CustomSelectProps) {
  const empty = `${useId()}-empty`;
  return <span className="inline-block min-w-0 max-w-full">
    <Select value={value || empty} onValueChange={next => onChange(next === empty ? "" : next)} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel || "Select option"} className={className}><SelectValue placeholder="Select an option" /></SelectTrigger>
      <SelectContent align={alignRight ? "end" : "start"}>{options.map(option => <SelectItem key={option.value} value={option.value || empty} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  </span>;
}
