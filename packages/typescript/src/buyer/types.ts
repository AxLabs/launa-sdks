export type BuyerSigner = unknown;

export type BatchBuyerOptions = {
  channelSalt?: `0x${string}`;
  depositMultiplier?: number;
};

/** Credentials for createClientHederaSigner (@x402/hedera). */
export type HederaBuyerCredentials = {
  accountId: string;
  privateKey: string;
  /** CAIP-2 network; defaults to hedera:testnet. */
  network?: string;
  nodeUrl?: string;
};

export type BuyerClientOptions = {
  fetch?: typeof fetch;
  /** Register BatchSettlementEvmScheme alongside ExactEvmScheme (EVM only). */
  batch?: BatchBuyerOptions;
  /** Pre-built ClientHederaSigner from @x402/hedera. */
  hederaSigner?: unknown;
  /** Or account credentials — builds a signer via createClientHederaSigner. */
  hedera?: HederaBuyerCredentials;
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
