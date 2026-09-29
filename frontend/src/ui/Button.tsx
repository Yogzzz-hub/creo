import { clsx } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] min-w-[44px] rounded-md";

    const variantStyles = {
      primary:
        "bg-[#2B7BC4] text-white hover:bg-[#1A5EA8] shadow-xs active:scale-[0.98] transition-all font-semibold",
      secondary:
        "bg-white text-[#0D2137] border border-[#C9DFF0] hover:bg-[#F0F7FD] hover:border-[#2B7BC4]/40 active:bg-[#E8F4FD] font-medium shadow-xs",
      ghost:
        "bg-transparent text-[#0D2137] hover:bg-[#E8F4FD] active:bg-[#C9DFF0]/50",
      destructive: "bg-[#991B1B] text-white hover:bg-[#7F1D1D] active:opacity-95 shadow-xs",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
