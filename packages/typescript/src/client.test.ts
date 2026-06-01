import { describe, expect, it } from "vitest";
import { Ax402Client } from "./client.js";
import { Ax402Error } from "./http.js";
import { startMockServer } from "../../test/fixtures/mock-control-plane.js";

describe("Ax402Client integration", () => {
  it("calls all resource methods against mock server", async () => {
    const mock = await startMockServer();
    const client = new Ax402Client({
      baseUrl: mock.url,
      apiKey: "ax402_live_test",
    });

    await client.auth.signup("a@b.com", "password1");
    await client.auth.login("a@b.com", "password1");
    await client.auth.logout();
    await client.auth.verifyEmail("tok");
    expect(await client.auth.me()).toMatchObject({ email: "test@example.com" });
    await client.auth.resendVerification();
    await client.auth.changePassword("old", "newpass12");
    await client.auth.completeOnboarding();
    expect(await client.keys.listScopes()).toHaveProperty("scopes");
    expect(await client.keys.list()).toHaveLength(1);
    await client.keys.create({ name: "ci", scopes: ["apis:read"] });
    await client.keys.revoke("key1");
    expect(await client.config.platform()).toHaveProperty("platform_domain");
    expect(await client.domains.suggest("example.com")).toHaveProperty("gateway_hostname");
    await client.auth.supportedNetworks();
    expect(await client.stats.overview(30)).toHaveProperty("total_requests");
    await client.openapi.parseSpec("openapi: 3");
    expect(await client.apis.list()).toHaveLength(1);
    await client.apis.create({ name: "n", slug: "s", upstream_base_url: "https://x.com" });
    await client.apis.get("api1");
    await client.apis.update("api1", { name: "n" });
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
    await client.stats.forApi("api1");
    await client.settlements.list("api1");
    await client.settlements.listBatch("api1");

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
