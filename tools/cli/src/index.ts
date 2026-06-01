#!/usr/bin/env node
import { Ax402Error, Ax402Client, SCOPE_PRESETS, buildUsdcAccept, usdcToAtomic } from "@axlabs/ax402-sdk";

const json = process.argv.includes("--json");
const args = process.argv.slice(2).filter((a) => a !== "--json");

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error(`Usage: ax402 [--json] <command> [options]

Commands:
  apis list
  apis create --name NAME --slug SLUG --upstream URL [--pay-to 0x...]
  apis get --id ID
  apis delete --id ID
  endpoints list --api-id ID
  endpoints create --api-id ID --method GET --path "/v1/*" --price-usdc 0.10
  endpoints update --api-id ID --endpoint-id ID [--enabled true|false]
  endpoints delete --api-id ID --endpoint-id ID
  domains suggest --apex example.com [--prefix x402]
  domains add --api-id ID --hostname HOST
  domains verify --api-id ID --domain-id ID
  keys list
  keys create --name NAME --scopes apis:read,apis:write
  keys revoke --id ID
  auth login --email EMAIL --password PASS
  openapi parse --file PATH
  openapi import --api-id ID --file PATH --price-usdc 0.10
  stats overview [--days 30]
  config platform
  networks supported
  pay url --url GATEWAY_URL [--method GET] (requires AX402_EVM_PRIVATE_KEY)

Env: AX402_BASE_URL, AX402_API_KEY or AX402_JWT, AX402_EVM_PRIVATE_KEY (buyer)`);
  process.exit(2);
}

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function out(data: unknown) {
  if (json) console.log(JSON.stringify(data, null, 2));
  else console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function fail(err: unknown): never {
  const msg = err instanceof Ax402Error ? `${err.status}: ${err.message}` : String(err);
  if (json) console.log(JSON.stringify({ error: msg }));
  else console.error(msg);
  process.exit(1);
}

function client(): Ax402Client {
  const baseUrl = process.env.AX402_BASE_URL ?? "http://api.localhost:8090";
  const apiKey = process.env.AX402_API_KEY;
  const token = process.env.AX402_JWT;
  if (!apiKey && !token) usage("AX402_API_KEY or AX402_JWT required");
  return new Ax402Client({
    baseUrl,
    apiKey,
    token,
  });
}

async function main() {
  const cmd = args[0];
  const sub = args[1];
  const c = client();

  try {
    if (cmd === "apis" && sub === "list") {
      out(await c.apis.list());
      return;
    }
    if (cmd === "apis" && sub === "create") {
      const name = flag("--name");
      const slug = flag("--slug");
      const upstream = flag("--upstream");
      if (!name || !slug || !upstream) usage("--name, --slug, --upstream required");
      const payTo = flag("--pay-to");
      out(
        await c.apis.create({
          name,
          slug,
          upstream_base_url: upstream,
          pay_to_mode: payTo ? "user_wallet" : undefined,
          pay_to_address: payTo,
        }),
      );
      return;
    }
    if (cmd === "apis" && sub === "get") {
      const id = flag("--id");
      if (!id) usage("--id required");
      out(await c.apis.get(id));
      return;
    }
    if (cmd === "apis" && sub === "delete") {
      const id = flag("--id");
      if (!id) usage("--id required");
      await c.apis.delete(id);
      out({ status: "deleted" });
      return;
    }
    if (cmd === "endpoints" && sub === "list") {
      const apiId = flag("--api-id");
      if (!apiId) usage("--api-id required");
      out(await c.endpoints.list(apiId));
      return;
    }
    if (cmd === "endpoints" && sub === "create") {
      const apiId = flag("--api-id");
      const method = flag("--method") ?? "GET";
      const path = flag("--path");
      const price = flag("--price-usdc") ?? "0.10";
      if (!apiId || !path) usage("--api-id and --path required");
      const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
      out(await c.endpoints.create(apiId, { method, path_pattern: path, accepts }));
      return;
    }
    if (cmd === "endpoints" && sub === "update") {
      const apiId = flag("--api-id");
      const endpointId = flag("--endpoint-id");
      const enabled = flag("--enabled");
      if (!apiId || !endpointId) usage("--api-id and --endpoint-id required");
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled === "true";
      out(await c.endpoints.update(apiId, endpointId, body));
      return;
    }
    if (cmd === "endpoints" && sub === "delete") {
      const apiId = flag("--api-id");
      const endpointId = flag("--endpoint-id");
      if (!apiId || !endpointId) usage("--api-id and --endpoint-id required");
      await c.endpoints.delete(apiId, endpointId);
      out({ status: "deleted" });
      return;
    }
    if (cmd === "domains" && sub === "suggest") {
      const apex = flag("--apex");
      if (!apex) usage("--apex required");
      out(await c.domains.suggest(apex, flag("--prefix") ?? "x402"));
      return;
    }
    if (cmd === "domains" && sub === "add") {
      const apiId = flag("--api-id");
      const hostname = flag("--hostname");
      if (!apiId || !hostname) usage("--api-id and --hostname required");
      out(await c.domains.add(apiId, hostname));
      return;
    }
    if (cmd === "domains" && sub === "verify") {
      const apiId = flag("--api-id");
      const domainId = flag("--domain-id");
      if (!apiId || !domainId) usage("--api-id and --domain-id required");
      out(await c.domains.verify(apiId, domainId));
      return;
    }
    if (cmd === "keys" && sub === "list") {
      out(await c.keys.list());
      return;
    }
    if (cmd === "keys" && sub === "create") {
      const name = flag("--name");
      const scopes = flag("--scopes");
      if (!name || !scopes) usage("--name and --scopes required");
      out(await c.keys.create({ name, scopes: scopes.split(",") }));
      return;
    }
    if (cmd === "keys" && sub === "revoke") {
      const id = flag("--id");
      if (!id) usage("--id required");
      out(await c.keys.revoke(id));
      return;
    }
    if (cmd === "auth" && sub === "login") {
      const email = flag("--email");
      const password = flag("--password");
      if (!email || !password) usage("--email and --password required");
      const baseUrl = process.env.AX402_BASE_URL ?? "http://api.localhost:8090";
      const guest = new Ax402Client({ baseUrl });
      const res = await guest.auth.login(email, password);
      if (json) out(res);
      else console.log(res.token);
      return;
    }
    if (cmd === "pay" && sub === "url") {
      const url = flag("--url");
      const method = flag("--method") ?? "GET";
      if (!url) usage("--url required");
      const pk = process.env.AX402_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
      if (!pk) usage("AX402_EVM_PRIVATE_KEY required for pay url");
      const { buyerClientFromPrivateKey } = await import("@axlabs/ax402-sdk/buyer");
      const buyer = await buyerClientFromPrivateKey(pk);
      const result = await buyer.pay({ url, method });
      const body = await result.response.text();
      let parsed: unknown = body;
      try {
        parsed = JSON.parse(body);
      } catch {
        /* plain text */
      }
      out({
        status: result.response.status,
        body: parsed,
        payment: result.payment,
      });
      return;
    }
    if (cmd === "openapi" && sub === "parse") {
      const file = flag("--file");
      if (!file) usage("--file required");
      const fs = await import("node:fs/promises");
      const spec = await fs.readFile(file, "utf8");
      out(await c.openapi.parseSpec(spec));
      return;
    }
    if (cmd === "openapi" && sub === "import") {
      const apiId = flag("--api-id");
      const file = flag("--file");
      const price = flag("--price-usdc") ?? "0.10";
      if (!apiId || !file) usage("--api-id and --file required");
      const fs = await import("node:fs/promises");
      const spec = await fs.readFile(file, "utf8");
      const parsed = await c.openapi.parseSpec(spec);
      const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
      const operations = parsed.operations.map((op) => ({
        method: op.method,
        path_pattern: op.path_pattern,
        description: op.summary ?? op.description,
      }));
      out(await c.openapi.import(apiId, { operations, accepts }));
      return;
    }
    if (cmd === "stats" && sub === "overview") {
      const days = parseInt(flag("--days") ?? "30", 10);
      out(await c.stats.overview(days));
      return;
    }
    if (cmd === "config" && sub === "platform") {
      out(await c.config.platform());
      return;
    }
    if (cmd === "networks" && sub === "supported") {
      out(await c.auth.supportedNetworks());
      return;
    }
    if (cmd === "scopes" && sub === "presets") {
      out(SCOPE_PRESETS);
      return;
    }
    usage(`unknown command: ${cmd} ${sub ?? ""}`);
  } catch (err) {
    fail(err);
  }
}

main();
