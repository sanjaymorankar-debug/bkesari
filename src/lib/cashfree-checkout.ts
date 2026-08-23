/**
 * Client-side loader for Cashfree's Checkout widget (§2, §3).
 *
 * Cashfree Checkout is not an npm package — it is a script Cashfree hosts and
 * versions themselves, loaded at https://sdk.cashfree.com/js/v3/cashfree.js.
 * Unlike some gateways, the widget does not hand the browser a payment
 * id/signature pair on completion — the caller must independently ask the
 * server to confirm the order via Cashfree's own API afterward.
 */

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  /** "_modal" keeps the customer on this page; "_self" navigates away. */
  redirectTarget?: "_modal" | "_self";
}

interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: string;
  }): Promise<{ error?: { message?: string }; paymentDetails?: unknown }>;
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => CashfreeInstance;
  }
}

const SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";
let loadPromise: Promise<void> | null = null;

/** Loads the widget script at most once per page, however many times this is called. */
function loadCashfreeScript(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Cashfree checkout.")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree checkout."));
    document.body.appendChild(script);
  });
  return loadPromise;
}

/**
 * Opens the Cashfree Checkout modal and resolves once it closes — either the
 * customer completed payment or cancelled. Resolving here is NOT confirmation
 * the wallet was credited — the caller must still call `/api/wallet/verify`,
 * which independently asks Cashfree whether the order was actually paid.
 *
 * @param mode "sandbox" for test-mode credentials, "production" for live ones
 *   — mirrors the server's `CASHFREE_ENV` so the widget talks to the same
 *   Cashfree environment the order was created in.
 */
export async function openCashfreeCheckout(
  options: CashfreeCheckoutOptions,
  mode: "sandbox" | "production",
): Promise<void> {
  await loadCashfreeScript();
  if (!window.Cashfree) {
    throw new Error("Cashfree checkout could not be loaded.");
  }

  const instance = window.Cashfree({ mode });
  const result = await instance.checkout({
    paymentSessionId: options.paymentSessionId,
    redirectTarget: options.redirectTarget ?? "_modal",
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Payment was cancelled.");
  }
}
