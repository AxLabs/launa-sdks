import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolHandlers } from "./tools.js";

export function createMcpServer(
  handlers: ToolHandlers,
  options: { buyerTools?: boolean } = {},
) {
  const server = new McpServer({ name: "launa", version: "0.0.7" });
  function text(data: unknown) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }

  const apiUpdateFields = {
    name: z.string().optional(),
    slug: z.string().optional(),
    upstream_base_url: z.string().url().optional(),
    pay_to_mode: z.enum(["user_wallet", "platform_wallet"]).optional(),
    pay_to_address: z.string().optional(),
    pay_to_addresses: z.record(z.string()).optional(),
    accept_all_tokens: z.boolean().optional(),
    accepted_token_ids: z.array(z.string()).optional(),
    webhook_url: z.string().url().optional(),
    webhook_secret: z.string().optional(),
    clear_webhook: z.boolean().optional(),
    proxy_unmatched: z.boolean().optional(),
    discovery_guidance: z.string().optional(),
    discovery_contact_email: z.string().email().optional(),
    openapi_version: z.string().optional(),
  };

  const acceptSchema = z.object({
    scheme: z.string(),
    network: z.string(),
    asset: z.string(),
    amount: z.string(),
    max_timeout_seconds: z.number().int().positive().optional(),
    extra: z.record(z.unknown()).optional(),
  });

  const endpointFields = {
    method: z.string().optional(),
    path_pattern: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    accepts: z.array(acceptSchema).min(1).optional(),
    price: z.string().optional(),
    price_usdc: z.string().optional(),
    amount: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),
    network: z.string().optional(),
    asset: z.string().optional(),
    decimals: z.number().int().min(0).max(18).optional(),
    scheme: z.enum(["exact", "batch-settlement"]).optional(),
    ttl: z.number().int().positive().optional(),
    request_schema: z.record(z.unknown()).optional(),
    response_schema: z.record(z.unknown()).optional(),
    clear_schemas: z.boolean().optional(),
  };

  server.tool(
    "launa_list_apis",
    "List wrapped APIs. Requires apis:read scope.",
    {},
    async () => text(await handlers.listApis()),
  );

  server.tool(
    "launa_get_api",
    "Get API by id. Requires apis:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.getApi(api_id)),
  );

  server.tool(
    "launa_update_api",
    "Update an API's name, slug, upstream, payout, webhook, token, proxy, or discovery settings. Requires apis:write.",
    { api_id: z.string(), ...apiUpdateFields },
    async ({ api_id, ...body }) => text(await handlers.updateApi(api_id, body)),
  );

  server.tool(
    "launa_delete_api",
    "Delete an API. Requires apis:write. Confirm with the user before calling.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.deleteApi(api_id)),
  );

  server.tool(
    "launa_webhook_deliveries",
    "List webhook delivery attempts for an API. Requires apis:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.listWebhookDeliveries(api_id)),
  );

  server.tool(
    "launa_batch_overview",
    "Get batch-settlement channels and timing settings for an API. Requires apis:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.batchOverview(api_id)),
  );

  server.tool(
    "launa_update_batch_settings",
    "Update batch claim, settle, and refund intervals for an API. Requires apis:write.",
    {
      api_id: z.string(),
      claim_interval_secs: z.number().int().positive(),
      settle_interval_secs: z.number().int().positive(),
      refund_interval_secs: z.number().int().positive(),
    },
    async ({
      api_id,
      claim_interval_secs,
      settle_interval_secs,
      refund_interval_secs,
    }) =>
      text(
        await handlers.updateBatchSettings(
          api_id,
          claim_interval_secs,
          settle_interval_secs,
          refund_interval_secs,
        ),
      ),
  );

  server.tool(
    "launa_get_cors",
    "List allowed browser origins for an API. Requires apis:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.getCors(api_id)),
  );

  server.tool(
    "launa_set_cors",
    "Replace all allowed browser origins for an API. Requires apis:write.",
    { api_id: z.string(), origins: z.array(z.string()) },
    async ({ api_id, origins }) =>
      text(await handlers.setCors(api_id, origins)),
  );

  server.tool(
    "launa_add_cors_origin",
    "Add one allowed browser origin to an API. Requires apis:write.",
    { api_id: z.string(), origin: z.string().url() },
    async ({ api_id, origin }) =>
      text(await handlers.addCorsOrigin(api_id, origin)),
  );

  server.tool(
    "launa_remove_cors_origin",
    "Remove one allowed browser origin from an API. Requires apis:write. Confirm with the user before calling.",
    { api_id: z.string(), origin: z.string().url() },
    async ({ api_id, origin }) =>
      text(await handlers.removeCorsOrigin(api_id, origin)),
  );

  server.tool(
    "launa_list_endpoints",
    "List endpoints for an API. Requires endpoints:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.listEndpoints(api_id)),
  );

  server.tool(
    "launa_discovery_urls",
    "Get gateway discovery URLs (openapi.json and /.well-known/x402.json) for an API. Requires apis:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.discoveryUrls(api_id)),
  );

  server.tool(
    "launa_set_discovery_guidance",
    "Set discovery_guidance, optional discovery_contact_email, and optional openapi_version on an API. Requires apis:write.",
    {
      api_id: z.string(),
      discovery_guidance: z.string().optional(),
      discovery_contact_email: z.string().email().optional(),
      openapi_version: z.string().optional(),
    },
    async ({
      api_id,
      discovery_guidance,
      discovery_contact_email,
      openapi_version,
    }) =>
      text(
        await handlers.setDiscoveryGuidance(
          api_id,
          discovery_guidance,
          discovery_contact_email,
          openapi_version,
        ),
      ),
  );

  server.tool(
    "launa_update_endpoint_schemas",
    "Update request/response JSON schemas for an endpoint (AgentCash discovery). Requires endpoints:write.",
    {
      api_id: z.string(),
      endpoint_id: z.string(),
      request_schema: z.record(z.unknown()).optional(),
      response_schema: z.record(z.unknown()).optional(),
      clear_schemas: z.boolean().optional(),
    },
    async ({
      api_id,
      endpoint_id,
      request_schema,
      response_schema,
      clear_schemas,
    }) =>
      text(
        await handlers.updateEndpointSchemas(
          api_id,
          endpoint_id,
          request_schema,
          response_schema,
          clear_schemas,
        ),
      ),
  );

  server.tool(
    "launa_create_api",
    "Create API with default subdomain. pay_to_mode defaults to user_wallet, which requires pay_to_address or pay_to_addresses (CAIP-2 → recipient). Select platform_wallet explicitly to use platform-managed payouts where supported. Requires apis:write and verified email.",
    {
      name: z.string(),
      slug: z.string(),
      upstream_base_url: z.string().url(),
      pay_to_mode: z.enum(["user_wallet", "platform_wallet"]).optional(),
      pay_to_address: z.string().optional(),
      pay_to_addresses: z.record(z.string()).optional(),
      discovery_guidance: z.string().optional(),
      discovery_contact_email: z.string().email().optional(),
      openapi_version: z.string().optional(),
      accept_all_tokens: z.boolean().optional(),
      accepted_token_ids: z.array(z.string()).optional(),
      webhook_url: z.string().url().optional(),
      webhook_secret: z.string().optional(),
      proxy_unmatched: z.boolean().optional(),
    },
    async ({
      name,
      slug,
      upstream_base_url,
      pay_to_mode,
      pay_to_address,
      pay_to_addresses,
      discovery_guidance,
      discovery_contact_email,
      openapi_version,
      accept_all_tokens,
      accepted_token_ids,
      webhook_url,
      webhook_secret,
      proxy_unmatched,
    }) =>
      text(
        await handlers.createApi({
          name,
          slug,
          upstream_base_url,
          pay_to_mode: pay_to_mode ?? (pay_to_address || pay_to_addresses ? "user_wallet" : undefined),
          pay_to_address,
          pay_to_addresses,
          discovery_guidance,
          discovery_contact_email,
          openapi_version,
          accept_all_tokens,
          accepted_token_ids,
          webhook_url,
          webhook_secret,
          proxy_unmatched,
        }),
      ),
  );

  server.tool(
    "launa_add_endpoint",
    "Add a paid endpoint. Defaults to platform USDC; custom tokens require network, asset, and price or atomic amount. Requires endpoints:write.",
    {
      api_id: z.string(),
      ...endpointFields,
      method: z.string(),
      path_pattern: z.string(),
    },
    async ({ api_id, ...input }) =>
      text(await handlers.addEndpoint(api_id, input)),
  );

  server.tool(
    "launa_update_endpoint",
    "Update endpoint state, route, pricing accepts, or schemas. Requires endpoints:write.",
    {
      api_id: z.string(),
      endpoint_id: z.string(),
      ...endpointFields,
    },
    async ({ api_id, endpoint_id, ...input }) =>
      text(await handlers.updateEndpoint(api_id, endpoint_id, input)),
  );

  server.tool(
    "launa_delete_endpoint",
    "Delete an endpoint. Requires endpoints:write. Confirm with the user before calling.",
    { api_id: z.string(), endpoint_id: z.string() },
    async ({ api_id, endpoint_id }) =>
      text(await handlers.deleteEndpoint(api_id, endpoint_id)),
  );

  server.tool(
    "launa_parse_openapi",
    "Parse OpenAPI YAML or JSON and return importable operations. Requires openapi:read.",
    { spec: z.string() },
    async ({ spec }) => text(await handlers.parseOpenapi(spec)),
  );

  server.tool(
    "launa_import_openapi",
    "Parse and import OpenAPI spec as endpoints. Requires openapi:read.",
    {
      api_id: z.string(),
      spec: z.string(),
      price_usdc: z.string().default("0.10"),
    },
    async (args) =>
      text(
        await handlers.importOpenapi(args.api_id, args.spec, args.price_usdc),
      ),
  );

  server.tool(
    "launa_add_domain",
    "Add custom domain and return DNS instructions. Requires domains:write.",
    { api_id: z.string(), hostname: z.string() },
    async (args) => text(await handlers.addDomain(args.api_id, args.hostname)),
  );

  server.tool(
    "launa_list_domains",
    "List custom domains for an API. Requires domains:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.listDomains(api_id)),
  );

  server.tool(
    "launa_verify_domain",
    "Verify domain DNS TXT record. Requires domains:write.",
    { api_id: z.string(), domain_id: z.string() },
    async (args) =>
      text(await handlers.verifyDomain(args.api_id, args.domain_id)),
  );

  server.tool(
    "launa_delete_domain",
    "Delete a custom domain. Requires domains:write. Confirm with the user before calling.",
    { api_id: z.string(), domain_id: z.string() },
    async ({ api_id, domain_id }) =>
      text(await handlers.deleteDomain(api_id, domain_id)),
  );

  server.tool(
    "launa_domain_suggest",
    "Suggest gateway hostname plan. Requires domains:read.",
    {
      apex: z.string(),
      prefix: z.string().optional(),
      upstream_path: z.string().optional(),
    },
    async ({ apex, prefix, upstream_path }) =>
      text(await handlers.domainSuggest(apex, prefix, upstream_path)),
  );

  server.tool(
    "launa_stats_overview",
    "Account analytics overview. Requires stats:read.",
    { days: z.number().optional() },
    async ({ days }) => text(await handlers.statsOverview(days ?? 30)),
  );

  server.tool(
    "launa_stats_api",
    "Per-API analytics. Requires stats:read.",
    { api_id: z.string(), days: z.number().optional() },
    async ({ api_id, days }) =>
      text(await handlers.statsApi(api_id, days ?? 30)),
  );

  server.tool(
    "launa_settlements_list",
    "List settlements for an API. Requires settlements:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.settlementsList(api_id)),
  );

  server.tool(
    "launa_settlements_batch",
    "List batch settlements for an API. Requires settlements:read.",
    { api_id: z.string() },
    async ({ api_id }) => text(await handlers.settlementsBatch(api_id)),
  );

  server.tool(
    "launa_settlements_history",
    "List paginated settlement history across APIs. Requires settlements:read.",
    {
      days: z.number().int().min(0).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
      api_id: z.string().optional(),
    },
    async ({ days, limit, offset, api_id }) =>
      text(
        await handlers.settlementsHistory(days ?? 30, limit, offset, api_id),
      ),
  );

  server.tool(
    "launa_settlements_export",
    "Export settlement history as CSV or JSON. Requires settlements:read.",
    {
      format: z.enum(["csv", "json"]),
      days: z.number().optional(),
      api_id: z.string().optional(),
    },
    async ({ format, days, api_id }) =>
      text(await handlers.settlementsExport(format, days ?? 30, api_id)),
  );

  server.tool(
    "launa_billing_overview",
    "Account billing overview. Requires billing:read.",
    {},
    async () => text(await handlers.billingOverview()),
  );

  server.tool(
    "launa_income_summary",
    "Seller income summary. Requires income:read.",
    {},
    async () => text(await handlers.incomeSummary()),
  );

  server.tool(
    "launa_income_ledger",
    "List paginated seller income ledger entries. Requires income:read.",
    {
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
      api_id: z.string().optional(),
      network: z.string().optional(),
    },
    async ({ limit, offset, api_id, network }) =>
      text(await handlers.incomeLedger(limit, offset, api_id, network)),
  );

  server.tool(
    "launa_income_payout_requests",
    "List seller payout requests. Requires income:read.",
    {},
    async () => text(await handlers.incomePayoutRequests()),
  );

  server.tool(
    "launa_apis_slug_check",
    "Check whether an API slug is available. Requires apis:read.",
    { slug: z.string(), exclude_api_id: z.string().optional() },
    async ({ slug, exclude_api_id }) =>
      text(await handlers.checkSlug(slug, exclude_api_id)),
  );

  server.tool(
    "launa_apis_probe_upstream",
    "Probe upstream reachability for API endpoints. Requires apis:read.",
    {
      api_id: z.string(),
      endpoint_id: z.string().optional(),
      path: z.string().optional(),
    },
    async ({ api_id, endpoint_id, path }) =>
      text(await handlers.probeUpstream(api_id, endpoint_id, path)),
  );

  server.tool(
    "launa_facilitator_stats",
    "Facilitator verify/settle stats for your account.",
    { days: z.number().optional() },
    async ({ days }) => text(await handlers.facilitatorStats(days ?? 30)),
  );

  server.tool(
    "launa_billing_catalog",
    "Public billing catalog (packages, PAYG tiers). No auth required.",
    {},
    async () => text(await handlers.billingCatalog()),
  );

  if (options.buyerTools !== false) {
    server.tool(
      "launa_inspect_url",
      "Fetch a gateway URL and parse HTTP 402 payment requirements (no wallet).",
      { url: z.string().url(), method: z.string().optional() },
      async ({ url, method }) => text(await handlers.inspectUrl(url, method)),
    );
  }

  server.tool(
    "launa_supported_networks",
    "Facilitator supported payment networks.",
    {},
    async () => text(await handlers.supportedNetworks()),
  );

  server.tool(
    "launa_platform_config",
    "Platform domain and gateway settings (public).",
    {},
    async () => text(await handlers.platformConfig()),
  );

  if (options.buyerTools !== false) {
    server.tool(
      "launa_pay_url",
      "Pay for a gateway URL via x402. Requires LAUNA_EVM_PRIVATE_KEY and/or HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY; signs and retries on HTTP 402.",
      { url: z.string().url(), method: z.string().optional() },
      async ({ url, method }) => text(await handlers.payUrl(url, method)),
    );
  }

  return server;
}
