import { describe, expect, it } from "vitest";
import { Ax402Client } from "./client.js";
import { Ax402Error } from "./http.js";
import { startMockServer } from "../../test/fixtures/mock-control-plane.js";

describe("Ax402Client integration", () => {
  it("calls all resource methods against mock server", async () => {
    const mock = await startMockServer();
    const client = new Ax402Client({
      baseUrl: mock.url,
      apiKey: "test",
    });

    await client.auth.signup("a@b.com", "password1");
    await client.auth.login("a@b.com", "password1");
    await client.auth.logout();
    await client.auth.verifyEmail("tok");
    expect(await client.auth.me()).toMatchObject({ email: "test@example.com" });
    await client.auth.resendVerification();
    await client.auth.forgotPassword("a@b.com");
    await client.auth.resetPassword("tok", "password2");
    await client.auth.changePassword("old", "newpass12");
    await client.auth.completeOnboarding();
    expect(await client.keys.listScopes()).toHaveProperty("scopes");
    expect(await client.keys.list()).toHaveLength(1);
    await client.keys.create({ name: "ci", scopes: ["apis:read"] });
    await client.keys.revoke("key1");
    expect(await client.config.platform()).toHaveProperty("platform_domain");
    expect(await client.domains.suggest("example.com")).toHaveProperty("gateway_hostname");
    await client.auth.supportedNetworks();
    expect(await client.stats.overview(30)).toMatchObject({
      total_requests: 10,
      display_currency: "usd",
      total_earnings_fiat: "2.50",
    });
    expect(await client.exchangeRates.supported()).toMatchObject({ default: "usd" });
    expect(await client.exchangeRates.list()).toMatchObject({ quote: "usd" });
    await client.openapi.parseSpec("openapi: 3");
    expect(await client.apis.list()).toHaveLength(1);
    await client.apis.create({ name: "n", slug: "s", upstream_base_url: "https://x.com" });
    await client.apis.create({
      name: "n2",
      slug: "s2",
      upstream_base_url: "https://x.com",
      discovery_guidance: "Use GET /v1/*.",
      discovery_contact_email: "seller@example.com",
      openapi_version: "1.0.0",
      pay_to_addresses: { "hedera:testnet": "0.0.1234" },
    });
    expect(await client.apis.get("api1")).toMatchObject({
      pay_to_addresses: { "hedera:testnet": "0.0.1234" },
    });
    expect(await client.apis.discovery("api1")).toMatchObject({
      openapi_url: expect.stringContaining("/openapi.json"),
      well_known_url: expect.stringContaining("/.well-known/x402.json"),
    });
    await client.apis.update("api1", { name: "n" });
    expect(await client.apis.getCors("api1")).toMatchObject({ origins: ["http://localhost:5173"] });
    await client.apis.putCors("api1", ["http://localhost:5173"]);
    await client.apis.addCorsOrigin("api1", "http://localhost:3000");
    await client.apis.removeCorsOrigin("api1", "http://localhost:3000");
    await client.apis.delete("api1");
    expect(await client.endpoints.list("api1")).toHaveLength(1);
    await client.endpoints.create("api1", {
      method: "GET",
      path_pattern: "/v1/*",
      accepts: [],
    });
    await client.endpoints.update("api1", "ep1", { enabled: true });
    await client.endpoints.delete("api1", "ep1");
    await client.openapi.import("api1", { operations: [], accepts: [] });
    await client.domains.list("api1");
    await client.domains.add("api1", "api.example.com");
    await client.domains.verify("api1", "dom1");
    await client.domains.delete("api1", "dom1");
    await client.stats.forApi("api1");
    await client.exchangeRates.supported();
    await client.settlements.list("api1");
    await client.settlements.listBatch("api1");
    expect(await client.apis.listWebhookDeliveries("api1")).toEqual([]);
    await client.apis.create({
      name: "n",
      slug: "s2",
      upstream_base_url: "https://x.com",
      webhook_url: "https://app.example/hooks",
      webhook_secret: "whsec_test",
    });

    expect(await client.auth.notificationPreferences()).toMatchObject({ billing_alerts: true });
    await client.auth.updateNotificationPreferences({ weekly_summary: true });
    expect(await client.sandboxWallet.get()).toHaveProperty("address");
    await client.sandboxWallet.reset();
    expect(await client.config.localDev()).toMatchObject({ enabled: true });
    expect(await client.config.devBalances("0x00000000000000000000000000000000000000aa")).toMatchObject({
      eth_wei: expect.any(String),
      usdc_base: expect.any(String),
    });
    expect(await client.config.devFaucet("0x00000000000000000000000000000000000000aa")).toMatchObject({
      status: "ok",
    });
    expect(await client.billing.overview()).toMatchObject({ model: "free" });
    await client.billing.setModel("payg");
    expect(await client.income.summary()).toMatchObject({ income_enabled: true });
    expect(await client.income.payoutRequests()).toHaveLength(1);
    await client.income.createPayoutRequest({
      network: "eip155:84532",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      amount_atomic: 1000000,
      destination_address: "0x0000000000000000000000000000000000000001",
    });
    await client.income.cancelPayoutRequest("payout1");
    await client.auth.deleteAccount("password1", "a@b.com");

    await mock.close();
  });

  it("throws Ax402Error on 401", async () => {
    const mock = await startMockServer();
    const client = new Ax402Client({ baseUrl: mock.url });
    await expect(client.auth.me()).rejects.toBeInstanceOf(Ax402Error);
    await mock.close();
  });
});

describe("Ax402Error", () => {
  it("carries status", () => {
    const err = new Ax402Error(409, "duplicate");
    expect(err.status).toBe(409);
    expect(err.message).toBe("duplicate");
  });
});
