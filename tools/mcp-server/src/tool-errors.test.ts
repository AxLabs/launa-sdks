import { describe, expect, it } from "vitest";
import { LaunaError } from "@launaio/sdk";
import { publicToolError, ToolInputError } from "./tool-errors.js";

describe("public tool errors", () => {
  const payout = "pay_to_address or pay_to_addresses required for user_wallet mode";
  it("preserves safe validation without response data", () => {
    expect(publicToolError(new LaunaError(400, payout, { secret: "never expose" }))).toBe(`Launa request rejected (400): ${payout}`);
    expect(publicToolError(new ToolInputError("sandbox fork supports exact scheme only"))).toBe("sandbox fork supports exact scheme only");
  });
  it("redacts arbitrary upstream, server and runtime failures", () => {
    expect(publicToolError(new LaunaError(400, "secret reflected from request"))).toBe("Launa request rejected (400)");
    expect(publicToolError(new LaunaError(500, payout))).toBe("Launa request rejected (500)");
    expect(publicToolError(new Error(payout))).toBe("Launa request failed");
    expect(publicToolError(new ToolInputError("secret"))).toBe("Launa request failed");
  });
});
