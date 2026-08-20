/**
 * Client-side loader for Razorpay's Checkout widget (§2, §3).
 *
 * Razorpay Checkout is not an npm package — it is a script Razorpay hosts and
 * versions themselves, loaded at https://checkout.razorpay.com/v1/checkout.js.
 * This is the piece that was previously entirely missing: `createTopUpOrder`
 * always worked, but nothing ever opened this widget, so a live-mode top-up
 * had no way to actually collect payment.
 */

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loadPromise: Promise<void> | null = null;

/** Loads the widget script at most once per page, however many times this is called. */
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout.")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });
  return loadPromise;
}

/**
 * Opens the Razorpay Checkout modal and resolves with the payment response
 * once the customer completes payment, or rejects if they close the modal or
 * the payment fails outright. Resolving here is NOT confirmation the wallet
 * was credited — the caller must still call `/api/wallet/verify`.
 */
export async function openRazorpayCheckout(
  options: Omit<RazorpayCheckoutOptions, "handler" | "modal">,
): Promise<{
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout could not be loaded.");
  }

  return new Promise((resolve, reject) => {
    const instance = new window.Razorpay!({
      ...options,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
    });
    instance.on("payment.failed", (response) => {
      reject(new Error(response.error.description ?? "Payment failed."));
    });
    instance.open();
  });
}
