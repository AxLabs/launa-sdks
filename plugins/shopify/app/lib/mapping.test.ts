import { describe, expect, it } from "vitest";
import { priceToAccept, productEndpointPath, shopUpstreamUrl } from "./mapping.js";

describe("mapping", () => {
  it("builds product path", () => {
    expect(productEndpointPath("123")).toBe("/products/123");
  });

  it("converts USDC price", () => {
    expect(priceToAccept("0.10").amount).toBe("100000");
  });

  it("builds upstream url", () => {
    expect(shopUpstreamUrl("demo.myshopify.com")).toBe("https://demo.myshopify.com");
  });
});
