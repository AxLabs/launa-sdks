import { buildUsdcAccept, usdcToAtomic } from "@axlabs/ax402-sdk";

export function productEndpointPath(productId: string): string {
  return `/products/${productId}`;
}

export function priceToAccept(priceUsdc: string) {
  return buildUsdcAccept("exact", usdcToAtomic(priceUsdc));
}

export function shopUpstreamUrl(shopDomain: string): string {
  return `https://${shopDomain}`;
}
