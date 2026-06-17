import { afterEach, describe, expect, it } from "vitest";
import { createAx402Client, getAx402Config } from "./ax402.server.js";

describe("ax402.server", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("reads config from environment", () => {
    process.env.AX402_BASE_URL = "http://custom:9000";
    process.env.SHOPIFY_ENCRYPTION_SECRET = "secret";
    process.env.SHOPIFY_DEV_MODE = "0";
    expect(getAx402Config()).toEqual({
      baseUrl: "http://custom:9000",
      encryptionSecret: "secret",
      devMode: false,
    });
  });

  it("creates SDK client", () => {
    const client = createAx402Client("ax402_live_x", "http://api.test");
    expect(client.http).toBeDefined();
  });
});
