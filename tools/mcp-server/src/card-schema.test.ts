import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect, it, vi } from "vitest";
import { createMcpServer } from "./server.js";
import type { ToolHandlers } from "./tools.js";

it("accepts card-only MPP configuration at the actual MCP schema boundary", async () => {
  const addEndpoint = vi.fn(async (_id, input) => input);
  const server = createMcpServer({ addEndpoint } as unknown as ToolHandlers);
  const client = new Client({ name: "schema-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const card = { enabled: true, currency: "usd", amount_minor: "100", mpp: { enabled: true, buyer_auth: "none" } };
    const input = { api_id: "api-1", method: "GET", path_pattern: "/data", accepts: [], card_payment: card };
    const result = await client.callTool({ name: "launa_add_endpoint", arguments: input });
    expect(result.isError).not.toBe(true);
    expect(addEndpoint).toHaveBeenCalledWith("api-1", expect.objectContaining({ accepts: [], card_payment: card }));
    const invalid = await client.callTool({ name: "launa_add_endpoint", arguments: { ...input,
      card_payment: { ...card, mpp: { enabled: true, buyer_auth: "upstream-only" } } } });
    expect(invalid.isError).toBe(true);
    expect(addEndpoint).toHaveBeenCalledTimes(1);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
});
