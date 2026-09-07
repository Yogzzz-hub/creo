/**
 * Razorpay checkout integration.
 * Opens the Razorpay payment modal and resolves when the user completes/dismisses.
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

export function openRazorpayCheckout(
  options: RazorpayOptions,
  onSuccess: (data: RazorpayPaymentSuccess) => void,
  onDismiss?: () => void,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) {
    alert("Payment gateway not loaded. Please refresh and try again.");
    return;
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
