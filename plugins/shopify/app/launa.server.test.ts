import { afterEach, describe, expect, it } from "vitest";
import { createLaunaClient, getLaunaConfig } from "./launa.server.js";

describe("launa.server", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("reads config from environment", () => {
    process.env.LAUNA_BASE_URL = "http://custom:9000";
    process.env.SHOPIFY_ENCRYPTION_SECRET = "secret";
    process.env.SHOPIFY_DEV_MODE = "0";
    expect(getLaunaConfig()).toEqual({
      baseUrl: "http://custom:9000",
      encryptionSecret: "secret",
      devMode: false,
    });
  });

  it("creates SDK client", () => {
    const client = createLaunaClient("launa_live_x", "http://api.test");
    expect(client.http).toBeDefined();
  });
});
