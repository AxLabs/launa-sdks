import type { ShellResourceDef } from "./types.js";

export const SHELL_RESOURCES: ShellResourceDef[] = [
  {
    id: "apis",
    label: "APIs",
    methods: [
      { id: "list", label: "List", flags: [], sdkSnippet: "await client.apis.list()" },
      {
        id: "create",
        label: "Create",
        flags: [
          { name: "--name", required: true, type: "string" },
          { name: "--slug", required: true, type: "string" },
          { name: "--upstream", required: true, type: "url" },
          { name: "--pay-to", required: false, type: "address" },
        ],
        sdkSnippet: `await client.apis.create({
  name: "My API",
  slug: "my-api",
  upstream_base_url: "https://api.example.com",
})`,
      },
      {
        id: "get",
        label: "Get",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.apis.get("API_ID")',
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
          { name: "--upstream", required: false, type: "url" },
          { name: "--pay-to", required: false, type: "address" },
        ],
        sdkSnippet: 'await client.apis.update("API_ID", { name: "New name" })',
      },
    ],
  },
  {
    id: "endpoints",
    label: "Endpoints",
    methods: [
      {
        id: "list",
        label: "List",
        flags: [{ name: "--api-id", required: true, type: "string" }],
        sdkSnippet: 'await client.endpoints.list("API_ID")',
      },
      {
        id: "create",
        label: "Create",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--method", required: false, type: "string", defaultValue: "GET" },
          { name: "--path", required: true, type: "string", placeholder: "/v1/*" },
          { name: "--price-usdc", required: false, type: "number", defaultValue: "0.10" },
          { name: "--scheme", required: false, type: "string", defaultValue: "exact" },
        ],
        sdkSnippet: `await client.endpoints.create("API_ID", {
  method: "GET",
  path_pattern: "/v1/*",
  accepts: [buildUsdcAccept("exact", usdcToAtomic("0.10"))],
})`,
      },
      {
        id: "update",
        label: "Update",
        flags: [
          { name: "--api-id", required: true, type: "string" },
          { name: "--endpoint-id", required: true, type: "string" },
          { name: "--enabled", required: false, type: "boolean" },
        ],
        sdkSnippet: 'await client.endpoints.update("API_ID", "ENDPOINT_ID", { enabled: true })',
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
    methods: [
      {
        id: "suggest",
        label: "Suggest",
        flags: [
          { name: "--apex", required: true, type: "string" },
          { name: "--prefix", required: false, type: "string", defaultValue: "x402" },
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
    id: "keys",
    label: "API keys",
    methods: [
      { id: "list", label: "List", flags: [], sdkSnippet: "await client.keys.list()" },
      {
        id: "create",
        label: "Create",
        flags: [
          { name: "--name", required: true, type: "string" },
          { name: "--scopes", required: true, type: "string", placeholder: "apis:read,apis:write" },
        ],
        sdkSnippet: 'await client.keys.create({ name: "CI", scopes: ["apis:read"] })',
      },
      {
        id: "revoke",
        label: "Revoke",
        flags: [{ name: "--id", required: true, type: "string" }],
        sdkSnippet: 'await client.keys.revoke("KEY_ID")',
      },
    ],
  },
  {
    id: "auth",
    label: "Auth",
    methods: [
      {
        id: "me",
        label: "Me",
        flags: [],
        sdkSnippet: "await client.auth.me()",
      },
      {
        id: "login",
        label: "Login",
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
          { name: "--price-usdc", required: false, type: "number", defaultValue: "0.10" },
        ],
        sdkSnippet: 'await client.openapi.import("API_ID", { operations, accepts })',
      },
    ],
  },
  {
    id: "stats",
    label: "Stats",
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
          { name: "--days", required: false, type: "number", defaultValue: "30" },
        ],
        sdkSnippet: 'await client.stats.forApi("API_ID", 30)',
      },
    ],
  },
  {
    id: "settlements",
    label: "Settlements",
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
          { name: "--days", required: false, type: "number", defaultValue: "30" },
          { name: "--api-id", required: false, type: "string" },
          { name: "--limit", required: false, type: "number" },
          { name: "--offset", required: false, type: "number" },
        ],
        sdkSnippet: "await client.settlements.listHistory({ days: 30 })",
      },
    ],
  },
  {
    id: "batch",
    label: "Batch",
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
    methods: [
      {
        id: "platform",
        label: "Platform",
        flags: [],
        sdkSnippet: "await client.config.platform()",
      },
    ],
  },
  {
    id: "networks",
    label: "Networks",
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
    methods: [
      {
        id: "presets",
        label: "Presets",
        flags: [],
        sdkSnippet: "import { SCOPE_PRESETS } from '@axlabs/launa-sdk'",
      },
    ],
  },
  {
    id: "inspect",
    label: "Inspect (buyer)",
    methods: [
      {
        id: "url",
        label: "Inspect URL",
        flags: [
          { name: "--url", required: true, type: "url" },
          { name: "--method", required: false, type: "string", defaultValue: "GET" },
        ],
        sdkSnippet: 'await fetch("https://gateway.example/v1/foo") // HTTP 402 + payment headers',
      },
    ],
  },
  {
    id: "pay",
    label: "Pay",
    methods: [
      {
        id: "url",
        label: "Pay URL",
        flags: [
          { name: "--url", required: true, type: "url" },
          { name: "--method", required: false, type: "string", defaultValue: "GET" },
        ],
        sdkSnippet: 'await buyer.pay({ url: "https://gateway.example/v1/foo" })',
      },
    ],
  },
];

export function shellUsageText(): string {
  const lines = ["Usage: launa [--json] <command> [options]", "", "Commands:"];
  for (const resource of SHELL_RESOURCES) {
    for (const method of resource.methods) {
      const flagParts = method.flags
        .filter((f) => f.required)
        .map((f) => `${f.name} VALUE`)
        .join(" ");
      const optional = method.flags
        .filter((f) => !f.required)
        .map((f) => `[${f.name} VALUE]`)
        .join(" ");
      lines.push(`  ${resource.id} ${method.id}${flagParts ? " " + flagParts : ""}${optional ? " " + optional : ""}`);
    }
  }
  lines.push("  pay url requires LAUNA_EVM_PRIVATE_KEY (CLI) or a browser wallet (Workbench)");
  lines.push("");
  lines.push("Env: LAUNA_BASE_URL, LAUNA_API_KEY or LAUNA_JWT, LAUNA_EVM_PRIVATE_KEY (buyer CLI)");
  return lines.join("\n");
}

export function findMethod(resourceId: string, methodId: string) {
  const resource = SHELL_RESOURCES.find((r) => r.id === resourceId);
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
