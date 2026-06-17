import { describe, expect, it } from "vitest";
import {
  gatewayLink,
  priceToAccept,
  productEndpointPath,
  shopSlug,
  shopUpstreamUrl,
} from "./mapping.js";

describe("mapping", () => {
  it("builds REST product path", () => {
    expect(productEndpointPath("123")).toBe("/products/123");
  });

  it("builds storefront JSON path", () => {
    expect(productEndpointPath("123", "storefront-product")).toBe("/products/123.json");
  });

  it("converts USDC price (exact)", () => {
    expect(priceToAccept("0.10").amount).toBe("100000");
    expect(priceToAccept("0.10").scheme).toBe("exact");
  });

  it("supports batch-settlement scheme", () => {
    const accept = priceToAccept("1", "batch-settlement");
    expect(accept.scheme).toBe("batch-settlement");
    expect(accept.extra?.withdrawDelay).toBeDefined();
  });

  it("builds upstream url and slug", () => {
    expect(shopUpstreamUrl("demo.myshopify.com")).toBe("https://demo.myshopify.com");
    expect(shopSlug("Demo.Myshopify.com")).toBe("demo-myshopify-com");
  });

  it("builds gateway link", () => {
    expect(
      gatewayLink("shop.localhost", "/products/1", {
        platform_domain: "localhost",
        gateway_cname_target: "gw",
        gateway_port: 8090,
        admin_host: "api.localhost",
      }),
    ).toBe("http://shop.localhost:8090/products/1");
  });
});
