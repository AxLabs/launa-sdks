#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Ax402Client } from "@axlabs/ax402-sdk";
import { createToolHandlers } from "./tools.js";

function client(): Ax402Client {
  const baseUrl = process.env.AX402_BASE_URL ?? "http://api.localhost:8090";
  const apiKey = process.env.AX402_API_KEY;
  if (!apiKey) throw new Error("AX402_API_KEY required");
  return new Ax402Client({ baseUrl, apiKey });
}

const handlers = createToolHandlers(client);
const server = new McpServer({ name: "ax402", version: "0.2.0" });

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.tool("ax402_list_apis", "List wrapped APIs. Requires apis:read scope.", {}, async () =>
  text(await handlers.listApis()),
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
  },
  async (args) => text(await handlers.addEndpoint(args.api_id, args.method, args.path_pattern, args.price_usdc)),
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

server.tool("ax402_supported_networks", "Facilitator supported payment networks.", {}, async () =>
  text(await handlers.supportedNetworks()),
);

server.tool("ax402_platform_config", "Platform domain and gateway settings (public).", {}, async () =>
  text(await handlers.platformConfig()),
);

server.tool(
  "ax402_pay_url",
  "Pay for a gateway URL via x402. Wallet/signer must be configured externally; returns instructions.",
  { url: z.string().url() },
  async ({ url }) => text(await handlers.payUrl(url)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
