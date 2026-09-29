import * as RadixDialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { HTMLAttributes } from "react";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogClose = RadixDialog.Close;

export function DialogOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={clsx(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({ className, children, ...props }: RadixDialog.DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={clsx(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--surface-text)] p-6 shadow-2xl duration-150 rounded-lg sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close
          className="absolute right-4 top-4 rounded-sm p-1.5 opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--surface-muted)] hover:text-[var(--surface-text)]"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return (
    <RadixDialog.Title
      className={clsx(
        "text-lg font-semibold leading-none tracking-tight font-[var(--font-display)] text-[var(--surface-text)]",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return (
    <RadixDialog.Description
      className={clsx("text-sm text-[var(--surface-muted)]", className)}
      {...props}
    />
  );
}
