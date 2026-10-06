/**
 * Razorpay checkout integration.
 * Dynamically loads the SDK on-demand and opens the payment modal.
 */

export interface RazorpayOptions {
  key: string;
  amount: number;      // in paise (minor units)
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  backdrop_color?: string;
  modal?: {
    backdropclose?: boolean;
    escape?: boolean;
    handleback?: boolean;
    confirm_close?: boolean;
    animation?: boolean;
    ondismiss?: () => void;
  };
}

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Dynamically load the Razorpay Checkout SDK script on-demand. */
let _rzpScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  if (_rzpScriptPromise) return _rzpScriptPromise;

  _rzpScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway."));
    document.head.appendChild(script);
  });

  return _rzpScriptPromise;
}

/** Start downloading the checkout SDK early so opening checkout is instant. */
export function preloadRazorpay(): void {
  void loadRazorpayScript().catch(() => {
    // Allow a retry when the user actually clicks pay
    _rzpScriptPromise = null;
  });
}

export async function openRazorpayCheckout(
  options: RazorpayOptions,
  onSuccess: (data: RazorpayPaymentSuccess) => void,
  onDismiss?: () => void,
): Promise<void> {
  try {
    await loadRazorpayScript();
  } catch {
    onDismiss?.();
    throw new Error("Payment gateway could not be loaded. Please check your connection and try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) {
    onDismiss?.();
    throw new Error("Payment gateway could not be initialized.");
  }

  // Keep the usual dark app background visible and blurred, preventing white canvas flash
  const applyDarkBackdrop = () => {
    const container = document.querySelector(".razorpay-container") as HTMLElement | null;
    if (container) {
      container.style.setProperty("color-scheme", "light", "important");
      container.style.setProperty("background", "rgba(5, 8, 16, 0.82)", "important");
      container.style.setProperty("backdrop-filter", "blur(8px)", "important");
      container.style.setProperty("-webkit-backdrop-filter", "blur(8px)", "important");
    }
    const frames = document.querySelectorAll<HTMLIFrameElement>(
      'iframe[src*="razorpay"], iframe.razorpay-checkout-frame, .razorpay-container iframe',
    );
    frames.forEach((f) => {
      f.style.setProperty("color-scheme", "light", "important");
      f.style.setProperty("background", "transparent", "important");
      f.style.setProperty("background-color", "transparent", "important");
      f.setAttribute("allowtransparency", "true");
    });
  };

  applyDarkBackdrop();
  const observer = new MutationObserver(() => {
    applyDarkBackdrop();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    observer.disconnect();
  };

  const rzp = new Razorpay({
    ...options,
    backdrop_color: options.backdrop_color || "rgba(5, 8, 16, 0.82)",
    theme: {
      color: "#7FA0D6",
      backdrop_color: "rgba(5, 8, 16, 0.82)",
      ...options.theme,
    },
    modal: {
      backdropclose: false,
      escape: true,
      animation: true,
      ...options.modal,
      ondismiss: () => {
        cleanup();
        onDismiss?.();
      },
    },
    handler: (response: RazorpayPaymentSuccess) => {
      cleanup();
      onSuccess(response);
    },
  });

  rzp.open();
}

