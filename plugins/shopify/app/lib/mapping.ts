import {
  buildUsdcAccept,
  gatewayURL,
  type PaymentScheme,
  usdcToAtomic,
} from "@axlabs/launa-sdk";
import type { PlatformConfig } from "@axlabs/launa-sdk";

export type ProductPathKind = "rest-product" | "storefront-product";

export function productEndpointPath(productId: string, kind: ProductPathKind = "rest-product"): string {
  if (kind === "storefront-product") {
    return `/products/${productId}.json`;
  }
  return `/products/${productId}`;
}

export function priceToAccept(priceUsdc: string, scheme: PaymentScheme = "exact") {
  return buildUsdcAccept(scheme, usdcToAtomic(priceUsdc));
}

export function shopUpstreamUrl(shopDomain: string): string {
  return `https://${shopDomain}`;
}

export function shopSlug(shopDomain: string): string {
  return shopDomain.replace(/\./g, "-").toLowerCase();
}

export function gatewayLink(
  gatewayHost: string,
  pathPattern: string,
  platform?: PlatformConfig | null,
): string {
  return gatewayURL(gatewayHost, pathPattern, platform);
}
