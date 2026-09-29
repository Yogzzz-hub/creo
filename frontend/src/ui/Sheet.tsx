import * as RadixDialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { HTMLAttributes } from "react";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;
export const SheetPortal = RadixDialog.Portal;

export function SheetOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={clsx(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export interface SheetContentProps extends RadixDialog.DialogContentProps {
  side?: "top" | "bottom" | "left" | "right";
}

export function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
  const sideStyles = {
    top: "inset-x-0 top-0 border-b border-[var(--surface-border)] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom:
      "inset-x-0 bottom-0 border-t border-[var(--surface-border)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    left: "inset-y-0 left-0 h-full w-3/4 border-r border-[var(--surface-border)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-md",
    right:
      "inset-y-0 right-0 h-full w-3/4 border-l border-[var(--surface-border)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <RadixDialog.Content
        className={clsx(
          "fixed z-50 gap-4 bg-[var(--surface-card)] text-[var(--surface-text)] p-6 shadow-2xl transition ease-in-out data-[state=closed]:duration-150 data-[state=open]:duration-200",
          sideStyles[side],
          className,
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close
          className="absolute right-4 top-4 rounded-sm p-1.5 opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--surface-muted)] hover:text-[var(--surface-text)]"
          aria-label="Close sheet"
        >
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </SheetPortal>
  );
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("flex flex-col space-y-2 text-left", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return (
    <RadixDialog.Title
      className={clsx(
        "text-lg font-semibold font-[var(--font-display)] text-[var(--surface-text)]",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return (
    <RadixDialog.Description
      className={clsx("text-sm text-[var(--surface-muted)]", className)}
      {...props}
    />
  );
}
