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
        "bg-nebula-glow text-white hover:bg-nebula-glow shadow-xs active:scale-[0.98] transition-all font-semibold",
      secondary:
        "bg-white text-nebula-navy border border-nebula-steel hover:bg-nebula-surface hover:border-nebula-glow/40 active:bg-nebula-periwinkle font-medium shadow-xs",
      ghost:
        "bg-transparent text-nebula-navy hover:bg-nebula-periwinkle active:bg-nebula-steel/50",
      destructive: "bg-nebula-sand text-white hover:bg-nebula-sand active:opacity-95 shadow-xs",
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
