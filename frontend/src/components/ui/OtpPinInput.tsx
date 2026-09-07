import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";

interface OtpPinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  showDemoFill?: boolean;
}

export function OtpPinInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  hasError = false,
}: OtpPinInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Split current value into array of single chars
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  // Auto focus first empty input or initial input
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      const firstEmptyIdx = digits.findIndex((d) => !d);
      const targetIdx = firstEmptyIdx === -1 ? length - 1 : firstEmptyIdx;
      inputRefs.current[targetIdx]?.focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      // User cleared input
      const next = digits.slice();
      next[index] = "";
      const updated = next.join("");
      onChange(updated);
      return;
    }

    // Single digit entered
    const digit = val.slice(-1);
    const next = digits.slice();
    next[index] = digit;
    const updated = next.join("");
    onChange(updated);

    // Auto advance focus to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (updated.length === length && onComplete) {
      onComplete(updated);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current is already empty, move to previous and clear it
        e.preventDefault();
        const next = digits.slice();
        next[index - 1] = "";
        const updated = next.join("");
        onChange(updated);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const nextFocusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[nextFocusIdx]?.focus();

    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 6 Digit Input Group */}
      <motion.div
        animate={hasError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-2 sm:gap-2.5 w-full"
      >
        {Array.from({ length }).map((_, i) => {
          const isFilled = Boolean(digits[i]);
          return (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i] || ""}
              disabled={disabled}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl border transition-all select-all outline-none ${
                hasError
                  ? "border-red-400 bg-red-50/50 text-red-600 focus:ring-4 focus:ring-red-100"
                  : isFilled
                  ? "border-[#2B7BC4] bg-[#F0F7FF] text-[#0D2137] shadow-xs shadow-[#2B7BC4]/10"
                  : "border-slate-200 bg-slate-50/70 text-[#0D2137] hover:border-slate-300 focus:border-[#2B7BC4] focus:bg-white focus:ring-4 focus:ring-[#2B7BC4]/15"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          );
        })}
      </motion.div>

    </div>
  );
}
