/** Hosted card acceptance for gateway GET endpoints. A token identifies one purchase;
 * retain it across retries and never create another token for an uncertain payment. */
export type CardPaymentConfig = { enabled: boolean; currency: "usd"; amount_minor: string; mpp?: { enabled: boolean; buyer_auth: "none" } };
export type StripeConnection = {
  mpp?: { ready: boolean; profile_id?: string; disabled_reason?: string; checked_at?: string };
  id?: string;
  available?: boolean;
  connected: boolean;
  ready: boolean;
  account_id?: string;
  environment?: string;
  stripe_environment?: string;
  requirements?: string[];
  disabled_reason?: string;
};
export type CardPayment = {
  authentication_expires_at?: string;
  entry_point?: "mpp" | "checkout";
  settled_at?: string;
  payment_intent_id?: string;
  stripe_environment?: string;
  refunded_amount_minor?: number;
  id: string;
  api_id: string;
  endpoint_id: string;
  account_id: string;
  currency: string;
  amount_minor: number;
  status: string;
  delivery: string;
  created_at: string;
};
export type CardCheckoutStatus = { status: string; checkout_url?: string; purchase_id?: string };
export type CardCheckoutOptions = {
  token?: string;
  headers?: HeadersInit;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
};

export function createCardPaymentToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class CardCheckout {
  readonly token: string;
  private readonly headers: Headers;
  private readonly fetchFn: typeof fetch;
  constructor(
    readonly url: string,
    private readonly options: CardCheckoutOptions = {},
  ) {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.username || target.password || target.hash)
      throw new Error(
        "Card checkout requires an HTTPS gateway URL without credentials or a fragment",
      );
    this.token = options.token ?? createCardPaymentToken();
    if (!/^[A-Za-z0-9_-]{43}$/.test(this.token)) throw new Error("Invalid card payment token");
    this.headers = new Headers(options.headers);
    if (this.headers.has("PAYMENT-SIGNATURE") || this.headers.has("X-PAYMENT") || this.headers.has("Payment-Authorization") || /^Payment(?:\s|$)/i.test(this.headers.get("Authorization") ?? ""))
      throw new Error("Choose one payment method per request");
    // Browser fetch requires its global receiver; calling it as an instance
    // property otherwise throws "Illegal invocation" before any request.
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  }
  private request(
    action: "checkout" | "status" | "resume",
    signal?: AbortSignal,
  ): Promise<Response> {
    const headers = new Headers(this.headers);
    headers.set("Launa-Payment", action);
    headers.set("Launa-Payment-Token", this.token);
    return this.fetchFn(this.url, {
      method: "GET",
      headers,
      redirect: "error",
      cache: "no-store",
      credentials: this.options.credentials ?? "omit",
      signal,
    });
  }
  private async state(
    action: "checkout" | "status",
    signal?: AbortSignal,
  ): Promise<CardCheckoutStatus> {
    const response = await this.request(action, signal);
    if (![200, 202, 402, 409, 410].includes(response.status))
      throw new Error(
        "Card payment unavailable. Retry using the same CardCheckout token; do not start a new payment.",
      );
    const data = (await response.json()) as CardCheckoutStatus;
    if (typeof data.status !== "string") throw new Error("Invalid card payment response");
    if (data.checkout_url) {
      const target = new URL(data.checkout_url);
      if (
        target.protocol !== "https:" ||
        target.hostname !== "checkout.stripe.com" ||
        target.username ||
        target.password
      )
        throw new Error("Invalid Stripe Checkout URL");
    }
    return data;
  }
  /** Call only after the buyer chooses card payment. Save token before this request. */
  start(signal?: AbortSignal): Promise<CardCheckoutStatus> {
    return this.state("checkout", signal);
  }
  status(signal?: AbortSignal): Promise<CardCheckoutStatus> {
    return this.state("status", signal);
  }
  /** Returns the original resource only when paid; inspect status for pending/recovery. */
  resume(signal?: AbortSignal): Promise<Response> {
    return this.request("resume", signal);
  }
}

export type CardPaymentStats = {
 attempt_count?: number;
 mpp_count?: number;
 checkout_count: number;
 paid_count: number;
 delivered_count: number;
 refunded_count: number;
 disputed_count: number;
 gross_minor: number;
 refunded_minor: number;
};
