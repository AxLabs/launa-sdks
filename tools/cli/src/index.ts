#!/usr/bin/env node
import { Ax402Client } from "@ax402/sdk";
import {
  assertSandboxCredentials,
  envRequestsSandbox,
  formatShellError,
  formatShellOutput,
  inspectGatewayUrl,
  jwtRequiredResult,
  parseShellArgv,
  runShellCommand,
  shellCommandNeedsCredentials,
  shellCommandRequiresJwt,
  shellUsageText,
  type ShellCredentialKind,
} from "@ax402/sdk/shell";

function printAndExit(message: string, code: number, json: boolean): never {
  if (json) console.log(message);
  else console.error(message);
  process.exit(code);
}

function usage(msg?: string, json = false): never {
  if (json) {
    printAndExit(
      JSON.stringify(
        { error: msg ?? "command required", code: "usage", help: shellUsageText() },
        null,
        2,
      ),
      2,
      true,
    );
  }
  const text = msg ? `${msg}\n\n${shellUsageText()}` : shellUsageText();
  console.error(text);
  process.exit(2);
}

function resolveSandbox(parsedSandbox: boolean): boolean {
  return parsedSandbox || envRequestsSandbox();
}

function credentialKind(apiKey: string | undefined, token: string | undefined): ShellCredentialKind {
  if (token) return "jwt";
  if (apiKey) return "apiKey";
  return "none";
}

function client(sandbox: boolean, opts: { apiKey?: string; token?: string; preferJwt?: boolean }): Ax402Client {
  const baseUrl = process.env.AX402_BASE_URL ?? "https://api.ax402.io";
  const apiKey = opts.apiKey;
  const token = opts.token;
  if (!apiKey && !token) usage("AX402_API_KEY or AX402_JWT required");
  const credErr = assertSandboxCredentials(apiKey, sandbox);
  if (credErr) usage(credErr);
  if (opts.preferJwt && token) {
    return new Ax402Client({
      baseUrl,
      token,
      environment: sandbox ? "development" : undefined,
    });
  }
  return new Ax402Client({
    baseUrl,
    apiKey,
    token,
    environment: sandbox ? "development" : undefined,
  });
}

async function main() {
  const parsed = parseShellArgv(process.argv.slice(2));
  const json = parsed.json;
  const sandbox = resolveSandbox(parsed.sandbox);
  const baseUrl = process.env.AX402_BASE_URL ?? "https://api.ax402.io";
  const apiKey = process.env.AX402_API_KEY;
  const token = process.env.AX402_JWT;

  if (!parsed.cmd && parsed.flags["--help"] !== "true") {
    usage(undefined, json);
  }

  const jwtOnly = Boolean(parsed.cmd) && Boolean(parsed.sub) && shellCommandRequiresJwt(parsed.cmd, parsed.sub);
  if (jwtOnly && !token) {
    const result = jwtRequiredResult(parsed.cmd, parsed.sub);
    const msg = formatShellError(result, json);
    if (json) console.log(msg);
    else {
      console.error(result.error);
      if (result.hint) console.error(result.hint);
    }
    process.exit(1);
  }

  const needsCreds = shellCommandNeedsCredentials(parsed);
  const c = needsCreds
    ? client(sandbox, { apiKey, token, preferJwt: jwtOnly })
    : new Ax402Client({ baseUrl, environment: sandbox ? "development" : undefined });

  const result = await runShellCommand(parsed, {
    client: c,
    baseUrl,
    sandbox,
    credentialKind: credentialKind(apiKey, token),
    readFile: async (path) => {
      const fs = await import("node:fs/promises");
      return fs.readFile(path, "utf8");
    },
    runInspectUrl: inspectGatewayUrl,
    runPayUrl: async (url, method) => {
      const { buyerClientFromEnv, BuyerDepsError } = await import("@ax402/sdk/buyer");
      let buyer;
      try {
        buyer = await buyerClientFromEnv();
      } catch (err) {
        if (err instanceof BuyerDepsError) usage(err.message, json);
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
    else console.error(msg);
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
