import { describe, expect, it } from "vitest";
import {
  NETWORK_SANDBOX_FORK,
  USDC_BASE_MAINNET,
  buildSandboxUsdcAccept,
  gatewayHostFromAPI,
} from "./helpers.js";

describe("buildSandboxUsdcAccept", () => {
  it("builds exact accept on the sandbox fork", () => {
    const accept = buildSandboxUsdcAccept("exact", "1000");
    expect(accept.network).toBe(NETWORK_SANDBOX_FORK);
    expect(accept.asset).toBe(USDC_BASE_MAINNET);
    expect(accept.amount).toBe("1000");
    expect(accept.extra.name).toBe("USD Coin");
    expect(accept.extra.version).toBe("2");
  });

  it("rejects batch-settlement", () => {
    expect(() => buildSandboxUsdcAccept("batch-settlement", "1000")).toThrow(
      /exact scheme only/,
    );
  });
});

describe("gatewayHostFromAPI", () => {
  it("prefers the primary assigned hostname over platform_domain", () => {
    expect(
      gatewayHostFromAPI(
        {
          slug: "sdk-ts-sbx",
          domains: [
            { hostname: "sdk-ts-sbx.x.staging.ax402.io" },
            { hostname: "sdk-ts-sbx.dev.x.staging.ax402.io", is_primary: true },
          ],
        },
        "x.staging.ax402.io",
      ),
    ).toBe("sdk-ts-sbx.dev.x.staging.ax402.io");
  });

  it("falls back to slug.platform_domain when create returns no domains", () => {
    expect(gatewayHostFromAPI({ slug: "echo" }, "x.staging.ax402.io")).toBe(
      "echo.x.staging.ax402.io",
    );
  });
});
