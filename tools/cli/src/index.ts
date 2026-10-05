#!/usr/bin/env node
import { LaunaClient } from "@axlabs/ax402-sdk";
import {
  formatShellError,
  formatShellOutput,
  inspectGatewayUrl,
  parseShellArgv,
  runShellCommand,
  shellCommandNeedsCredentials,
  shellUsageText,
} from "@axlabs/ax402-sdk/shell";

const json = process.argv.includes("--json");
const args = process.argv.slice(2).filter((a) => a !== "--json");

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error(shellUsageText());
  process.exit(2);
}

function client(): LaunaClient {
  const baseUrl = process.env.LAUNA_BASE_URL ?? "https://api.launa.io";
  const apiKey = process.env.LAUNA_API_KEY;
  const token = process.env.LAUNA_JWT;
  if (!apiKey && !token) usage("LAUNA_API_KEY or LAUNA_JWT required");
  return new LaunaClient({ baseUrl, apiKey, token });
}

async function main() {
  const parsed = parseShellArgv(args);
  if (!parsed.cmd) usage();

  const baseUrl = process.env.LAUNA_BASE_URL ?? "https://api.launa.io";
  const c = shellCommandNeedsCredentials(parsed)
    ? client()
    : new LaunaClient({ baseUrl });

  const result = await runShellCommand(parsed, {
    client: c,
    baseUrl,
    readFile: async (path) => {
      const fs = await import("node:fs/promises");
      return fs.readFile(path, "utf8");
    },
    runInspectUrl: inspectGatewayUrl,
    runPayUrl: async (url, method) => {
      const pk = process.env.LAUNA_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
      if (!pk) usage("LAUNA_EVM_PRIVATE_KEY required for pay url");
      const { buyerClientFromPrivateKey } = await import("@axlabs/ax402-sdk/buyer");
      const buyer = await buyerClientFromPrivateKey(pk);
      const payResult = await buyer.pay({ url, method });
      const body = await payResult.response.text();
      let parsedBody: unknown = body;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        /* plain text */
      }
      return { status: payResult.response.status, body: parsedBody, payment: payResult.payment };
    },
  });

  if (!result.ok) {
    const msg = formatShellError(result, json);
    if (json) console.log(msg);
    else console.error(msg.split("\n")[0]);
    process.exit(result.kind === "usage" ? 2 : 1);
  }

  if (parsed.cmd === "auth" && parsed.sub === "login" && !json && typeof result.data === "object" && result.data && "token" in result.data) {
    console.log((result.data as { token: string }).token);
    return;
  }

  console.log(formatShellOutput(result.data, json, parsed.cmd, parsed.sub));
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
