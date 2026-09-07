import { clsx } from "clsx";
import { type HTMLAttributes, type ReactNode, useId } from "react";

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}

export function Field({
  label,
  error,
  helpText,
  required,
  children,
  className,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const inputId = `field-${generatedId}`;
  const errorId = error ? `error-${generatedId}` : undefined;
  const helpId = helpText ? `help-${generatedId}` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={clsx("flex flex-col space-y-1.5 text-left", className)} {...props}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[var(--surface-text)] flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-[var(--color-blocked)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id: inputId,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })}

      {error && (
        <p id={errorId} className="text-xs text-[var(--color-blocked)]">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p id={helpId} className="text-xs text-[var(--surface-muted)]">
          {helpText}
        </p>
      )}
    </div>
  );
}
