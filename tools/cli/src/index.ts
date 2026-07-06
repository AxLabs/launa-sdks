#!/usr/bin/env node
import { Ax402Client } from "@axlabs/ax402-sdk";
import {
  formatShellError,
  formatShellOutput,
  inspectGatewayUrl,
  parseShellArgv,
  runShellCommand,
  shellUsageText,
} from "@axlabs/ax402-sdk/shell";

const json = process.argv.includes("--json");
const args = process.argv.slice(2).filter((a) => a !== "--json");

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error(shellUsageText());
  process.exit(2);
}

function client(): Ax402Client {
  const baseUrl = process.env.AX402_BASE_URL ?? "https://api.ax402.io";
  const apiKey = process.env.AX402_API_KEY;
  const token = process.env.AX402_JWT;
  if (!apiKey && !token) usage("AX402_API_KEY or AX402_JWT required");
  return new Ax402Client({ baseUrl, apiKey, token });
}

async function main() {
  const parsed = parseShellArgv(args);
  if (!parsed.cmd) usage();

  const c = client();
  const baseUrl = process.env.AX402_BASE_URL ?? "https://api.ax402.io";

  const result = await runShellCommand(parsed, {
    client: c,
    baseUrl,
    readFile: async (path) => {
      const fs = await import("node:fs/promises");
      return fs.readFile(path, "utf8");
    },
    runInspectUrl: inspectGatewayUrl,
    runPayUrl: async (url, method) => {
      const pk = process.env.AX402_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
      if (!pk) usage("AX402_EVM_PRIVATE_KEY required for pay url");
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
