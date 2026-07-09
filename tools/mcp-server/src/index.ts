#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Ax402Client } from "@ax402/sdk";
import { createToolHandlers } from "./tools.js";

function client(): Ax402Client {
  const baseUrl = process.env.AX402_BASE_URL ?? "https://api.ax402.io";
  const apiKey = process.env.AX402_API_KEY;
  if (!apiKey) throw new Error("AX402_API_KEY required");
  return new Ax402Client({ baseUrl, apiKey });
}

const handlers = createToolHandlers(client);
const server = new McpServer({ name: "ax402", version: "0.0.1" });

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.tool("ax402_list_apis", "List wrapped APIs. Requires apis:read scope.", {}, async () =>
  text(await handlers.listApis()),
);

server.tool(
  "ax402_get_api",
  "Get API by id. Requires apis:read.",
  { api_id: z.string() },
  async ({ api_id }) => text(await handlers.getApi(api_id)),
);

server.tool(
  "ax402_list_endpoints",
  "List endpoints for an API. Requires endpoints:read.",
  { api_id: z.string() },
  async ({ api_id }) => text(await handlers.listEndpoints(api_id)),
);

server.tool(
  "ax402_create_api",
  "Create API with default subdomain. Requires apis:write and verified email.",
  {
    name: z.string(),
    slug: z.string(),
    upstream_base_url: z.string().url(),
    pay_to_address: z.string().optional(),
  },
  async ({ name, slug, upstream_base_url, pay_to_address }) =>
    text(
      await handlers.createApi({
        name,
        slug,
        upstream_base_url,
        pay_to_mode: pay_to_address ? "user_wallet" : undefined,
        pay_to_address,
      }),
    ),
);

server.tool(
  "ax402_add_endpoint",
  "Add paid endpoint. Requires endpoints:write.",
  {
    api_id: z.string(),
    method: z.string(),
    path_pattern: z.string(),
    price_usdc: z.string().default("0.10"),
    scheme: z.enum(["exact", "batch-settlement"]).optional(),
  },
  async (args) =>
    text(
      await handlers.addEndpoint(
        args.api_id,
        args.method,
        args.path_pattern,
        args.price_usdc,
        args.scheme ?? "exact",
      ),
    ),
);

server.tool(
  "ax402_import_openapi",
  "Parse and import OpenAPI spec as endpoints. Requires openapi:read.",
  {
    api_id: z.string(),
    spec: z.string(),
    price_usdc: z.string().default("0.10"),
  },
  async (args) => text(await handlers.importOpenapi(args.api_id, args.spec, args.price_usdc)),
);

server.tool(
  "ax402_add_domain",
  "Add custom domain and return DNS instructions. Requires domains:write.",
  { api_id: z.string(), hostname: z.string() },
  async (args) => text(await handlers.addDomain(args.api_id, args.hostname)),
);

server.tool(
  "ax402_list_domains",
  "List custom domains for an API. Requires domains:read.",
  { api_id: z.string() },
  async ({ api_id }) => text(await handlers.listDomains(api_id)),
);

server.tool(
  "ax402_verify_domain",
  "Verify domain DNS TXT record. Requires domains:write.",
  { api_id: z.string(), domain_id: z.string() },
  async (args) => text(await handlers.verifyDomain(args.api_id, args.domain_id)),
);

server.tool(
  "ax402_domain_suggest",
  "Suggest gateway hostname plan. Requires domains:read.",
  { apex: z.string() },
  async ({ apex }) => text(await handlers.domainSuggest(apex)),
);

server.tool(
  "ax402_stats_overview",
  "Account analytics overview. Requires stats:read.",
  { days: z.number().optional() },
  async ({ days }) => text(await handlers.statsOverview(days ?? 30)),
);

server.tool(
  "ax402_stats_api",
  "Per-API analytics. Requires stats:read.",
  { api_id: z.string(), days: z.number().optional() },
  async ({ api_id, days }) => text(await handlers.statsApi(api_id, days ?? 30)),
);

server.tool(
  "ax402_settlements_list",
  "List settlements for an API. Requires settlements:read.",
  { api_id: z.string() },
  async ({ api_id }) => text(await handlers.settlementsList(api_id)),
);

server.tool(
  "ax402_settlements_export",
  "Export settlement history as CSV or JSON. Requires settlements:read.",
  {
    format: z.enum(["csv", "json"]),
    days: z.number().optional(),
    api_id: z.string().optional(),
  },
  async ({ format, days, api_id }) => text(await handlers.settlementsExport(format, days ?? 30, api_id)),
);

server.tool(
  "ax402_billing_overview",
  "Account billing overview. Requires billing:read.",
  {},
  async () => text(await handlers.billingOverview()),
);

server.tool(
  "ax402_income_summary",
  "Seller income summary. Requires income:read.",
  {},
  async () => text(await handlers.incomeSummary()),
);

server.tool(
  "ax402_apis_slug_check",
  "Check whether an API slug is available. Requires apis:read.",
  { slug: z.string(), exclude_api_id: z.string().optional() },
  async ({ slug, exclude_api_id }) => text(await handlers.checkSlug(slug, exclude_api_id)),
);

server.tool(
  "ax402_apis_probe_upstream",
  "Probe upstream reachability for API endpoints. Requires apis:read.",
  {
    api_id: z.string(),
    endpoint_id: z.string().optional(),
    path: z.string().optional(),
  },
  async ({ api_id, endpoint_id, path }) => text(await handlers.probeUpstream(api_id, endpoint_id, path)),
);

server.tool(
  "ax402_scopes_list",
  "List assignable API key scopes. Requires JWT session.",
  {},
  async () => text(await handlers.listScopes()),
);

server.tool(
  "ax402_facilitator_stats",
  "Facilitator verify/settle stats for your account.",
  { days: z.number().optional() },
  async ({ days }) => text(await handlers.facilitatorStats(days ?? 30)),
);

server.tool(
  "ax402_billing_catalog",
  "Public billing catalog (packages, PAYG tiers). No auth required.",
  {},
  async () => text(await handlers.billingCatalog()),
);

server.tool(
  "ax402_inspect_url",
  "Fetch a gateway URL and parse HTTP 402 payment requirements (no wallet).",
  { url: z.string().url(), method: z.string().optional() },
  async ({ url, method }) => text(await handlers.inspectUrl(url, method)),
);

server.tool("ax402_supported_networks", "Facilitator supported payment networks.", {}, async () =>
  text(await handlers.supportedNetworks()),
);

server.tool("ax402_platform_config", "Platform domain and gateway settings (public).", {}, async () =>
  text(await handlers.platformConfig()),
);

server.tool(
  "ax402_pay_url",
  "Pay for a gateway URL via x402. Requires AX402_EVM_PRIVATE_KEY; signs and retries on HTTP 402.",
  { url: z.string().url(), method: z.string().optional() },
  async ({ url, method }) => text(await handlers.payUrl(url, method)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
