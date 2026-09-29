import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  AlertCircle,
  LogOut,
  PackageMinus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

export type ConfirmTone = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description?: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  icon?: "danger" | "warning" | "logout" | "remove_plan" | "trash" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
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
    <ConfirmContext.Provider value={{ confirm }}>
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
  icon?: "danger" | "warning" | "logout" | "remove_plan" | "trash" | "info";
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
    const selectedIcon = icon || (tone === "warning" ? "warning" : tone === "info" ? "info" : "danger");

    switch (selectedIcon) {
      case "logout":
        return <LogOut className="size-5 text-amber-600" />;
      case "remove_plan":
        return <PackageMinus className="size-5 text-rose-600" />;
      case "trash":
        return <Trash2 className="size-5 text-rose-600" />;
      case "warning":
        return <AlertTriangle className="size-5 text-amber-600" />;
      case "info":
        return <AlertCircle className="size-5 text-[#2B7BC4]" />;
      case "danger":
      default:
        return <AlertTriangle className="size-5 text-rose-600" />;
    }
  };

  const getToneBadgeStyle = () => {
    switch (tone) {
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-600";
      case "info":
        return "bg-blue-50 border-blue-200 text-[#2B7BC4]";
      case "danger":
      default:
        return "bg-rose-50 border-rose-200 text-rose-600";
    }
  };

  const getConfirmButtonStyle = () => {
    switch (tone) {
      case "warning":
        return "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-600/25";
      case "info":
        return "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white shadow-md shadow-blue-500/25";
      case "danger":
      default:
        return "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-md shadow-rose-600/25";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/90 text-left transition-all duration-200 transform scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 size-8 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close confirmation dialog"
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
              className="text-base sm:text-lg font-black text-[#0D2137] tracking-tight leading-snug"
            >
              {title}
            </h3>

            {description && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
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
                ? "bg-rose-50/50 border-rose-100"
                : tone === "warning"
                ? "bg-amber-50/50 border-amber-100"
                : "bg-blue-50/40 border-blue-100"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Action Summary & Impacts:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    className={`size-1.5 rounded-full shrink-0 mt-1.5 ${
                      tone === "danger"
                        ? "bg-rose-500"
                        : tone === "warning"
                        ? "bg-amber-500"
                        : "bg-[#2B7BC4]"
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
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100/80 active:scale-95 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            autoFocus
            className={`px-5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ${getConfirmButtonStyle()}`}
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
