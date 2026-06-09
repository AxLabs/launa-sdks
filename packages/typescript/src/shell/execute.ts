import { Ax402Client } from "../client.js";
import { SCOPE_PRESETS } from "../scopes.js";
import { buildUsdcAccept, usdcToAtomic } from "../platform/helpers.js";
import { flag } from "./parse.js";
import { shellUsageText } from "./registry.js";
import { shellErrorFromUnknown } from "./format.js";
import type { ParsedShellCommand, ShellExecuteContext, ShellResult } from "./types.js";

function usage(msg: string): ShellResult {
  return { ok: false, kind: "usage", error: msg ? `${msg}\n\n${shellUsageText()}` : shellUsageText() };
}

async function readSpec(
  parsed: ParsedShellCommand,
  ctx: ShellExecuteContext,
): Promise<string | ShellResult> {
  const spec = flag(parsed, "--spec");
  if (spec) return spec;
  const file = flag(parsed, "--file");
  if (file) {
    if (!ctx.readFile) {
      return { ok: false, error: "--file is not supported in this environment; use --spec with pasted content" };
    }
    return ctx.readFile(file);
  }
  return { ok: false, error: "--spec or --file required" };
}

export async function runShellCommand(
  parsed: ParsedShellCommand,
  ctx: ShellExecuteContext,
): Promise<ShellResult> {
  const { cmd, sub } = parsed;
  const c = ctx.client;

  try {
    if (cmd === "help") {
      return { ok: true, data: shellUsageText() };
    }
    if (cmd === "clear") {
      return { ok: true, data: { action: "clear" } };
    }
    if (!cmd) {
      return usage("command required");
    }

    if (cmd === "apis" && sub === "list") {
      return { ok: true, data: await c.apis.list() };
    }
    if (cmd === "apis" && sub === "create") {
      const name = flag(parsed, "--name");
      const slug = flag(parsed, "--slug");
      const upstream = flag(parsed, "--upstream");
      if (!name || !slug || !upstream) return usage("--name, --slug, --upstream required");
      const payTo = flag(parsed, "--pay-to");
      return {
        ok: true,
        data: await c.apis.create({
          name,
          slug,
          upstream_base_url: upstream,
          pay_to_mode: payTo ? "user_wallet" : undefined,
          pay_to_address: payTo,
        }),
      };
    }
    if (cmd === "apis" && sub === "get") {
      const id = flag(parsed, "--id");
      if (!id) return usage("--id required");
      return { ok: true, data: await c.apis.get(id) };
    }
    if (cmd === "apis" && sub === "delete") {
      const id = flag(parsed, "--id");
      if (!id) return usage("--id required");
      await c.apis.delete(id);
      return { ok: true, data: { status: "deleted" } };
    }

    if (cmd === "endpoints" && sub === "list") {
      const apiId = flag(parsed, "--api-id");
      if (!apiId) return usage("--api-id required");
      return { ok: true, data: await c.endpoints.list(apiId) };
    }
    if (cmd === "endpoints" && sub === "create") {
      const apiId = flag(parsed, "--api-id");
      const method = flag(parsed, "--method") ?? "GET";
      const path = flag(parsed, "--path");
      const price = flag(parsed, "--price-usdc") ?? "0.10";
      if (!apiId || !path) return usage("--api-id and --path required");
      const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
      return { ok: true, data: await c.endpoints.create(apiId, { method, path_pattern: path, accepts }) };
    }
    if (cmd === "endpoints" && sub === "update") {
      const apiId = flag(parsed, "--api-id");
      const endpointId = flag(parsed, "--endpoint-id");
      const enabled = flag(parsed, "--enabled");
      if (!apiId || !endpointId) return usage("--api-id and --endpoint-id required");
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled === "true";
      return { ok: true, data: await c.endpoints.update(apiId, endpointId, body) };
    }
    if (cmd === "endpoints" && sub === "delete") {
      const apiId = flag(parsed, "--api-id");
      const endpointId = flag(parsed, "--endpoint-id");
      if (!apiId || !endpointId) return usage("--api-id and --endpoint-id required");
      await c.endpoints.delete(apiId, endpointId);
      return { ok: true, data: { status: "deleted" } };
    }

    if (cmd === "domains" && sub === "suggest") {
      const apex = flag(parsed, "--apex");
      if (!apex) return usage("--apex required");
      return { ok: true, data: await c.domains.suggest(apex, flag(parsed, "--prefix") ?? "x402") };
    }
    if (cmd === "domains" && sub === "add") {
      const apiId = flag(parsed, "--api-id");
      const hostname = flag(parsed, "--hostname");
      if (!apiId || !hostname) return usage("--api-id and --hostname required");
      return { ok: true, data: await c.domains.add(apiId, hostname) };
    }
    if (cmd === "domains" && sub === "verify") {
      const apiId = flag(parsed, "--api-id");
      const domainId = flag(parsed, "--domain-id");
      if (!apiId || !domainId) return usage("--api-id and --domain-id required");
      return { ok: true, data: await c.domains.verify(apiId, domainId) };
    }

    if (cmd === "keys" && sub === "list") {
      return { ok: true, data: await c.keys.list() };
    }
    if (cmd === "keys" && sub === "create") {
      const name = flag(parsed, "--name");
      const scopes = flag(parsed, "--scopes");
      if (!name || !scopes) return usage("--name and --scopes required");
      return { ok: true, data: await c.keys.create({ name, scopes: scopes.split(",") }) };
    }
    if (cmd === "keys" && sub === "revoke") {
      const id = flag(parsed, "--id");
      if (!id) return usage("--id required");
      await c.keys.revoke(id);
      return { ok: true, data: { status: "revoked" } };
    }

    if (cmd === "auth" && sub === "me") {
      return { ok: true, data: await c.auth.me() };
    }
    if (cmd === "auth" && sub === "login") {
      const email = flag(parsed, "--email");
      const password = flag(parsed, "--password");
      if (!email || !password) return usage("--email and --password required");
      const baseUrl = ctx.baseUrl ?? "http://api.localhost:8090";
      const guest = new Ax402Client({ baseUrl });
      return { ok: true, data: await guest.auth.login(email, password) };
    }

    if ((cmd === "inspect" && sub === "url") || (cmd === "x402" && sub === "inspect")) {
      const url = flag(parsed, "--url");
      const method = flag(parsed, "--method") ?? "GET";
      if (!url) return usage("--url required");
      if (!ctx.runInspectUrl) {
        return { ok: false, error: "inspect url is not available in this environment" };
      }
      return { ok: true, data: await ctx.runInspectUrl(url, method) };
    }
    if (cmd === "pay" && sub === "url") {
      const url = flag(parsed, "--url");
      const method = flag(parsed, "--method") ?? "GET";
      if (!url) return usage("--url required");
      if (!ctx.runPayUrl) {
        return { ok: false, error: "pay url is not available in this environment" };
      }
      return { ok: true, data: await ctx.runPayUrl(url, method) };
    }

    if (cmd === "openapi" && sub === "parse") {
      const specResult = await readSpec(parsed, ctx);
      if (typeof specResult !== "string") return specResult;
      return { ok: true, data: await c.openapi.parseSpec(specResult) };
    }
    if (cmd === "openapi" && sub === "import") {
      const apiId = flag(parsed, "--api-id");
      const price = flag(parsed, "--price-usdc") ?? "0.10";
      if (!apiId) return usage("--api-id required");
      const specResult = await readSpec(parsed, ctx);
      if (typeof specResult !== "string") return specResult;
      const parsedSpec = await c.openapi.parseSpec(specResult);
      const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
      const operations = parsedSpec.operations.map((op) => ({
        method: op.method,
        path_pattern: op.path_pattern,
        description: op.summary ?? op.description,
      }));
      return { ok: true, data: await c.openapi.import(apiId, { operations, accepts }) };
    }

    if (cmd === "stats" && sub === "overview") {
      const days = parseInt(flag(parsed, "--days") ?? "30", 10);
      return { ok: true, data: await c.stats.overview(days) };
    }
    if (cmd === "config" && sub === "platform") {
      return { ok: true, data: await c.config.platform() };
    }
    if (cmd === "networks" && sub === "supported") {
      return { ok: true, data: await c.auth.supportedNetworks() };
    }
    if (cmd === "scopes" && sub === "presets") {
      return { ok: true, data: SCOPE_PRESETS };
    }

    return usage(`unknown command: ${cmd} ${sub}`);
  } catch (err) {
    return shellErrorFromUnknown(err);
  }
}
