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
  theme?: { color?: string };
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

export async function openRazorpayCheckout(
  options: RazorpayOptions,
  onSuccess: (data: RazorpayPaymentSuccess) => void,
  onDismiss?: () => void,
): Promise<void> {
  try {
    await loadRazorpayScript();
  } catch (err) {
    onDismiss?.();
    throw new Error("Payment gateway could not be loaded. Please check your connection and try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) {
    onDismiss?.();
    throw new Error("Payment gateway could not be initialized.");
  }

  const rzp = new Razorpay({
    ...options,
    handler: (response: RazorpayPaymentSuccess) => {
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        onDismiss?.();
      },
    },
  });

  rzp.open();
}

