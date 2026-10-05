import type { LaunaClient } from "@axlabs/ax402-sdk";
import { buildUsdcAccept, usdcToAtomic, wrapOpenAPI, type PaymentScheme } from "@axlabs/ax402-sdk";
import { inspectGatewayUrl } from "@axlabs/ax402-sdk/shell";

export function createToolHandlers(getClient: () => LaunaClient) {
  return {
    listApis: async () => getClient().apis.list(),
    getApi: async (api_id: string) => getClient().apis.get(api_id),
    createApi: async (body: Parameters<LaunaClient["apis"]["create"]>[0]) => getClient().apis.create(body),
    addEndpoint: async (
      api_id: string,
      method: string,
      path_pattern: string,
      price_usdc: string,
      scheme: PaymentScheme = "exact",
    ) =>
      getClient().endpoints.create(api_id, {
        method,
        path_pattern,
        accepts: [buildUsdcAccept(scheme, usdcToAtomic(price_usdc))],
      }),
    listEndpoints: async (api_id: string) => getClient().endpoints.list(api_id),
    importOpenapi: async (api_id: string, spec: string, price_usdc: string) =>
      wrapOpenAPI(getClient(), api_id, spec, [buildUsdcAccept("exact", usdcToAtomic(price_usdc))]),
    addDomain: async (api_id: string, hostname: string) => getClient().domains.add(api_id, hostname),
    listDomains: async (api_id: string) => getClient().domains.list(api_id),
    verifyDomain: async (api_id: string, domain_id: string) =>
      getClient().domains.verify(api_id, domain_id),
    domainSuggest: async (apex: string) => getClient().domains.suggest(apex),
    statsOverview: async (days: number) => getClient().stats.overview(days),
    statsApi: async (api_id: string, days: number) => getClient().stats.forApi(api_id, days),
    settlementsList: async (api_id: string) => getClient().settlements.list(api_id),
    settlementsExport: async (format: "csv" | "json", days = 30, api_id?: string) =>
      getClient().settlements.exportHistory({ format, days, apiId: api_id }),
    billingOverview: async () => getClient().billing.overview(),
    incomeSummary: async () => getClient().income.summary(),
    checkSlug: async (slug: string, exclude_api_id?: string) =>
      getClient().apis.checkSlugAvailability(slug, exclude_api_id),
    probeUpstream: async (api_id: string, endpoint_id?: string, path?: string) =>
      getClient().apis.probeUpstream(
        api_id,
        endpoint_id ? [{ endpoint_id, path }] : undefined,
      ),
    listScopes: async () => getClient().keys.listScopes(),
    facilitatorStats: async (days = 30) => getClient().auth.facilitatorStats(days),
    billingCatalog: async () => getClient().config.billing(),
    supportedNetworks: async () => getClient().auth.supportedNetworks(),
    platformConfig: async () => getClient().config.platform(),
    inspectUrl: async (url: string, method = "GET") => inspectGatewayUrl(url, method),
    payUrl: async (url: string, method = "GET") => {
      const pk = process.env.LAUNA_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
      if (!pk) {
        return {
          status: "wallet_required",
          url,
          hint: "Set LAUNA_EVM_PRIVATE_KEY to pay from MCP, or use @axlabs/ax402-sdk/buyer in your agent runtime",
        };
      }
      const { buyerClientFromPrivateKey } = await import("@axlabs/ax402-sdk/buyer");
      const buyer = await buyerClientFromPrivateKey(pk);
      const result = await buyer.pay({ url, method });
      const body = await result.response.text();
      return {
        status: result.response.status,
        body,
        payment: result.payment,
      };
    },
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
