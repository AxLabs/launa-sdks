import type { AcceptOption } from "../types.js";
import type { Ax402Client } from "../client.js";

export const USDC_DECIMALS = 6;

export function usdcToAtomic(amount: string): string {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error("Price is required");
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Enter a valid USDC amount (e.g. 0.10)");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > USDC_DECIMALS) {
    throw new Error(`USDC supports at most ${USDC_DECIMALS} decimal places`);
  }
  const padded = frac.padEnd(USDC_DECIMALS, "0");
  const atomic = BigInt(whole + padded);
  if (atomic <= BigInt(0)) throw new Error("Price must be greater than 0");
  return atomic.toString();
}

export function atomicToUsdc(atomic: string): string {
  if (!atomic || !/^\d+$/.test(atomic)) return "0";
  const s = atomic.padStart(USDC_DECIMALS + 1, "0");
  const whole = s.slice(0, -USDC_DECIMALS).replace(/^0+/, "") || "0";
  const frac = s.slice(-USDC_DECIMALS).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export const DEFAULT_USDC_ACCEPT = {
  scheme: "exact",
  network: "eip155:84532",
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  max_timeout_seconds: 300,
  extra: { name: "USDC", version: "2", assetTransferMethod: "eip3009" },
} as const;

/** x402 batch-settlement minimum (15 minutes). */
export const MIN_BATCH_WITHDRAW_DELAY = 900;
/** x402 batch-settlement maximum (30 days). */
export const MAX_BATCH_WITHDRAW_DELAY = 2_592_000;
/** Default channel withdraw delay for new batch endpoints (3 days). */
export const DEFAULT_BATCH_WITHDRAW_DELAY = 259_200;

export const DEFAULT_BATCH_USDC_ACCEPT = {
  scheme: "batch-settlement",
  network: "eip155:84532",
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  max_timeout_seconds: 300,
  extra: {
    name: "USDC",
    version: "2",
    assetTransferMethod: "eip3009",
    withdrawDelay: DEFAULT_BATCH_WITHDRAW_DELAY,
  },
} as const;

export function formatWithdrawDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return m === 1 ? "1 minute" : `${m} minutes`;
  }
  if (seconds < 86_400) {
    const h = Math.round(seconds / 3600);
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  const d = Math.round(seconds / 86_400);
  return d === 1 ? "1 day" : `${d} days`;
}

export type PaymentScheme = "exact" | "batch-settlement";

export function buildUsdcAccept(
  scheme: PaymentScheme,
  amountAtomic: string,
  withdrawDelay?: number,
) {
  const base = scheme === "batch-settlement" ? DEFAULT_BATCH_USDC_ACCEPT : DEFAULT_USDC_ACCEPT;
  const extra =
    scheme === "batch-settlement"
      ? { ...base.extra, withdrawDelay: withdrawDelay ?? DEFAULT_BATCH_WITHDRAW_DELAY }
      : base.extra;
  return { ...base, amount: amountAtomic, extra };
}

export function gatewayBaseURL(host: string, platform?: { gateway_port?: number } | null): string {
  if (!host) return "";
  const isLocal = host.endsWith(".localhost") || host === "localhost";
  const port = platform?.gateway_port ?? 8090;
  if (isLocal && port !== 80 && port !== 443) {
    return `http://${host}:${port}`;
  }
  return `https://${host}`;
}

export function gatewayURL(
  host: string,
  path: string,
  platform?: { gateway_port?: number } | null,
): string {
  const base = gatewayBaseURL(host, platform);
  if (!base) return "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function setupApiWithDefaultDomain(
  client: Ax402Client,
  input: {
    name: string;
    slug: string;
    upstream_base_url: string;
    pay_to_mode?: "user_wallet" | "platform_wallet";
    pay_to_address?: string;
  },
) {
  const platform = await client.config.platform();
  const api = await client.apis.create(input);
  const host = `${input.slug}.${platform.platform_domain}`;
  return { api, platform, gatewayHost: host, gatewayUrl: gatewayBaseURL(host, platform) };
}

export async function wrapOpenAPI(
  client: Ax402Client,
  apiId: string,
  spec: string,
  accepts: AcceptOption[],
  filter?: (op: { method: string; path_pattern: string }) => boolean,
) {
  const parsed = await client.openapi.parseSpec(spec);
  const operations = parsed.operations
    .filter((op) => (filter ? filter(op) : true))
    .map((op) => ({
      method: op.method,
      path_pattern: op.path_pattern,
      description: op.summary ?? op.description,
    }));
  return client.openapi.import(apiId, { operations, accepts });
}
