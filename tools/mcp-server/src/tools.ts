import type { Ax402Client } from "@axlabs/ax402-sdk";
import { buildUsdcAccept, usdcToAtomic, wrapOpenAPI } from "@axlabs/ax402-sdk";

export function createToolHandlers(getClient: () => Ax402Client) {
  return {
    listApis: async () => getClient().apis.list(),
    createApi: async (body: Parameters<Ax402Client["apis"]["create"]>[0]) => getClient().apis.create(body),
    addEndpoint: async (
      api_id: string,
      method: string,
      path_pattern: string,
      price_usdc: string,
    ) =>
      getClient().endpoints.create(api_id, {
        method,
        path_pattern,
        accepts: [buildUsdcAccept("exact", usdcToAtomic(price_usdc))],
      }),
    importOpenapi: async (api_id: string, spec: string, price_usdc: string) =>
      wrapOpenAPI(getClient(), api_id, spec, [buildUsdcAccept("exact", usdcToAtomic(price_usdc))]),
    addDomain: async (api_id: string, hostname: string) => getClient().domains.add(api_id, hostname),
    verifyDomain: async (api_id: string, domain_id: string) =>
      getClient().domains.verify(api_id, domain_id),
    domainSuggest: async (apex: string) => getClient().domains.suggest(apex),
    statsOverview: async (days: number) => getClient().stats.overview(days),
    supportedNetworks: async () => getClient().auth.supportedNetworks(),
    platformConfig: async () => getClient().config.platform(),
    payUrl: async (url: string, method = "GET") => {
      const pk = process.env.AX402_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
      if (!pk) {
        return {
          status: "wallet_required",
          url,
          hint: "Set AX402_EVM_PRIVATE_KEY to pay from MCP, or use @axlabs/ax402-sdk/buyer in your agent runtime",
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
