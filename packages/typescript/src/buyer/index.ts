import type {
  BuyerClientOptions,
  BuyerSigner,
  PayOptions,
  PayResult,
  x402PaymentResult,
} from "./types.js";
import { BuyerDepsError } from "./types.js";
import { createHederaSignerFromCredentials } from "./signer.js";

type FetchModule = {
  wrapFetchWithPayment: (f: typeof fetch, c: unknown) => typeof fetch;
  x402Client: new () => { register: (pattern: string, scheme: unknown) => void };
  x402HTTPClient: new (client: unknown) => {
    processResponse: (response: Response) => Promise<x402PaymentResult>;
  };
};

type EvmModule = {
  ExactEvmScheme: new (signer: unknown) => unknown;
  BatchSettlementEvmScheme?: new (signer: unknown, options?: unknown) => unknown;
  toClientEvmSigner?: (signer: unknown, publicClient?: unknown) => unknown;
  registerExactEvmScheme?: (client: unknown, cfg: { signer: unknown }) => void;
};

type HederaModule = {
  ExactHederaScheme: new (signer: unknown) => unknown;
  createClientHederaSigner?: (
    accountId: string,
    privateKey: unknown,
    config?: { network?: string; nodeUrl?: string },
  ) => unknown;
};

async function loadFetch(): Promise<FetchModule> {
  try {
    return (await import("@x402/fetch")) as FetchModule;
  } catch {
    throw new BuyerDepsError(
      "Buyer helpers require optional deps: npm install @x402/fetch (@x402/evm viem and/or @x402/hedera)",
    );
  }
}

async function loadEvm(): Promise<EvmModule> {
  try {
    return (await import("@x402/evm")) as EvmModule;
  } catch {
    throw new BuyerDepsError(
      "EVM buyer helpers require optional deps: npm install @x402/evm viem",
    );
  }
}

async function loadHedera(): Promise<HederaModule> {
  try {
    return (await import("@x402/hedera/exact/client")) as HederaModule;
  } catch {
    throw new BuyerDepsError(
      "Hedera buyer helpers require optional deps: npm install @x402/hedera",
    );
  }
}

function registerEvmSchemes(
  client: { register: (pattern: string, scheme: unknown) => void },
  evmMod: EvmModule,
  signer: BuyerSigner,
  opts: BuyerClientOptions = {},
): void {
  const registerExact = evmMod.registerExactEvmScheme;
  if (typeof registerExact === "function") {
    registerExact(client, { signer });
  } else if (evmMod.ExactEvmScheme) {
    client.register("eip155:*", new evmMod.ExactEvmScheme(signer));
  } else {
    throw new BuyerDepsError("No EVM scheme registration available in @x402/evm");
  }

  const batch = opts.batch;
  if (!batch || !evmMod.BatchSettlementEvmScheme) {
    return;
  }

  const batchSigner =
    evmMod.toClientEvmSigner && typeof evmMod.toClientEvmSigner === "function"
      ? evmMod.toClientEvmSigner(signer)
      : signer;
  const salt =
    batch.channelSalt ??
    ("0x0000000000000000000000000000000000000000000000000000000000000000" as const);
  client.register(
    "eip155:*",
    new evmMod.BatchSettlementEvmScheme(batchSigner, {
      salt,
      depositPolicy: { depositMultiplier: batch.depositMultiplier ?? 5 },
    }),
  );
}

async function resolveHederaSigner(opts: BuyerClientOptions): Promise<BuyerSigner> {
  if (opts.hederaSigner) {
    return opts.hederaSigner;
  }
  if (opts.hedera) {
    return createHederaSignerFromCredentials(opts.hedera);
  }
  throw new BuyerDepsError("hederaSigner or hedera credentials required for Hedera payments");
}

function registerHederaScheme(
  client: { register: (pattern: string, scheme: unknown) => void },
  hederaMod: HederaModule,
  signer: BuyerSigner,
): void {
  if (!hederaMod.ExactHederaScheme) {
    throw new BuyerDepsError("No ExactHederaScheme available in @x402/hedera");
  }
  client.register("hedera:*", new hederaMod.ExactHederaScheme(signer));
}

function hasHederaOpts(opts: BuyerClientOptions): boolean {
  return Boolean(opts.hederaSigner || opts.hedera);
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

  /**
   * Create a payment-capable client.
   * Pass an EVM signer and/or Hedera via `opts.hederaSigner` / `opts.hedera`.
   * At least one chain must be configured.
   */
  static async create(
    signer?: BuyerSigner | null,
    opts: BuyerClientOptions = {},
  ): Promise<BuyerClient> {
    const wantEvm = signer != null;
    const wantHedera = hasHederaOpts(opts);
    if (!wantEvm && !wantHedera) {
      throw new BuyerDepsError(
        "BuyerClient.create requires an EVM signer and/or hederaSigner / hedera credentials",
      );
    }

    const fetchMod = await loadFetch();
    const baseFetch = opts.fetch ?? globalThis.fetch;
    const client = new fetchMod.x402Client();

    if (wantEvm) {
      const evmMod = await loadEvm();
      registerEvmSchemes(client, evmMod, signer!, opts);
    }

    if (wantHedera) {
      const hederaMod = await loadHedera();
      const hederaSigner = await resolveHederaSigner(opts);
      registerHederaScheme(client, hederaMod, hederaSigner);
    }

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
  signer?: BuyerSigner | null,
  opts?: BuyerClientOptions,
): Promise<BuyerClient> {
  return BuyerClient.create(signer, opts);
}

export async function createPaymentFetch(
  signer?: BuyerSigner | null,
  opts?: BuyerClientOptions,
): Promise<typeof fetch> {
  const client = await BuyerClient.create(signer, opts);
  return client.paymentFetch;
}

export async function payAndFetch(
  signer: BuyerSigner | null | undefined,
  opts: PayOptions,
  clientOpts?: BuyerClientOptions,
): Promise<Response> {
  const client = await BuyerClient.create(signer, clientOpts);
  const result = await client.pay(opts);
  return result.response;
}

export { gatewayURL, gatewayBaseURL } from "../platform/helpers.js";
export type {
  BatchBuyerOptions,
  BuyerClientOptions,
  BuyerSigner,
  HederaBuyerCredentials,
  PayOptions,
  PayOptions as PayAndFetchOptions,
  PayResult,
  x402PaymentResult,
} from "./types.js";
export { BuyerDepsError } from "./types.js";
export {
  createEvmSignerFromPrivateKey,
  createEvmSignerFromBrowserProvider,
  createHederaSignerFromCredentials,
  parseHederaPrivateKey,
  buyerClientFromPrivateKey,
  buyerClientFromHederaCredentials,
  buyerClientFromEnv,
} from "./signer.js";
