import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  ariaLabel?: string;
  className?: string;
  alignRight?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  alignRight = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        aria-label={ariaLabel || "Select option"}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-1.5 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-bold text-[#F1F5F9] shadow-2xs hover:border-[#7FA0D6]/60 hover:bg-[#161F2D] transition-all flex items-center justify-between gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/40 ${className}`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#97A0B3] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-[#7FA0D6]" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${alignRight ? "right-0" : "left-0"} top-full mt-1.5 min-w-[170px] w-full max-h-64 overflow-y-auto bg-[#161F2D]/95 backdrop-blur-xl border border-[#2A3446] rounded-2xl shadow-[0_16px_40px_rgba(5,8,16,0.9)] p-1.5 z-50 animate-scale-up space-y-1 scrollbar-thin`}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30 shadow-xs"
                    : "text-[#F1F5F9] hover:bg-[#161F2D] hover:text-[#7FA0D6]"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#7FA0D6] shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
