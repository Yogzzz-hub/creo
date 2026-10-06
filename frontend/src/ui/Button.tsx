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
        "bg-[#7FA0D6] text-white hover:bg-[#7FA0D6] shadow-xs active:scale-[0.98] transition-all font-semibold",
      secondary:
        "bg-white text-[#0B111C] border border-[#2A3446] hover:bg-[#161F2D] hover:border-[#7FA0D6]/40 active:bg-[#BCCCE6] font-medium shadow-xs",
      ghost:
        "bg-transparent text-[#0B111C] hover:bg-[#BCCCE6] active:bg-[#2A3446]/50",
      destructive: "bg-[#D8BF9B] text-white hover:bg-[#D8BF9B] active:opacity-95 shadow-xs",
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
