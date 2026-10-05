#!/usr/bin/env node
import { LaunaClient } from "@launa/sdk";
import {
  assertSandboxCredentials,
  envRequestsSandbox,
  formatShellError,
  formatShellOutput,
  inspectGatewayUrl,
  parseShellArgv,
  runShellCommand,
  shellCommandNeedsCredentials,
  shellUsageText,
} from "@launa/sdk/shell";

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error(shellUsageText());
  process.exit(2);
}

function resolveSandbox(parsedSandbox: boolean): boolean {
  return parsedSandbox || envRequestsSandbox();
}

function client(sandbox: boolean): LaunaClient {
  const baseUrl = process.env.LAUNA_BASE_URL ?? "https://api.launa.io";
  const apiKey = process.env.LAUNA_API_KEY;
  const token = process.env.LAUNA_JWT;
  if (!apiKey && !token) usage("LAUNA_API_KEY or LAUNA_JWT required");
  const credErr = assertSandboxCredentials(apiKey, sandbox);
  if (credErr) usage(credErr);
  return new LaunaClient({
    baseUrl,
    apiKey,
    token,
    environment: sandbox ? "development" : undefined,
  });
}

async function main() {
  const parsed = parseShellArgv(process.argv.slice(2));
  if (!parsed.cmd) usage();

  const json = parsed.json;
  const sandbox = resolveSandbox(parsed.sandbox);
  const baseUrl = process.env.LAUNA_BASE_URL ?? "https://api.launa.io";

  if (
    (parsed.cmd === "sandbox-wallet" || parsed.cmd === "sandbox_wallet") &&
    !process.env.LAUNA_JWT
  ) {
    usage("sandbox-wallet requires LAUNA_JWT (session token from auth login)");
  }

  const c = shellCommandNeedsCredentials(parsed)
    ? client(sandbox)
    : new LaunaClient({ baseUrl, environment: sandbox ? "development" : undefined });

  const result = await runShellCommand(parsed, {
    client: c,
    baseUrl,
    sandbox,
    readFile: async (path) => {
      const fs = await import("node:fs/promises");
      return fs.readFile(path, "utf8");
    },
    runInspectUrl: inspectGatewayUrl,
    runPayUrl: async (url, method) => {
      const { buyerClientFromEnv, BuyerDepsError } = await import("@launa/sdk/buyer");
      let buyer;
      try {
        buyer = await buyerClientFromEnv();
      } catch (err) {
        if (err instanceof BuyerDepsError) usage(err.message);
        throw err;
      }
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
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
