import { describe, expect, it } from "vitest";
import { ALL_SCOPES, SCOPE_PRESETS, parseApiError, scopeLabel } from "./scopes.js";

describe("scopes", () => {
  it("lists all scopes", () => {
    expect(ALL_SCOPES.length).toBeGreaterThan(0);
  });

  it("has presets", () => {
    expect(SCOPE_PRESETS.readonly).toContain("apis:read");
  });

  it("parses api errors", () => {
    expect(parseApiError('{"error":"bad"}')).toBe("bad");
  });

  it("labels scopes", () => {
    expect(scopeLabel("apis:read")).toBe("Read APIs");
  });
});
