import { atomicToUsdc } from "../platform/helpers.js";

const SKIP_KEYS = new Set(["user_id", "updated_at", "created_at", "gateway_server"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function shortAddr(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function col(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
}

function formatScalar(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (v.startsWith("0x") && v.length > 20) return shortAddr(v, 8, 6);
    if (v.length > 72) return `${v.slice(0, 69)}…`;
    return v;
  }
  return str(v);
}

function formatValue(v: unknown, indent: number): string[] {
  const pad = "  ".repeat(indent);
  if (v == null) return [`${pad}—`];
  if (Array.isArray(v)) {
    if (v.length === 0) return [`${pad}(empty)`];
    const lines: string[] = [];
    for (const item of v.slice(0, 12)) {
      if (isRecord(item)) {
        const summary = item.name ?? item.hostname ?? item.id ?? item.method;
        if (summary != null && Object.keys(item).length <= 4) {
          lines.push(`${pad}• ${formatScalar(summary)}`);
        } else {
          lines.push(`${pad}•`);
          lines.push(...formatRecord(item, indent + 1, 4));
        }
      } else {
        lines.push(`${pad}• ${formatScalar(item)}`);
      }
    }
    if (v.length > 12) lines.push(`${pad}… ${v.length - 12} more`);
    return lines;
  }
  if (isRecord(v)) return formatRecord(v, indent, 6);
  return [`${pad}${formatScalar(v)}`];
}

function formatRecord(obj: Record<string, unknown>, indent = 0, maxKeys = 24): string[] {
  const pad = "  ".repeat(indent);
  const lines: string[] = [];
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value == null || value === "") continue;
    count += 1;
    if (count > maxKeys) {
      lines.push(`${pad}…`);
      break;
    }
    if (Array.isArray(value) || isRecord(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(...formatValue(value, indent + 1));
    } else {
      lines.push(`${pad}${key}: ${formatScalar(value)}`);
    }
  }
  return lines;
}

function formatGeneric(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "(empty)";
    if (typeof data[0] === "string") return data.map((s) => `  • ${s}`).join("\n");
    const lines: string[] = [`List (${data.length})`, ""];
    data.slice(0, 15).forEach((item, i) => {
      if (isRecord(item)) {
        lines.push(`  [${i + 1}]`);
        lines.push(...formatRecord(item, 2, 8));
      } else {
        lines.push(`  • ${formatScalar(item)}`);
      }
    });
    if (data.length > 15) lines.push(`  … ${data.length - 15} more`);
    return lines.join("\n");
  }
  if (isRecord(data)) return formatRecord(data, 0).join("\n");
  return String(data);
}

function formatAccepts(accepts: unknown): string {
  if (!Array.isArray(accepts) || accepts.length === 0) return "—";
  return accepts
    .map((a) => {
      if (!isRecord(a)) return str(a);
      const amount = a.amount != null ? `${atomicToUsdc(str(a.amount))} USDC` : "?";
      return `${str(a.scheme)} · ${str(a.network)} · ${amount}`;
    })
    .join("\n           ");
}

function asRecords(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord);
}

function envLabel(env: unknown): string {
  const e = str(env);
  if (e === "development") return "Test";
  if (e === "production") return "Live";
  return e || "—";
}

function formatPayTo(api: Record<string, unknown>): string {
  const mode = str(api.pay_to_mode);
  const addr = api.pay_to_address ? ` (${shortAddr(str(api.pay_to_address), 8, 6)})` : "";
  if (mode === "user_wallet") return `your wallet${addr}`;
  if (mode === "platform_wallet") return "platform wallet";
  return `${mode || "—"}${addr}`;
}

function formatDomainLine(d: Record<string, unknown>): string {
  const flags: string[] = [];
  if (d.is_primary) flags.push("primary");
  if (d.is_default_subdomain) flags.push("default");
  flags.push(d.verified_at ? "verified" : "pending");
  const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";
  return `${d.hostname}${suffix}`;
}

function formatApiDomains(api: Record<string, unknown>, indent = "  "): string[] {
  const domains = Array.isArray(api.domains) ? api.domains.filter(isRecord) : [];
  if (domains.length === 0) return [`${indent}domains:     —`];
  const lines = [`${indent}domains:`];
  for (const d of domains) {
    lines.push(`${indent}  • ${formatDomainLine(d)}`);
  }
  return lines;
}

function formatApiGateway(api: Record<string, unknown>): string | null {
  if (isRecord(api.gateway_server)) {
    const gs = api.gateway_server;
    const host = str(gs.public_hostname || gs.name);
    const status = gs.status ? `, ${gs.status}` : "";
    return `${host}${status}`;
  }
  if (api.gateway_cname_target) return str(api.gateway_cname_target);
  const primary = Array.isArray(api.domains)
    ? api.domains.find((d) => isRecord(d) && d.is_primary)
    : undefined;
  if (isRecord(primary)) return str(primary.hostname);
  return null;
}

function formatApiSummary(api: Record<string, unknown>, index?: number): string[] {
  const title = index != null ? `[${index}] ${api.name}` : String(api.name);
  const lines = [
    title,
    `  id:          ${api.id}`,
    `  slug:        ${api.slug}`,
    `  environment: ${envLabel(api.environment)}`,
    `  upstream:    ${api.upstream_base_url}`,
    `  pay to:      ${formatPayTo(api)}`,
  ];
  if (api.webhook_url || api.webhook_configured) {
    lines.push(
      `  webhook:     ${api.webhook_url ?? "—"} (${api.webhook_configured ? "secret set" : "no secret"})`,
    );
  }
  const gateway = formatApiGateway(api);
  if (gateway) lines.push(`  gateway:     ${gateway}`);
  lines.push(...formatApiDomains(api));
  return lines;
}

function formatApi(api: Record<string, unknown>): string {
  return ["API", ...formatApiSummary(api)].join("\n");
}

function formatDiscoveryURLs(data: Record<string, unknown>): string {
  const lines = ["Discovery"];
  if (typeof data.primary_host === "string" && data.primary_host) {
    lines.push(`  primary: ${data.primary_host}`);
  }
  if (typeof data.openapi_url === "string" && data.openapi_url) {
    lines.push(`  openapi: ${data.openapi_url}`);
  }
  if (typeof data.well_known_url === "string" && data.well_known_url) {
    lines.push(`  well-known: ${data.well_known_url}`);
  }
  if (typeof data.endpoint_count === "number") {
    lines.push(`  endpoints: ${data.endpoint_count} (${data.discoverable_endpoint_count ?? 0} discoverable)`);
  }
  if (Array.isArray(data.host_urls)) {
    for (const row of data.host_urls) {
      if (!isRecord(row) || typeof row.host !== "string") continue;
      const mark = row.is_primary ? " (primary)" : "";
      lines.push(`  host ${row.host}${mark}`);
      if (typeof row.openapi_url === "string") lines.push(`    openapi: ${row.openapi_url}`);
      if (typeof row.well_known_url === "string") lines.push(`    well-known: ${row.well_known_url}`);
    }
  }
  return lines.join("\n");
}

function formatApiList(apis: Record<string, unknown>[]): string {
  if (apis.length === 0) return "No APIs.";
  const blocks = apis.map((api, i) => formatApiSummary(api, i + 1).join("\n"));
  return [`APIs (${apis.length})`, "", ...blocks].join("\n\n");
}

function formatEndpoint(ep: Record<string, unknown>): string {
  const ttlLine =
    ep.ttl != null
      ? `  ttl:     ${ep.ttl}s${ep.expires_at ? ` (expires ${ep.expires_at})` : ""}`
      : null;
  return [
    `Endpoint  ${ep.method} ${ep.path_pattern}`,
    `  id:      ${ep.id}`,
    `  enabled: ${ep.enabled === false ? "no" : "yes"}`,
    ttlLine,
    `  accepts: ${formatAccepts(ep.accepts)}`,
    ep.ttl != null ? `  ttl:     ${ep.ttl}s (expires ${ep.expires_at ?? "—"})` : null,
    ep.description ? `  note:    ${ep.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEndpointList(eps: Record<string, unknown>[]): string {
  if (eps.length === 0) return "No endpoints.";
  const lines = [`Endpoints (${eps.length})`, ""];
  const wMethod = 6;
  const wPath = 22;
  const wPrice = 16;
  lines.push(`  ${col("METHOD", wMethod)}${col("PATH", wPath)}${col("PRICE", wPrice)}STATUS`);
  for (const ep of eps) {
    const price = Array.isArray(ep.accepts) && isRecord(ep.accepts[0]) && ep.accepts[0].amount != null
      ? `${atomicToUsdc(str(ep.accepts[0].amount))} USDC`
      : "—";
    const status =
      ep.enabled === false ? "disabled" : ep.ttl != null ? `ephemeral (${ep.ttl}s)` : "enabled";
    lines.push(
      `  ${col(str(ep.method), wMethod)}${col(str(ep.path_pattern), wPath)}${col(price, wPrice)}${status}`,
    );
  }
  return lines.join("\n");
}

function formatKey(key: Record<string, unknown>): string {
  return [
    `API key  ${key.name}`,
    `  id:      ${key.id}`,
    `  prefix:  ${key.key_prefix ?? (key.key ? "(shown once)" : "—")}`,
    `  scopes:  ${Array.isArray(key.scopes) ? key.scopes.join(", ") : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatKeyList(keys: Record<string, unknown>[]): string {
  if (keys.length === 0) return "No API keys.";
  const lines = [`API keys (${keys.length})`, ""];
  for (const key of keys) {
    lines.push(
      `  ${str(key.id)}  ${str(key.name)}  [${Array.isArray(key.scopes) ? key.scopes.join(", ") : ""}]`,
    );
  }
  return lines.join("\n");
}

function formatCreatedKey(key: Record<string, unknown>): string {
  return [
    "API key created — copy the secret now; it won't be shown again.",
    "",
    formatKey(key),
    key.key ? `  secret:  ${key.key}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatUser(user: Record<string, unknown>): string {
  return [
    "Account",
    `  email:        ${user.email}`,
    `  verified:     ${user.email_verified ? "yes" : "no"}`,
    `  environment:  ${user.preferred_environment ?? "production"}`,
    user.totp_enabled != null ? `  2FA:          ${user.totp_enabled ? "on" : "off"}` : null,
    user.passkey_count != null ? `  passkeys:     ${user.passkey_count}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatStats(stats: Record<string, unknown>): string {
  const earnings = Array.isArray(stats.total_earnings)
    ? stats.total_earnings
        .map((e) => (isRecord(e) ? `${str(e.network)}: ${atomicToUsdc(str(e.amount))} USDC (${e.count} tx)` : ""))
        .filter(Boolean)
        .join(" · ")
    : "—";

  const lines = [
    "Stats overview",
    `  requests:         ${stats.total_requests ?? 0}`,
    `  402 challenges:   ${stats.payment_required ?? 0}`,
    `  paid:             ${stats.paid_requests ?? 0}`,
    `  unique payers:    ${stats.unique_payers ?? 0}`,
    `  earnings:         ${earnings || "—"}`,
  ];

  if (Array.isArray(stats.top_payers) && stats.top_payers.length > 0) {
    lines.push("", "  Top payers:");
    for (const p of stats.top_payers.slice(0, 5)) {
      if (!isRecord(p)) continue;
      const network = isRecord(p) && p.network ? ` · ${str(p.network)}` : "";
      lines.push(`    ${shortAddr(str(p.payer), 8, 6)}${network}  ${atomicToUsdc(str(p.amount))} USDC  (${p.count}×)`);
    }
  }

  if (Array.isArray(stats.top_apis) && stats.top_apis.length > 0) {
    lines.push("", "  Top APIs:");
    for (const a of stats.top_apis.slice(0, 5)) {
      if (!isRecord(a)) continue;
      lines.push(`    ${str(a.api_name ?? a.api_id)}  ${a.paid_requests ?? 0} paid / ${a.total_requests ?? 0} total`);
    }
  }

  return lines.join("\n");
}

function formatPlatform(cfg: Record<string, unknown>): string {
  const lines = [
    "Platform config",
    `  domain:         ${cfg.platform_domain}`,
    `  gateway CNAME:  ${cfg.gateway_cname_target}`,
    `  gateway port:   ${cfg.gateway_port}`,
    `  admin host:     ${cfg.admin_host}`,
  ];
  if (Array.isArray(cfg.platform_domains)) {
    lines.push("  production domains:");
    for (const d of cfg.platform_domains) {
      if (!isRecord(d)) continue;
      lines.push(`    • ${d.domain}${d.is_primary ? " (primary)" : ""}`);
    }
  }
  return lines.join("\n");
}

function formatDomainPlan(plan: Record<string, unknown>): string {
  return [
    "Suggested domain",
    `  gateway:  ${plan.gateway_hostname}`,
    `  upstream: ${plan.upstream_base_url}`,
    `  CNAME:    ${plan.cname_record} → ${plan.cname_target}`,
    plan.txt_record ? `  TXT:      ${plan.txt_record}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDomainResult(domain: Record<string, unknown>): string {
  const lines = [
    domain.verified_at ? "Domain verified" : "Domain",
    `  hostname:  ${domain.hostname}`,
    domain.id ? `  id:        ${domain.id}` : null,
    domain.cname_record ? `  CNAME:     ${domain.cname_record} → ${domain.cname_target}` : null,
    domain.verification_record ? `  verify:    ${domain.verification_record}` : null,
  ].filter(Boolean) as string[];
  if (Array.isArray(domain.instructions) && domain.instructions.length > 0) {
    lines.push("", "  Next steps:");
    for (const step of domain.instructions) lines.push(`    • ${step}`);
  }
  return lines.join("\n");
}

function formatDomainList(domains: Record<string, unknown>[]): string {
  if (domains.length === 0) return "No domains.";
  const lines = [`Domains (${domains.length})`, ""];
  for (const d of domains) {
    const verified = d.verified_at ? "verified" : "pending";
    lines.push(`  ${d.hostname}  ${verified}${d.is_primary ? "  (primary)" : ""}`);
  }
  return lines.join("\n");
}

function formatParsedOpenApi(spec: Record<string, unknown>): string {
  const ops = Array.isArray(spec.operations) ? spec.operations : [];
  const lines = [
    spec.title ? `OpenAPI  ${spec.title}${spec.version ? ` v${spec.version}` : ""}` : "OpenAPI spec",
    spec.suggested_upstream ? `  suggested upstream: ${spec.suggested_upstream}` : null,
    `  operations: ${ops.length}`,
    "",
  ].filter(Boolean) as string[];
  for (const op of ops.slice(0, 20)) {
    if (!isRecord(op)) continue;
    lines.push(`  ${str(op.method).padEnd(7)} ${op.path_pattern ?? op.path}`);
  }
  if (ops.length > 20) lines.push(`  … and ${ops.length - 20} more`);
  return lines.join("\n");
}

function formatOpenApiImport(result: Record<string, unknown>): string {
  const lines = [
    "OpenAPI import",
    `  created: ${result.created ?? 0}`,
    `  skipped: ${result.skipped ?? 0}`,
  ];
  if (Array.isArray(result.endpoints) && result.endpoints.length > 0) {
    lines.push("", "  Endpoints:");
    for (const ep of result.endpoints) {
      if (!isRecord(ep)) continue;
      lines.push(`    ${ep.method} ${ep.path_pattern}`);
    }
  }
  return lines.join("\n");
}

function formatPaymentRequired(pr: unknown): string {
  if (!isRecord(pr)) return formatGeneric(pr);
  const lines = ["Payment required:", ""];
  const accepts = pr.accepts;
  if (Array.isArray(accepts)) {
    accepts.forEach((a, i) => {
      if (!isRecord(a)) return;
      lines.push(`  Option ${i + 1}:`);
      if (a.scheme) lines.push(`    scheme:  ${a.scheme}`);
      if (a.network) lines.push(`    network: ${a.network}`);
      if (a.asset) lines.push(`    asset:   ${shortAddr(str(a.asset))}`);
      if (a.amount != null) lines.push(`    amount:  ${atomicToUsdc(str(a.amount))} USDC`);
      if (a.max_timeout_seconds) lines.push(`    timeout: ${a.max_timeout_seconds}s`);
    });
  }
  if (lines.length === 2) lines.push(...formatRecord(pr, 1, 12));
  return lines.join("\n");
}

function formatInspect(data: Record<string, unknown>): string {
  const lines = [`HTTP ${data.status}  ${data.method} ${data.url}`, ""];
  if (data.status === 402 && data.paymentRequired) {
    lines.push(formatPaymentRequired(data.paymentRequired));
  } else if (data.body != null && data.body !== "") {
    lines.push("Body:");
    lines.push(...formatValue(data.body, 1));
  } else {
    lines.push("(empty body)");
  }
  return lines.join("\n");
}

function formatPayResult(data: Record<string, unknown>): string {
  const lines = [`Response  HTTP ${data.status}`, ""];
  if (data.payment && isRecord(data.payment)) {
    lines.push("Payment:");
    lines.push(...formatRecord(data.payment, 1, 12));
    lines.push("");
  }
  if (data.body != null) {
    lines.push("Body:");
    lines.push(...formatValue(data.body, 1));
  }
  return lines.join("\n");
}

function formatScopeList(scopes: unknown[]): string {
  const lines = ["Available scopes:", ""];
  for (const scope of scopes) {
    lines.push(`  • ${formatScalar(scope)}`);
  }
  return lines.join("\n");
}

function formatUpstreamProbe(data: Record<string, unknown>): string {
  const lines = [`Upstream probe: ${data.ok ? "ok" : "failed"}`, ""];
  if (typeof data.error === "string" && data.error) lines.push(`  error: ${data.error}`, "");
  const results = Array.isArray(data.results) ? data.results : [];
  for (const item of results) {
    if (!isRecord(item)) continue;
    const status = item.status != null ? ` HTTP ${item.status}` : "";
    const mark = item.ok ? "✓" : "✗";
    lines.push(`  ${mark} ${item.method} ${item.path_pattern}${status}`);
    if (item.upstream_url) lines.push(`    ${item.upstream_url}`);
    if (item.error) lines.push(`    ${item.error}`);
  }
  return lines.join("\n");
}

function formatScopePresets(data: Record<string, unknown>): string {
  const lines = ["Scope presets:", ""];
  for (const [name, scopes] of Object.entries(data)) {
    if (!Array.isArray(scopes)) continue;
    lines.push(`  ${name}:`);
    lines.push(`    ${scopes.join(", ")}`);
  }
  return lines.join("\n");
}

function formatSupportedNetworks(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return "No supported networks.";
    const lines = [`Supported networks (${data.length})`, ""];
    for (const n of data) {
      if (typeof n === "string") lines.push(`  • ${n}`);
      else if (isRecord(n)) {
        const label = n.network ?? n.id ?? n.name ?? n.caip2 ?? n.chainId;
        lines.push(`  • ${formatScalar(label)}${n.scheme ? ` (${n.scheme})` : ""}`);
      } else lines.push(`  • ${formatScalar(n)}`);
    }
    return lines.join("\n");
  }
  if (isRecord(data)) {
    if (Array.isArray(data.kinds)) return formatSupportedNetworks(data.kinds);
    if (Array.isArray(data.networks)) return formatSupportedNetworks(data.networks);
    if (Array.isArray(data.schemes)) return formatSupportedNetworks(data.schemes);
    return ["Supported networks:", "", ...formatRecord(data, 1)].join("\n");
  }
  return formatGeneric(data);
}

function formatByCommand(cmd: string, sub: string, data: unknown): string | null {
  const key = `${cmd} ${sub}`;
  if (key === "apis list") return formatApiList(asRecords(data));
  if (key === "apis get" || key === "apis create" || key === "apis update") return isRecord(data) ? formatApi(data) : null;
  if (key === "apis discovery" || key === "discovery urls") return isRecord(data) ? formatDiscoveryURLs(data) : null;
  if (key === "discovery check") {
    return isRecord(data) && typeof data.command === "string"
      ? ["AgentCash discovery check", `  ${data.command}`, typeof data.hint === "string" ? `  ${data.hint}` : ""]
          .filter(Boolean)
          .join("\n")
      : null;
  }
  if (key === "endpoints list") return formatEndpointList(asRecords(data));
  if (key === "endpoints create" || key === "endpoints update") return isRecord(data) ? formatEndpoint(data) : null;
  if (key === "keys list") return formatKeyList(asRecords(data));
  if (key === "keys create") return isRecord(data) ? formatCreatedKey(data) : null;
  if (key === "auth me") return isRecord(data) ? formatUser(data) : null;
  if (key === "stats overview") return isRecord(data) ? formatStats(data) : null;
  if (key === "config platform") return isRecord(data) ? formatPlatform(data) : null;
  if (key === "domains suggest") return isRecord(data) ? formatDomainPlan(data) : null;
  if (key === "domains add" || key === "domains verify") return isRecord(data) ? formatDomainResult(data) : null;
  if (key === "networks supported") return formatSupportedNetworks(data);
  if (key === "apis slug-check") return isRecord(data) ? `Slug ${data.available ? "available" : "taken"}.` : null;
  if (key === "apis probe-upstream") return isRecord(data) ? formatUpstreamProbe(data) : null;
  if (key === "config billing") return isRecord(data) ? formatGeneric(data) : null;
  if (key === "scopes list") return isRecord(data) && Array.isArray(data.scopes) ? formatScopeList(data.scopes) : null;
  if (key === "inspect url" || key === "x402 inspect") return isRecord(data) ? formatInspect(data) : null;
  if (key === "pay url") return isRecord(data) ? formatPayResult(data) : null;
  if (key === "openapi parse") return isRecord(data) ? formatParsedOpenApi(data) : null;
  if (key === "openapi import") return isRecord(data) ? formatOpenApiImport(data) : null;
  return null;
}

export function formatHumanOutput(data: unknown, cmd = "", sub = ""): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);

  const byCmd = formatByCommand(cmd, sub, data);
  if (byCmd) return byCmd;

  if (isRecord(data)) {
    if (data.action === "clear") return "";
    if (data.status === "deleted") return "Deleted.";
    if (data.status === "revoked") return "API key revoked.";
  }

  if (Array.isArray(data)) {
    const records = asRecords(data);
    if (records.length === data.length && records.length > 0) {
      const first = records[0]!;
      if (typeof first.slug === "string" && typeof first.upstream_base_url === "string") return formatApiList(records);
      if (typeof first.path_pattern === "string" && typeof first.method === "string") return formatEndpointList(records);
      if (Array.isArray(first.scopes)) return formatKeyList(records);
      if (typeof first.hostname === "string") return formatDomainList(records);
    }
    return formatGeneric(data);
  }

  if (isRecord(data)) {
    if (typeof data.url === "string" && typeof data.status === "number" && "method" in data) return formatInspect(data);
    if (typeof data.total_requests === "number") return formatStats(data);
    if (typeof data.platform_domain === "string") return formatPlatform(data);
    if (typeof data.gateway_hostname === "string") return formatDomainPlan(data);
    if (typeof data.hostname === "string") return formatDomainResult(data);
    if (Array.isArray(data.operations)) return formatParsedOpenApi(data);
    if (typeof data.created === "number" && Array.isArray(data.endpoints)) return formatOpenApiImport(data);
    if (typeof data.email === "string") return formatUser(data);
    if (typeof data.slug === "string" && typeof data.upstream_base_url === "string") return formatApi(data);
    if (typeof data.path_pattern === "string") return formatEndpoint(data);
    if (Array.isArray(data.scopes)) return data.key ? formatCreatedKey(data) : formatKey(data);
    if ("readonly" in data) return formatScopePresets(data);
    return formatGeneric(data);
  }

  return formatGeneric(data);
}
