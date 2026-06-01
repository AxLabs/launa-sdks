import type { BuyerClientOptions, BuyerSigner, PayOptions, PayResult, x402PaymentResult } from "./types.js";
import { BuyerDepsError } from "./types.js";

type FetchModule = {
  wrapFetchWithPayment: (f: typeof fetch, c: unknown) => typeof fetch;
  x402Client: new () => { register: (pattern: string, scheme: unknown) => void };
  x402HTTPClient: new (client: unknown) => {
    processResponse: (response: Response) => Promise<x402PaymentResult>;
  };
};

type EvmModule = {
  ExactEvmScheme: new (signer: unknown) => unknown;
  registerExactEvmScheme?: (client: unknown, cfg: { signer: unknown }) => void;
};

async function loadDeps(): Promise<{ fetchMod: FetchModule; evmMod: EvmModule }> {
  try {
    const fetchMod = (await import("@x402/fetch")) as FetchModule;
    const evmMod = (await import("@x402/evm")) as EvmModule;
    return { fetchMod, evmMod };
  } catch {
    throw new BuyerDepsError(
      "Buyer helpers require optional deps: npm install @x402/fetch @x402/evm viem",
    );
  }
}

function registerEvmScheme(
  client: { register: (pattern: string, scheme: unknown) => void },
  evmMod: EvmModule,
  signer: BuyerSigner,
): void {
  if (evmMod.ExactEvmScheme) {
    client.register("eip155:*", new evmMod.ExactEvmScheme(signer));
    return;
  }
  if (evmMod.registerExactEvmScheme) {
    evmMod.registerExactEvmScheme(client, { signer });
    return;
  }
  throw new BuyerDepsError("No EVM scheme registration available in @x402/evm");
}

export class BuyerClient {
  readonly paymentFetch: typeof fetch;
  private readonly paymentHttpClient: {
    processResponse: (response: Response) => Promise<x402PaymentResult>;
  };

  private constructor(
    paymentFetch: typeof fetch,
    paymentHttpClient: BuyerClient["paymentHttpClient"],
  ) {
    this.paymentFetch = paymentFetch;
    this.paymentHttpClient = paymentHttpClient;
  }

  static async create(signer: BuyerSigner, opts: BuyerClientOptions = {}): Promise<BuyerClient> {
    const { fetchMod, evmMod } = await loadDeps();
    const baseFetch = opts.fetch ?? globalThis.fetch;
    const client = new fetchMod.x402Client();
    registerEvmScheme(client, evmMod, signer);
    const paymentHttpClient = new fetchMod.x402HTTPClient(client);
    const paymentFetch = fetchMod.wrapFetchWithPayment(baseFetch, paymentHttpClient);
    return new BuyerClient(paymentFetch, paymentHttpClient);
  }

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.paymentFetch(input, init);
  }

  async pay(opts: PayOptions): Promise<PayResult> {
    const response = await this.paymentFetch(opts.url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
    });
    let payment: x402PaymentResult | null = null;
    try {
      payment = await this.paymentHttpClient.processResponse(response.clone());
    } catch {
      payment = null;
    }
    return { response, payment };
  }

  processResponse(response: Response): Promise<x402PaymentResult> {
    return this.paymentHttpClient.processResponse(response);
  }
}

export async function createBuyerClient(
  signer: BuyerSigner,
  opts?: BuyerClientOptions,
): Promise<BuyerClient> {
  return BuyerClient.create(signer, opts);
}

export async function createPaymentFetch(
  signer: BuyerSigner,
  opts?: BuyerClientOptions,
): Promise<typeof fetch> {
  const client = await BuyerClient.create(signer, opts);
  return client.paymentFetch;
}

export async function payAndFetch(signer: BuyerSigner, opts: PayOptions): Promise<Response> {
  const client = await BuyerClient.create(signer);
  const result = await client.pay(opts);
  return result.response;
}

export { gatewayURL, gatewayBaseURL } from "../platform/helpers.js";
export type {
  BuyerClientOptions,
  BuyerSigner,
  PayOptions,
  PayOptions as PayAndFetchOptions,
  PayResult,
  x402PaymentResult,
} from "./types.js";
export { BuyerDepsError } from "./types.js";
export {
  createEvmSignerFromPrivateKey,
  buyerClientFromPrivateKey,
  buyerClientFromEnv,
} from "./signer.js";
