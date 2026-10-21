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
        "bg-app-accent text-white hover:bg-app-accent shadow-xs active:scale-[0.98] transition-all font-semibold",
      secondary:
        "bg-hi text-app-base border border-app-line hover:bg-app-surface hover:border-app-accent/40 active:bg-app-accent-soft font-medium shadow-xs",
      ghost:
        "bg-transparent text-app-base hover:bg-app-accent-soft active:bg-app-line/50",
      destructive: "bg-app-warm text-white hover:bg-app-warm active:opacity-95 shadow-xs",
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
