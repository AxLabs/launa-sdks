#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LaunaClient } from "@launaio/sdk";
import {
  assertSandboxCredentials,
  envRequestsSandbox,
} from "@launaio/sdk/shell";
import { createMcpServer } from "./server.js";
import { createToolHandlers } from "./tools.js";

function client(): LaunaClient {
  const baseUrl = process.env.LAUNA_BASE_URL ?? "https://api.launa.io";
  const apiKey = process.env.LAUNA_API_KEY;
  if (!apiKey) throw new Error("LAUNA_API_KEY required");
  const sandbox = envRequestsSandbox();
  const credErr = assertSandboxCredentials(apiKey, sandbox);
  if (credErr) throw new Error(credErr);
  return new LaunaClient({
    baseUrl,
    apiKey,
    environment: sandbox ? "development" : undefined,
  });
}

const server = createMcpServer(createToolHandlers(client));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
