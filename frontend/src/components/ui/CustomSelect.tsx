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
        className={`px-3.5 py-1.5 rounded-xl border border-nebula-steel bg-nebula-surface text-xs font-bold text-slate-100 shadow-2xs hover:border-nebula-glow/60 hover:bg-nebula-surface transition-all flex items-center justify-between gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-nebula-glow/40 ${className}`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-nebula-mist transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-nebula-glow" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${alignRight ? "right-0" : "left-0"} top-full mt-1.5 min-w-[170px] w-full max-h-64 overflow-y-auto bg-nebula-surface/95 backdrop-blur-xl border border-nebula-steel rounded-2xl shadow-[0_16px_40px_rgba(5,8,16,0.9)] p-1.5 z-50 animate-scale-up space-y-1 scrollbar-thin`}>
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
                    ? "bg-nebula-glow/20 text-nebula-glow border border-nebula-glow/30 shadow-xs"
                    : "text-slate-100 hover:bg-nebula-surface hover:text-nebula-glow"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-nebula-glow shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
