import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  LogOut,
  PackageMinus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

export type ConfirmTone = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title: string;
  description?: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  icon?: "danger" | "warning" | "logout" | "remove_plan" | "trash" | "info" | "success" | "check";
  isAlertOnly?: boolean;
  className?: string;
}

export type AlertInput =
  | string
  | {
      title: string;
      description?: string;
      details?: string[];
      confirmText?: string;
      tone?: ConfirmTone;
      icon?: "danger" | "warning" | "logout" | "remove_plan" | "trash" | "info" | "success" | "check";
    };

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (input: AlertInput) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export function useAlert() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useAlert must be used within a ConfirmProvider");
  }
  return context.alert;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions({ ...opts, isAlertOnly: false });
      setIsOpen(true);
      setIsProcessing(false);
    });
  }, []);

  const alert = useCallback((input: AlertInput) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      if (typeof input === "string") {
        setOptions({
          title: "Notice",
          description: input,
          confirmText: "OK",
          tone: "info",
          icon: "info",
          isAlertOnly: true,
        });
      } else {
        setOptions({
          ...input,
          confirmText: input.confirmText || "OK",
          tone: input.tone || (input.icon === "success" || input.icon === "check" ? "success" : "info"),
          icon: input.icon || (input.tone === "success" ? "success" : "info"),
          isAlertOnly: true,
        });
      }
      setIsOpen(true);
      setIsProcessing(false);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setIsProcessing(true);
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {isOpen && options && (
        <ConfirmDialog
          isOpen={isOpen}
          title={options.title}
          description={options.description}
          details={options.details}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          tone={options.tone || "danger"}
          icon={options.icon}
          isAlertOnly={options.isAlertOnly}
          isProcessing={isProcessing}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  icon?: "danger" | "warning" | "logout" | "remove_plan" | "trash" | "info" | "success" | "check";
  isAlertOnly?: boolean;
  isProcessing?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  details,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  icon,
  isAlertOnly = false,
  isProcessing = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Icon resolution
  const renderIcon = () => {
    const selectedIcon =
      icon ||
      (tone === "success"
        ? "success"
        : tone === "warning"
        ? "warning"
        : tone === "info"
        ? "info"
        : "danger");

    switch (selectedIcon) {
      case "success":
      case "check":
        return <CheckCircle2 className="size-5 text-emerald-600" />;
      case "logout":
        return <LogOut className="size-5 text-amber-600" />;
      case "remove_plan":
        return <PackageMinus className="size-5 text-rose-600" />;
      case "trash":
        return <Trash2 className="size-5 text-rose-600" />;
      case "warning":
        return <AlertTriangle className="size-5 text-amber-600" />;
      case "info":
        return <AlertCircle className="size-5 text-app-accent" />;
      case "danger":
      default:
        return <AlertTriangle className="size-5 text-rose-600" />;
    }
  };

  const getToneBadgeStyle = () => {
    switch (tone) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20 text-amber-300";
      case "info":
        return "bg-app-accent/10 border-app-accent/20 text-app-accent-soft";
      case "danger":
      default:
        return "bg-rose-500/10 border-rose-500/20 text-rose-300";
    }
  };

  const getConfirmButtonStyle = () => {
    switch (tone) {
      case "success":
        return "bg-app-accent-soft text-app-base enabled:hover:bg-app-ink-3 shadow-md";
      case "warning":
        return "bg-app-warm text-app-base enabled:hover:bg-app-warm shadow-md";
      case "info":
        return "bg-app-accent-soft text-app-base enabled:hover:bg-app-ink-3 shadow-md";
      case "danger":
      default:
        return "bg-app-warm text-app-base enabled:hover:bg-app-warm shadow-md";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex min-h-dvh items-center justify-center overflow-y-auto bg-app-void/75 p-4 backdrop-blur-md transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-app-line bg-app-surface p-6 text-left text-hi shadow-2xl shadow-black/40 transition-all duration-200 scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-app-base text-app-mist transition-colors hover:bg-app-line-soft hover:text-hi cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Tone Icon Badge */}
          <div
            className={`size-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${getToneBadgeStyle()}`}
          >
            {renderIcon()}
          </div>

          <div className="flex-1 pr-4">
            <h3
              id="confirm-dialog-title"
              className="text-base sm:text-lg font-black text-hi tracking-tight leading-snug"
            >
              {title}
            </h3>

            {description && (
              <p className="text-xs sm:text-sm text-app-mist mt-1.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Structured Details Bullet Points if provided */}
        {details && details.length > 0 && (
          <div
            className={`mt-4 rounded-2xl p-3.5 border ${
              tone === "danger"
                ? "bg-rose-950/30 border-rose-900/60"
                : tone === "warning"
                ? "bg-amber-950/30 border-amber-900/60"
                : tone === "success"
                ? "bg-emerald-950/30 border-emerald-900/60"
                : "bg-app-base border-app-line"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-app-mist mb-2">
              Action Summary & Impacts:
            </p>
            <ul className="space-y-1.5 text-xs text-app-accent-soft">
              {details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    className={`size-1.5 rounded-full shrink-0 mt-1.5 ${
                      tone === "danger"
                        ? "bg-rose-500"
                        : tone === "warning"
                        ? "bg-amber-500"
                        : tone === "success"
                        ? "bg-emerald-500"
                        : "bg-app-accent"
                    }`}
                  />
                  <span className="leading-snug">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl border border-app-line bg-app-base min-h-11 px-4 py-2 text-sm font-bold text-app-accent-soft transition-all hover:bg-app-line-soft active:scale-95 cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            autoFocus
            className={`px-5 py-2.5 min-h-11 rounded-xl text-sm font-bold disabled:opacity-50 enabled:active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isAlertOnly ? "w-full" : ""
            } ${getConfirmButtonStyle()}`}
          >
            {isProcessing && <Loader2 className="size-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

