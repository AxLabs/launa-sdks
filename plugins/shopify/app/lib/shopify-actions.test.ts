import { describe, expect, it, vi } from "vitest";
import { LaunaClient } from "@axlabs/launa-sdk";
import { monetizeProduct, onboardShop } from "./shopify-actions.js";

describe("shopify-actions", () => {
  it("onboardShop uses setupApiWithDefaultDomain", async () => {
    const client = {
      config: { platform: vi.fn().mockResolvedValue({ platform_domain: "localhost", gateway_port: 8090 }) },
      apis: {
        create: vi.fn().mockResolvedValue({
          id: "api1",
          name: "demo.myshopify.com",
          slug: "demo-myshopify-com",
          domains: [{ hostname: "demo-myshopify-com.localhost", is_primary: true }],
        }),
      },
    } as unknown as LaunaClient;

    const result = await onboardShop(client, "demo.myshopify.com");
    expect(result.apiId).toBe("api1");
    expect(result.gatewayHost).toContain("demo-myshopify-com");
    expect(client.apis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        upstream_base_url: "https://demo.myshopify.com",
      }),
    );
  });

  it("monetizeProduct creates endpoint with path and accept", async () => {
    const create = vi.fn().mockResolvedValue({ id: "ep1", path_pattern: "/products/9.json" });
    const client = { endpoints: { create } } as unknown as LaunaClient;

    await monetizeProduct(client, "api1", {
      productId: "9",
      priceUsdc: "0.25",
      pathKind: "storefront-product",
      scheme: "exact",
    });

    expect(create).toHaveBeenCalledWith("api1", {
      method: "GET",
      path_pattern: "/products/9.json",
      description: undefined,
      accepts: [expect.objectContaining({ amount: "250000", scheme: "exact" })],
    });
  });
});
