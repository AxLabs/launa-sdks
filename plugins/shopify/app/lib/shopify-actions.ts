import {
  gatewayBaseURL,
  setupApiWithDefaultDomain,
  type LaunaClient,
  type Endpoint,
  type PaymentScheme,
  type PlatformConfig,
} from "@axlabs/ax402-sdk";
import type { ShopCredentials } from "../crypto.server.js";
import {
  gatewayLink,
  priceToAccept,
  productEndpointPath,
  shopSlug,
  shopUpstreamUrl,
  type ProductPathKind,
} from "./mapping.js";

export type OnboardResult = {
  apiId: string;
  apiName: string;
  gatewayHost: string;
  gatewayUrl: string;
};

export type MonetizeInput = {
  productId: string;
  priceUsdc: string;
  pathKind?: ProductPathKind;
  scheme?: PaymentScheme;
  description?: string;
};

export type ShopDashboard = {
  apiId: string;
  apiName: string;
  gatewayHost: string;
  gatewayUrl: string;
  endpoints: Endpoint[];
  platform: PlatformConfig;
};

export async function onboardShop(
  client: LaunaClient,
  shopDomain: string,
  payToAddress?: string,
): Promise<OnboardResult> {
  const slug = shopSlug(shopDomain);
  const input = {
    name: shopDomain,
    slug,
    upstream_base_url: shopUpstreamUrl(shopDomain),
    ...(payToAddress ? { pay_to_mode: "user_wallet" as const, pay_to_address: payToAddress } : {}),
  };
  const { api, platform, gatewayHost, gatewayUrl } = await setupApiWithDefaultDomain(client, input);
  return {
    apiId: api.id,
    apiName: api.name,
    gatewayHost,
    gatewayUrl,
  };
}

export async function monetizeProduct(
  client: LaunaClient,
  apiId: string,
  input: MonetizeInput,
): Promise<Endpoint> {
  const pathKind = input.pathKind ?? "rest-product";
  const scheme = input.scheme ?? "exact";
  return client.endpoints.create(apiId, {
    method: "GET",
    path_pattern: productEndpointPath(input.productId, pathKind),
    description: input.description,
    accepts: [priceToAccept(input.priceUsdc, scheme)],
  });
}

export async function loadShopDashboard(
  client: LaunaClient,
  creds: ShopCredentials,
): Promise<ShopDashboard> {
  const [api, endpoints, platform] = await Promise.all([
    client.apis.get(creds.apiId),
    client.endpoints.list(creds.apiId),
    client.config.platform(),
  ]);
  const primary = api.domains.find((d) => d.is_primary) ?? api.domains[0];
  const gatewayHost = primary?.hostname ?? `${api.slug}.${platform.platform_domain}`;
  return {
    apiId: creds.apiId,
    apiName: api.name,
    gatewayHost,
    gatewayUrl: gatewayBaseURL(gatewayHost, platform),
    endpoints,
    platform,
  };
}

export function endpointBuyerUrl(
  dashboard: ShopDashboard,
  endpoint: Endpoint,
): string {
  return gatewayLink(dashboard.gatewayHost, endpoint.path_pattern, dashboard.platform);
}
