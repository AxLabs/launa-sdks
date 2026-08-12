import { describe, expect, it } from "vitest";
import {
  NETWORK_SANDBOX_FORK,
  USDC_BASE_MAINNET,
  buildSandboxUsdcAccept,
} from "./helpers.js";

describe("buildSandboxUsdcAccept", () => {
  it("builds exact accept on the sandbox fork", () => {
    const accept = buildSandboxUsdcAccept("exact", "1000");
    expect(accept.network).toBe(NETWORK_SANDBOX_FORK);
    expect(accept.asset).toBe(USDC_BASE_MAINNET);
    expect(accept.amount).toBe("1000");
    expect(accept.scheme).toBe("exact");
  });

  it("rejects batch-settlement", () => {
    expect(() => buildSandboxUsdcAccept("batch-settlement", "1000")).toThrow(
      /exact scheme only/,
    );
  });
});
