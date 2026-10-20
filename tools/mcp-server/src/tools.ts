import type { LaunaClient } from "@launaio/sdk";
import {
  buildSandboxUsdcAccept,
  buildUsdcAccept,
  usdcToAtomic,
  wrapOpenAPI,
  type AcceptOption,
  type CreateAPIInput,
  type CreateEndpointInput,
  type PaymentScheme,
} from "@launaio/sdk";
import { amountToAtomic } from "@launaio/sdk/platform";
import { envRequestsSandbox, inspectGatewayUrl } from "@launaio/sdk/shell";

function defaultAccept(scheme: PaymentScheme, amountAtomic: string, sandbox: boolean) {
  if (sandbox) {
    if (scheme === "batch-settlement") {
      throw new Error("sandbox fork supports exact scheme only");
    }
    return buildSandboxUsdcAccept(scheme, amountAtomic);
  }
  return buildUsdcAccept(scheme, amountAtomic);
}

type EndpointPricingInput = {
  accepts?: AcceptOption[];
  price?: string;
  price_usdc?: string;
  amount?: string;
  network?: string;
  asset?: string;
  decimals?: number;
  scheme?: PaymentScheme;
};

type EndpointToolInput = EndpointPricingInput & {
  method?: string;
  path_pattern?: string;
  description?: string;
  enabled?: boolean;
  ttl?: number;
  request_schema?: Record<string, unknown>;
  response_schema?: Record<string, unknown>;
  clear_schemas?: boolean;
};

function endpointAccepts(input: EndpointPricingInput, sandbox: boolean, defaultPrice?: string): AcceptOption[] | undefined {
  if (input.accepts) return input.accepts;

  const scheme = input.scheme ?? "exact";
  const price = input.price ?? input.price_usdc ?? defaultPrice;
  const customToken = input.network != null || input.asset != null || input.amount != null;

  if (!customToken) {
    return price == null ? undefined : [defaultAccept(scheme, usdcToAtomic(price), sandbox)];
  }
  if (!input.network || !input.asset) {
    throw new Error("network and asset are required for custom token pricing");
  }
  if (input.amount == null && price == null) {
    throw new Error("price or amount is required for custom token pricing");
  }

  return [{
    scheme,
    network: input.network,
    asset: input.asset,
    amount: input.amount ?? amountToAtomic(price!, input.decimals ?? 6),
    max_timeout_seconds: 300,
  }];
}

function endpointBody(input: EndpointToolInput, sandbox: boolean, defaultPrice?: string): Partial<CreateEndpointInput> {
  const accepts = endpointAccepts(input, sandbox, defaultPrice);
  return {
    ...(input.method != null ? { method: input.method } : {}),
    ...(input.path_pattern != null ? { path_pattern: input.path_pattern } : {}),
    ...(input.description != null ? { description: input.description } : {}),
    ...(input.enabled != null ? { enabled: input.enabled } : {}),
    ...(accepts ? { accepts } : {}),
    ...(input.ttl != null ? { ttl: input.ttl } : {}),
    ...(input.request_schema ? { request_schema: input.request_schema } : {}),
    ...(input.response_schema ? { response_schema: input.response_schema } : {}),
    ...(input.clear_schemas ? { clear_schemas: true } : {}),
  };
}

type GetClient = () => LaunaClient;

function apiHandlers(getClient: GetClient) {
  return {
    listApis: async () => getClient().apis.list(),
    getApi: async (api_id: string) => getClient().apis.get(api_id),
    createApi: async (body: Parameters<LaunaClient["apis"]["create"]>[0]) => getClient().apis.create(body),
    updateApi: async (api_id: string, body: Partial<CreateAPIInput>) =>
      getClient().apis.update(api_id, body),
    deleteApi: async (api_id: string) => getClient().apis.delete(api_id),
    listWebhookDeliveries: async (api_id: string) => getClient().apis.listWebhookDeliveries(api_id),
    batchOverview: async (api_id: string) => getClient().apis.batchOverview(api_id),
    updateBatchSettings: async (
      api_id: string,
      claim_interval_secs: number,
      settle_interval_secs: number,
      refund_interval_secs: number,
    ) =>
      getClient().apis.updateBatchSettings(api_id, {
        claim_interval_secs,
        settle_interval_secs,
        refund_interval_secs,
      }),
    getCors: async (api_id: string) => getClient().apis.getCors(api_id),
    setCors: async (api_id: string, origins: string[]) => getClient().apis.putCors(api_id, origins),
    addCorsOrigin: async (api_id: string, origin: string) =>
      getClient().apis.addCorsOrigin(api_id, origin),
    removeCorsOrigin: async (api_id: string, origin: string) =>
      getClient().apis.removeCorsOrigin(api_id, origin),
    discoveryUrls: async (api_id: string) => getClient().apis.discovery(api_id),
    setDiscoveryGuidance: async (
      api_id: string,
      discovery_guidance?: string,
      discovery_contact_email?: string,
      openapi_version?: string,
    ) =>
      getClient().apis.update(api_id, {
        ...(discovery_guidance != null ? { discovery_guidance } : {}),
        ...(discovery_contact_email != null ? { discovery_contact_email } : {}),
        ...(openapi_version != null ? { openapi_version } : {}),
      }),
    checkSlug: async (slug: string, exclude_api_id?: string) =>
      getClient().apis.checkSlugAvailability(slug, exclude_api_id),
    probeUpstream: async (api_id: string, endpoint_id?: string, path?: string) =>
      getClient().apis.probeUpstream(
        api_id,
        endpoint_id ? { probes: [{ endpoint_id, path }] } : undefined,
      ),
  };
}

function endpointHandlers(getClient: GetClient, sandbox: boolean) {
  return {
    addEndpoint: async (api_id: string, input: EndpointToolInput) =>
      getClient().endpoints.create(
        api_id,
        endpointBody(input, sandbox, "0.10") as CreateEndpointInput,
      ),
    listEndpoints: async (api_id: string) => getClient().endpoints.list(api_id),
    updateEndpoint: async (api_id: string, endpoint_id: string, input: EndpointToolInput) =>
      getClient().endpoints.update(api_id, endpoint_id, endpointBody(input, sandbox)),
    deleteEndpoint: async (api_id: string, endpoint_id: string) =>
      getClient().endpoints.delete(api_id, endpoint_id),
    updateEndpointSchemas: async (
      api_id: string,
      endpoint_id: string,
      request_schema?: Record<string, unknown>,
      response_schema?: Record<string, unknown>,
      clear_schemas?: boolean,
    ) =>
      getClient().endpoints.update(api_id, endpoint_id, {
        ...(request_schema ? { request_schema } : {}),
        ...(response_schema ? { response_schema } : {}),
        ...(clear_schemas ? { clear_schemas: true } : {}),
      }),
    parseOpenapi: async (spec: string) => getClient().openapi.parseSpec(spec),
    importOpenapi: async (api_id: string, spec: string, price_usdc: string) =>
      wrapOpenAPI(getClient(), api_id, spec, [defaultAccept("exact", usdcToAtomic(price_usdc), sandbox)]),
  };
}

function domainHandlers(getClient: GetClient) {
  return {
    addDomain: async (api_id: string, hostname: string) => getClient().domains.add(api_id, hostname),
    listDomains: async (api_id: string) => getClient().domains.list(api_id),
    verifyDomain: async (api_id: string, domain_id: string) =>
      getClient().domains.verify(api_id, domain_id),
    deleteDomain: async (api_id: string, domain_id: string) =>
      getClient().domains.delete(api_id, domain_id),
    domainSuggest: async (apex: string, prefix?: string, upstream_path?: string) =>
      getClient().domains.suggest(apex, prefix, upstream_path),
  };
}

function reportingHandlers(getClient: GetClient) {
  return {
    statsOverview: async (days: number) => getClient().stats.overview(days),
    statsApi: async (api_id: string, days: number) => getClient().stats.forApi(api_id, days),
    settlementsList: async (api_id: string) => getClient().settlements.list(api_id),
    settlementsBatch: async (api_id: string) => getClient().settlements.listBatch(api_id),
    settlementsHistory: async (
      days = 30,
      limit?: number,
      offset?: number,
      api_id?: string,
    ) => getClient().settlements.listHistory({ days, limit, offset, apiId: api_id }),
    settlementsExport: async (format: "csv" | "json", days = 30, api_id?: string) =>
      getClient().settlements.exportHistory({ format, days, apiId: api_id }),
    billingOverview: async () => getClient().billing.overview(),
    incomeSummary: async () => getClient().income.summary(),
    incomeLedger: async (limit?: number, offset?: number, api_id?: string, network?: string) =>
      getClient().income.ledger({ limit, offset, apiId: api_id, network }),
    incomePayoutRequests: async () => getClient().income.payoutRequests(),
    facilitatorStats: async (days = 30) => getClient().auth.facilitatorStats(days),
    billingCatalog: async () => getClient().config.billing(),
    supportedNetworks: async () => getClient().auth.supportedNetworks(),
    platformConfig: async () => getClient().config.platform(),
  };
}

function buyerHandlers() {
  return {
    inspectUrl: async (url: string, method = "GET") => inspectGatewayUrl(url, method),
    payUrl: async (url: string, method = "GET") => {
      const { buyerClientFromEnv, BuyerDepsError } = await import("@launaio/sdk/buyer");
      let buyer;
      try {
        buyer = await buyerClientFromEnv();
      } catch (err) {
        if (err instanceof BuyerDepsError) {
          return {
            status: "wallet_required",
            url,
            hint: "Set LAUNA_EVM_PRIVATE_KEY and/or HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY, or use @launaio/sdk/buyer in your agent runtime",
          };
        }
        throw err;
      }
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

export function createToolHandlers(getClient: GetClient, options: { sandbox?: boolean } = {}) {
  return {
    ...apiHandlers(getClient),
    ...endpointHandlers(getClient, options.sandbox ?? envRequestsSandbox()),
    ...domainHandlers(getClient),
    ...reportingHandlers(getClient),
    ...buyerHandlers(),
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
