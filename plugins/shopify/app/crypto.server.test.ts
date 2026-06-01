import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, loadCredentials, storeCredentials } from "./crypto.server.ts";

describe("crypto", () => {
  const secret = "test-encryption-secret";

  it("round-trips credentials", () => {
    const blob = storeCredentials({ apiKey: "ax402_live_x", apiId: "api1" }, secret);
    expect(loadCredentials(blob, secret)).toEqual({ apiKey: "ax402_live_x", apiId: "api1" });
  });

  it("encrypts arbitrary strings", () => {
    const enc = encryptSecret("hello", secret);
    expect(decryptSecret(enc, secret)).toBe("hello");
  });
});
