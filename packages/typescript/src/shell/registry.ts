import type { ShellResourceDef } from "./types.js";

export const SHELL_RESOURCES: ShellResourceDef[] = [
  {
    id: "apis",
    label: "APIs",
    group: "seller",
    auth: "api_key",
    description: "Wrap an upstream HTTP API behind the Ax402 gateway.",
    methods: [
      { id: "list", label: "List", description: "List wrapped APIs.", flags: [], sdkSnippet: "await client.apis.list()" },
      {
        id: "create",
        label: "Create",
        description: "Create an API wrapper for an upstream origin.",
        mutating: true,
        example: 'apis create --name "My API" --slug my-api --upstream https://api.example.com --json',
        flags: [
          { name: "--name", required: true, type: "string", description: "Display name." },
          { name: "--slug", required: true, type: "string", description: "Gateway subdomain slug." },
          {
            name: "--upstream",
            required: true,
            type: "url",
            apiField: "upstream_base_url",
            description: "Upstream origin (scheme + host, no path).",
          },
          {
            name: "--pay-to",
            required: false,
            type: "address",
            apiField: "pay_to_address",
            description: "Payout address. Required when the account uses user_wallet mode.",
          },
          { name: "--webhook-url", required: false, type: "url" },
          { name: "--webhook-secret", required: false, type: "string" },
          { name: "--discovery-guidance", required: false, type: "string" },
          { name: "--discovery-contact-email", required: false, type: "string" },
          { name: "--openapi-version", required: false, type: "string", placeholder: "1.0.0" },
        ],
        sdkSnippet: `await client.apis.create({
  name: "My API",
  slug: "my-api",
  upstream_base_url: "https://api.example.com",
  webhook_url: "https://app.example/webhooks/ax402/settlement",
  webhook_secret: "whsec_...",
  discovery_guidance: "Use POST /search with a query field.",
})`,
      },
      {
        id: "webhook-deliveries",
        label: "Webhook deliveries",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.listWebhookDeliveries("API_ID")',
      },
      {
        id: "get",
        label: "Get",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.get("API_ID")',
      },
      {
        id: "discovery",
        label: "Discovery URLs",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.discovery("API_ID")',
      },
      {
        id: "delete",
        label: "Delete",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.delete("API_ID")',
      },
      {
        id: "update",
        label: "Update",
        flags: [
          { name: "--id", required: true, type: "string" },
          { name: "--name", required: false, type: "string" },
          { name: "--slug", required: false, type: "string" },
          {
            name: "--upstream",
            required: false,
            type: "url",
            apiField: "upstream_base_url",
            description: "Upstream origin (scheme + host, no path).",
          },
          {
            name: "--pay-to",
            required: false,
            type: "address",
            apiField: "pay_to_address",
            description: "Payout address.",
          },
          { name: "--webhook-url", required: false, type: "url" },
          { name: "--webhook-secret", required: false, type: "string" },
          { name: "--clear-webhook", required: false, type: "boolean" },
          { name: "--discovery-guidance", required: false, type: "string" },
          { name: "--discovery-contact-email", required: false, type: "string" },
          { name: "--openapi-version", required: false, type: "string", placeholder: "1.0.0" },
        ],
        sdkSnippet: `await client.apis.update("API_ID", {
  discovery_guidance: "Use POST /search with a query field.",
  discovery_contact_email: "support@example.com",
})`,
      },
      {
        id: "slug-check",
        label: "Slug check",
        flags: [
          { name: "--slug", required: true, type: "string" },
          { name: "--exclude-api-id", required: false, type: "string" },
        ],
        sdkSnippet: 'await client.apis.checkSlugAvailability("my-api")',
      },
      {
        id: "probe-upstream",
        label: "Probe upstream",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--endpoint-id", required: false, type: "string" },
          { name: "--path", required: false, type: "string" },
        ],
        sdkSnippet: 'await client.apis.probeUpstream("API_ID")',
      },
      {
        id: "cors-list",
        label: "List CORS origins",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.getCors("API_ID")',
      },
      {
        id: "cors-set",
        label: "Set CORS origins",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--origins", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.apis.putCors("API_ID", ["http://localhost:5173"])',
      },
      {
        id: "cors-add",
        label: "Add CORS origin",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--origin", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.apis.addCorsOrigin("API_ID", "http://localhost:5173")',
      },
      {
        id: "cors-remove",
        label: "Remove CORS origin",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--origin", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.apis.removeCorsOrigin("API_ID", "http://localhost:5173")',
      },
    ],
  },
  {
    id: "endpoints",
    label: "Endpoints",
    group: "seller",
    auth: "api_key",
    description: "Paid routes (method + path) on a wrapped API.",
    methods: [
      {
        id: "list",
        label: "List",
        description: "List paid endpoints for one API.",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.endpoints.list("API_ID")',
      },
      {
        id: "create",
        label: "Create",
        description: "Create a paid endpoint. --path is exact unless it contains *.",
        mutating: true,
        example: 'endpoints create --api-id ID --path "/v1/*" --method GET --price-usdc 0.10 --json',
        flags: [
          { name: "--api-id", required: true, type: "string" },
          {
            name: "--method",
            required: false,
            type: "string",
            defaultValue: "GET",
            prefill: "GET",
            description: "HTTP method. Currently defaults to GET if omitted.",
          },
          {
            name: "--path",
            required: true,
            type: "string",
            placeholder: "/v1/*",
            apiField: "path_pattern",
            description:
              "Gateway path. Exact match unless it contains * (prefix/segment matching). Not a full URL.",
          },
          {
            name: "--price-usdc",
            required: false,
            type: "number",
            defaultValue: "0.10",
            prefill: "0.10",
            aliases: ["--price"],
            description: "Price in USDC. Currently defaults to 0.10 if omitted.",
          },
          {
            name: "--price",
            required: false,
            type: "number",
            placeholder: "0.10",
            aliasOf: "--price-usdc",
            description: "Alias of --price-usdc.",
          },
          { name: "--network", required: false, type: "string", placeholder: "hedera:mainnet" },
          { name: "--asset", required: false, type: "string", placeholder: "0.0.429274" },
          { name: "--decimals", required: false, type: "number", defaultValue: "6", prefill: "6" },
          { name: "--scheme", required: false, type: "string", defaultValue: "exact", prefill: "exact" },
          {
            name: "--ttl",
            required: false,
            type: "number",
            placeholder: "1800",
            apiField: "ttl",
            description:
              "Ephemeral gateway-route lifetime in seconds. Deletes this route after first settle or expiry — not the upstream product’s pass length.",
          },
          { name: "--request-schema", required: false, type: "string", placeholder: '{"type":"object",...}' },
          { name: "--response-schema", required: false, type: "string", placeholder: '{"type":"object",...}' },
        ],
        sdkSnippet: `await client.endpoints.create("API_ID", {
  method: "GET",
  path_pattern: "/v1/*",
  accepts: [buildUsdcAccept("exact", usdcToAtomic("0.10"))],
  ttl: 1800, // optional — omit for permanent endpoints
})`,
      },
      {
        id: "update",
        label: "Update",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--endpoint-id", required: true, type: "string" },
          { name: "--enabled", required: false, type: "boolean" },
          { name: "--network", required: false, type: "string", placeholder: "hedera:mainnet" },
          { name: "--asset", required: false, type: "string", placeholder: "0.0.429274" },
          {
            name: "--price-usdc",
            required: false,
            type: "number",
            placeholder: "0.10",
            aliases: ["--price"],
            description: "Price in USDC.",
          },
          {
            name: "--price",
            required: false,
            type: "number",
            placeholder: "0.10",
            aliasOf: "--price-usdc",
            description: "Alias of --price-usdc.",
          },
          { name: "--amount", required: false, type: "string", placeholder: "100000" },
          { name: "--decimals", required: false, type: "number", defaultValue: "6" },
          { name: "--scheme", required: false, type: "string", defaultValue: "exact" },
          { name: "--accepts", required: false, type: "string", placeholder: '[{"scheme":"exact",...}]' },
          { name: "--request-schema", required: false, type: "string", placeholder: '{"type":"object",...}' },
          { name: "--response-schema", required: false, type: "string", placeholder: '{"type":"object",...}' },
          { name: "--clear-schemas", required: false, type: "boolean" },
        ],
        sdkSnippet:
          'await client.endpoints.update("API_ID", "ENDPOINT_ID", { request_schema: {...}, response_schema: {...} })',
      },
      {
        id: "delete",
        label: "Delete",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--endpoint-id", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.endpoints.delete("API_ID", "ENDPOINT_ID")',
      },
    ],
  },
  {
    id: "domains",
    label: "Domains",
    group: "seller",
    auth: "api_key",
    description: "Custom hostnames for a wrapped API.",
    methods: [
      {
        id: "suggest",
        label: "Suggest",
        flags: [
          { name: "--apex", required: true, type: "string" },
          { name: "--prefix", required: false, type: "string", defaultValue: "x402", prefill: "x402" },
        ],
        sdkSnippet: 'await client.domains.suggest("example.com", "x402")',
      },
      {
        id: "add",
        label: "Add",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--hostname", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.domains.add("API_ID", "api.example.com")',
      },
      {
        id: "verify",
        label: "Verify",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--domain-id", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.domains.verify("API_ID", "DOMAIN_ID")',
      },
      {
        id: "list",
        label: "List",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.domains.list("API_ID")',
      },
      {
        id: "delete",
        label: "Delete",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--domain-id", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.domains.delete("API_ID", "DOMAIN_ID")',
      },
    ],
  },
  {
    id: "sandbox-wallet",
    label: "Sandbox wallet",
    group: "account",
    auth: "jwt",
    aliases: ["sandbox_wallet"],
    description: "Funded Test-mode buyer wallet. JWT and --sandbox. Not available with an API key.",
    methods: [
      {
        id: "get",
        label: "Get (JWT + --sandbox)",
        description: "Get the sandbox buyer wallet. JWT only.",
        auth: "jwt",
        flags: [
          { name: "--wait", required: false, type: "boolean" },
          { name: "--no-wait", required: false, type: "boolean" },
        ],
        sdkSnippet: `await client.setEnvironment("development");
const wallet = await client.sandboxWallet.get();
const balances = await client.config.devBalances(wallet.address);`,
      },
      {
        id: "reset",
        label: "Reset (JWT + --sandbox)",
        description: "Reset the sandbox buyer wallet. JWT only.",
        auth: "jwt",
        mutating: true,
        flags: [
          { name: "--wait", required: false, type: "boolean" },
          { name: "--no-wait", required: false, type: "boolean" },
        ],
        sdkSnippet: `await client.setEnvironment("development");
await client.sandboxWallet.reset();`,
      },
    ],
  },
  {
    id: "keys",
    label: "API keys",
    group: "account",
    auth: "jwt",
    description: "Create and revoke API keys. JWT only — not available with AX402_API_KEY.",
    methods: [
      {
        id: "list",
        label: "List",
        description: "List API keys. JWT only.",
        auth: "jwt",
        flags: [],
        sdkSnippet: "await client.keys.list()",
      },
      {
        id: "create",
        label: "Create",
        description: "Create an API key (shown once). JWT only.",
        auth: "jwt",
        mutating: true,
        flags: [
          { name: "--name", required: true, type: "string" },
          { name: "--scopes", required: true, type: "string", placeholder: "apis:read,apis:write" },
        ],
        sdkSnippet: 'await client.keys.create({ name: "CI", scopes: ["apis:read"] })',
      },
      {
        id: "revoke",
        label: "Revoke",
        description: "Revoke an API key. JWT only.",
        auth: "jwt",
        mutating: true,
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.keys.revoke("KEY_ID")',
      },
    ],
  },
  {
    id: "auth",
    label: "Auth",
    group: "account",
    description: "Login (public) and current user (JWT).",
    methods: [
      {
        id: "me",
        label: "Me",
        description: "Current user. JWT only — not available with an API key.",
        auth: "jwt",
        flags: [],
        sdkSnippet: "await client.auth.me()",
      },
      {
        id: "login",
        label: "Login",
        description: "Email/password login. Public; prints a JWT.",
        auth: "public",
        flags: [
          { name: "--email", required: true, type: "string" },
          { name: "--password", required: true, type: "string" },
        ],
        sdkSnippet: 'await client.auth.login("email@example.com", "password")',
      },
    ],
  },
  {
    id: "openapi",
    label: "OpenAPI",
    group: "seller",
    auth: "api_key",
    description: "Parse and import OpenAPI specs as paid endpoints.",
    methods: [
      {
        id: "parse",
        label: "Parse",
        flags: [
          { name: "--spec", required: false, type: "textarea", label: "OpenAPI spec (YAML/JSON)" },
          { name: "--file", required: false, type: "string", label: "File path (CLI only)" },
        ],
        sdkSnippet: 'await client.openapi.parseSpec(openApiYamlString)',
      },
      {
        id: "import",
        label: "Import",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--spec", required: false, type: "textarea", label: "OpenAPI spec (YAML/JSON)" },
          { name: "--file", required: false, type: "string", label: "File path (CLI only)" },
          { name: "--price-usdc", required: false, type: "number", defaultValue: "0.10", prefill: "0.10", aliases: ["--price"] },
        ],
        sdkSnippet: 'await client.openapi.import("API_ID", { operations, accepts })',
      },
    ],
  },
  {
    id: "discovery",
    label: "Discovery",
    group: "seller",
    auth: "api_key",
    description: "Gateway OpenAPI and well-known URLs.",
    methods: [
      {
        id: "urls",
        label: "URLs",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.discovery("API_ID")',
      },
      {
        id: "check",
        label: "Check (AgentCash)",
        flags: [
          {
            name: "--url",
            required: true,
            type: "string",
            placeholder: "https://myapi.example.com",
          },
        ],
        sdkSnippet:
          'npx -y @agentcash/discovery@latest check "https://myapi.example.com"',
      },
    ],
  },
  {
    id: "stats",
    label: "Stats",
    group: "seller",
    auth: "api_key",
    description: "Traffic and earnings stats.",
    methods: [
      {
        id: "overview",
        label: "Overview",
        flags: [{ name: "--days", required: false, type: "number", defaultValue: "30" }],
        sdkSnippet: "await client.stats.overview(30)",
      },
      {
        id: "api",
        label: "API",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--days", required: false, type: "number", defaultValue: "30", prefill: "30" },
        ],
        sdkSnippet: 'await client.stats.forApi("API_ID", 30)',
      },
    ],
  },
  {
    id: "settlements",
    label: "Settlements",
    group: "seller",
    auth: "api_key",
    description: "Settlements and payment history.",
    methods: [
      {
        id: "list",
        label: "List",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.settlements.list("API_ID")',
      },
      {
        id: "batch",
        label: "Batch",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.settlements.listBatch("API_ID")',
      },
      {
        id: "history",
        label: "History",
        flags: [
          { name: "--days", required: false, type: "number", defaultValue: "30", prefill: "30" },
          { name: "--api-id", required: false, type: "string" },
          { name: "--limit", required: false, type: "number" },
          { name: "--offset", required: false, type: "number" },
        ],
        sdkSnippet: "await client.settlements.listHistory({ days: 30 })",
      },
      {
        id: "export",
        label: "Export",
        flags: [
          { name: "--format", required: true, type: "string", placeholder: "csv|json" },
          { name: "--days", required: false, type: "number", defaultValue: "30", prefill: "30" },
          { name: "--api-id", required: false, type: "string" },
        ],
        sdkSnippet: 'await client.settlements.exportHistory({ days: 30, format: "csv" })',
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    group: "account",
    auth: "api_key",
    description: "Seller billing and packages.",
    methods: [
      { id: "overview", label: "Overview", flags: [], sdkSnippet: "await client.billing.overview()" },
      { id: "packages", label: "Packages", flags: [], sdkSnippet: "await client.billing.packages()" },
      { id: "invoices", label: "Invoices", flags: [], sdkSnippet: "await client.billing.invoices()" },
    ],
  },
  {
    id: "income",
    label: "Income",
    group: "account",
    auth: "api_key",
    description: "Earnings, ledger, and payout requests.",
    methods: [
      { id: "summary", label: "Summary", flags: [], sdkSnippet: "await client.income.summary()" },
      {
        id: "ledger",
        label: "Ledger",
        flags: [
          { name: "--limit", required: false, type: "number" },
          { name: "--offset", required: false, type: "number" },
          { name: "--api-id", required: false, type: "string" },
          { name: "--network", required: false, type: "string" },
        ],
        sdkSnippet: "await client.income.ledger({ limit: 50 })",
      },
      {
        id: "payout-requests",
        label: "Payout requests",
        flags: [],
        sdkSnippet: "await client.income.payoutRequests()",
      },
    ],
  },
  {
    id: "facilitator",
    label: "Facilitator",
    group: "seller",
    auth: "api_key",
    description: "Facilitator verify/settle stats.",
    methods: [
      {
        id: "stats",
        label: "Stats",
        flags: [{ name: "--days", required: false, type: "number", defaultValue: "30" }],
        sdkSnippet: "await client.auth.facilitatorStats(30)",
      },
      {
        id: "events",
        label: "Events",
        flags: [
          { name: "--days", required: false, type: "number", defaultValue: "30", prefill: "30" },
          { name: "--limit", required: false, type: "number" },
          { name: "--offset", required: false, type: "number" },
        ],
        sdkSnippet: "await client.auth.facilitatorEvents({ days: 30 })",
      },
    ],
  },
  {
    id: "exchange-rates",
    label: "Exchange rates",
    group: "seller",
    auth: "api_key",
    description: "Token exchange rates.",
    methods: [
      {
        id: "list",
        label: "List all tokens",
        flags: [
          { name: "--quote", required: false, type: "string", defaultValue: "usd" },
          { name: "--date", required: false, type: "string" },
        ],
        sdkSnippet: 'await client.exchangeRates.list({ quote: "usd" })',
      },
      { id: "supported", label: "Supported", flags: [], sdkSnippet: "await client.exchangeRates.supported()" },
      {
        id: "lookup",
        label: "Lookup",
        flags: [
          { name: "--network", required: true, type: "string" },
          { name: "--asset", required: true, type: "string" },
          { name: "--quote", required: false, type: "string" },
          { name: "--date", required: false, type: "string" },
        ],
        sdkSnippet: 'await client.exchangeRates.lookup({ network: "eip155:8453", asset: "0x..." })',
      },
    ],
  },
  {
    id: "batch",
    label: "Batch",
    group: "seller",
    auth: "api_key",
    description: "Batch settlement intervals.",
    methods: [
      {
        id: "overview",
        label: "Overview",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.batchOverview("API_ID")',
      },
      {
        id: "settings",
        label: "Settings",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--claim-interval-secs", required: true, type: "number" },
          { name: "--settle-interval-secs", required: true, type: "number" },
          { name: "--refund-interval-secs", required: true, type: "number" },
        ],
        sdkSnippet: 'await client.apis.updateBatchSettings("API_ID", { claim_interval_secs: 900, settle_interval_secs: 3600, refund_interval_secs: 86400 })',
      },
    ],
  },
  {
    id: "config",
    label: "Config",
    group: "meta",
    auth: "public",
    description: "Public platform config and billing catalog. No API key.",
    methods: [
      {
        id: "platform",
        label: "Platform",
        flags: [],
        sdkSnippet: "await client.config.platform()",
      },
      {
        id: "billing",
        label: "Billing catalog",
        flags: [],
        sdkSnippet: "await client.config.billing()",
      },
    ],
  },
  {
    id: "networks",
    label: "Networks",
    group: "account",
    auth: "api_key",
    description: "Networks and assets this account can use.",
    methods: [
      {
        id: "supported",
        label: "Supported",
        flags: [],
        sdkSnippet: "await client.auth.supportedNetworks()",
      },
    ],
  },
  {
    id: "scopes",
    label: "Scopes",
    group: "account",
    description: "Scope presets (local) and live scope list (JWT).",
    methods: [
      {
        id: "presets",
        label: "Presets",
        description: "Built-in scope presets (local, no credentials).",
        auth: "public",
        flags: [],
        sdkSnippet: "import { SCOPE_PRESETS } from '@ax402/sdk'",
      },
      {
        id: "list",
        label: "List",
        description: "List scopes from the control plane. JWT only.",
        auth: "jwt",
        flags: [],
        sdkSnippet: "await client.keys.listScopes()",
      },
    ],
  },
  {
    id: "inspect",
    label: "Inspect (buyer)",
    group: "buyer",
    auth: "buyer",
    description: "Inspect payment requirements on a gateway URL. No seller API key.",
    methods: [
      {
        id: "url",
        label: "Inspect URL",
        description: "GET a gateway URL and parse HTTP 402 payment requirements.",
        auth: "buyer",
        flags: [
          { name: "--url", required: true, type: "url", description: "Gateway URL (not the control plane)." },
          {
            name: "--method",
            required: false,
            type: "string",
            defaultValue: "GET",
            prefill: "GET",
          },
        ],
        sdkSnippet: 'await fetch("https://gateway.example/v1/foo") // HTTP 402 + payment headers',
      },
    ],
  },
  {
    id: "pay",
    label: "Pay",
    group: "buyer",
    auth: "buyer",
    description: "Pay a gateway URL with a buyer wallet. No seller API key.",
    methods: [
      {
        id: "url",
        label: "Pay URL",
        description: "Pay a gateway URL. Uses AX402_EVM_PRIVATE_KEY and/or Hedera keys — not AX402_API_KEY.",
        auth: "buyer",
        mutating: true,
        flags: [
          { name: "--url", required: true, type: "url", description: "Gateway URL (not the control plane)." },
          {
            name: "--method",
            required: false,
            type: "string",
            defaultValue: "GET",
            prefill: "GET",
          },
        ],
        sdkSnippet: 'await buyer.pay({ url: "https://gateway.example/v1/foo" })',
      },
    ],
  },
];

export function findResource(resourceId: string): ShellResourceDef | undefined {
  const normalized = resourceId.replace(/_/g, "-");
  return SHELL_RESOURCES.find(
    (r) =>
      r.id === resourceId ||
      r.id === normalized ||
      r.aliases?.includes(resourceId) ||
      r.aliases?.includes(normalized),
  );
}

export function findMethod(resourceId: string, methodId: string) {
  const resource = findResource(resourceId);
  return resource?.methods.find((m) => m.id === methodId);
}

export function buildArgvFromForm(
  resourceId: string,
  methodId: string,
  values: Record<string, string>,
  json = false,
): string[] {
  const argv: string[] = [];
  if (json) argv.push("--json");
  argv.push(resourceId, methodId);
  const method = findMethod(resourceId, methodId);
  if (!method) return argv;
  for (const flag of method.flags) {
    if (flag.aliasOf) continue;
    const v = values[flag.name]?.trim();
    if (v) argv.push(flag.name, v);
  }
  return argv;
}

export function argvToShellCommand(argv: string[]): string {
  return argv
    .map((t) => (t.includes(" ") || t.includes('"') ? `"${t.replace(/"/g, '\\"')}"` : t))
    .join(" ");
}
