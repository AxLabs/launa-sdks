import { describe, expect, it } from "vitest";
import { LaunaClient } from "@axlabs/launa-sdk";
import { startMockServer } from "../../../../test/fixtures/mock-control-plane.js";
import { loadShopDashboard, monetizeProduct, onboardShop } from "./shopify-actions.js";

describe("shopify-actions integration", () => {
  it("onboards, monetizes, and loads dashboard against mock control plane", async () => {
    const mock = await startMockServer();
    const client = new LaunaClient({ baseUrl: mock.url, apiKey: "launa_live_test" });

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
      apiKey: "launa_live_test",
      apiId: mockApiId,
    });
    expect(dashboard.endpoints.length).toBeGreaterThanOrEqual(1);
    expect(dashboard.gatewayHost).toBeTruthy();

    await mock.close();
  });
});
