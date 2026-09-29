import * as RadixToast from "@radix-ui/react-toast";
import { clsx } from "clsx";
import { X } from "lucide-react";

export const ToastProvider = RadixToast.Provider;

export function ToastViewport({ className, ...props }: RadixToast.ToastViewportProps) {
  return (
    <RadixToast.Viewport
      className={clsx(
        "fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className,
      )}
      {...props}
    />
  );
}

export interface ToastProps extends RadixToast.ToastProps {
  variant?: "default" | "settled" | "blocked" | "waiting";
}

export function Toast({ className, variant = "default", children, ...props }: ToastProps) {
  const variantStyles = {
    default: "border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--surface-text)]",
    settled:
      "border-[var(--color-settled)] bg-[var(--surface-card)] text-[var(--surface-text)] border-l-4",
    blocked:
      "border-[var(--color-blocked)] bg-[var(--surface-card)] text-[var(--surface-text)] border-l-4",
    waiting:
      "border-[var(--color-waiting)] bg-[var(--surface-card)] text-[var(--surface-text)] border-l-4",
  };

  return (
    <RadixToast.Root
      aria-live="polite"
      className={clsx(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-bottom-full",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
      <RadixToast.Close
        className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--surface-muted)] opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[var(--surface-text)]"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

export function ToastTitle({ className, ...props }: RadixToast.ToastTitleProps) {
  return (
    <RadixToast.Title
      className={clsx("text-sm font-semibold font-[var(--font-display)]", className)}
      {...props}
    />
  );
}

export function ToastDescription({ className, ...props }: RadixToast.ToastDescriptionProps) {
  return (
    <RadixToast.Description
      className={clsx("text-xs text-[var(--surface-muted)] mt-1", className)}
      {...props}
    />
  );
}
