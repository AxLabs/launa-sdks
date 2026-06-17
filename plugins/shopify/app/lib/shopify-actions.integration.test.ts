import { describe, expect, it } from "vitest";
import { Ax402Client } from "@axlabs/ax402-sdk";
import { startMockServer } from "../../../../test/fixtures/mock-control-plane.js";
import { loadShopDashboard, monetizeProduct, onboardShop } from "./shopify-actions.js";

describe("shopify-actions integration", () => {
  it("onboards, monetizes, and loads dashboard against mock control plane", async () => {
    const mock = await startMockServer();
    const client = new Ax402Client({ baseUrl: mock.url, apiKey: "ax402_live_test" });

    const onboarded = await onboardShop(client, "demo.myshopify.com");
    expect(onboarded.apiId).toBeTruthy();
    expect(onboarded.gatewayUrl).toContain("localhost");

    // Mock control plane routes use fixture api id "api1"
    const mockApiId = "api1";
    const endpoint = await monetizeProduct(client, mockApiId, {
      productId: "1001",
      priceUsdc: "0.10",
    });
    expect(endpoint.method).toBe("GET");
    expect(endpoint.id).toBeTruthy();

    const dashboard = await loadShopDashboard(client, {
      apiKey: "ax402_live_test",
      apiId: mockApiId,
    });
    expect(dashboard.endpoints.length).toBeGreaterThanOrEqual(1);
    expect(dashboard.gatewayHost).toBeTruthy();

    await mock.close();
  });
});
