export type BuyerSigner = unknown;

export type BatchBuyerOptions = {
  channelSalt?: `0x${string}`;
  depositMultiplier?: number;
};

export type BuyerClientOptions = {
  fetch?: typeof fetch;
  /** Register BatchSettlementEvmScheme alongside ExactEvmScheme. */
  batch?: BatchBuyerOptions;
};

export type PayOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type PayResult = {
  response: Response;
  payment: x402PaymentResult | null;
};

export type x402PaymentResult = {
  kind: "success" | "payment_required" | "unknown";
  [key: string]: unknown;
};

export class BuyerDepsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuyerDepsError";
  }
}
