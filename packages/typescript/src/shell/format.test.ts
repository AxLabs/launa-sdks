import { describe, expect, it } from "vitest";
import { formatHumanOutput } from "./format-human.js";
import { formatShellOutput } from "./format.js";

describe("formatHumanOutput", () => {
  it("formats API list", () => {
    const out = formatHumanOutput(
      [
        {
          id: "6a1def0956a1f09595ac6087",
          name: "Postman Echo",
          slug: "echo",
          environment: "production",
          upstream_base_url: "https://postman-echo.com",
          pay_to_mode: "user_wallet",
          pay_to_address: "0x6d5aB248dFB8074812d841B06DE7B3382230b4FF",
          pay_to_addresses: { "hedera:testnet": "0.0.1234" },
          domains: [{ hostname: "my-api.launa.io", is_primary: true, verified_at: "2026-01-01" }],
        },
      ],
      "apis",
      "list",
    );
    expect(out).toContain("APIs (1)");
    expect(out).toContain("6a1def0956a1f09595ac6087");
    expect(out).toContain("Postman Echo");
    expect(out).toContain("Live");
    expect(out).toContain("my-api.launa.io");
    expect(out).toContain("hedera:testnet");
    expect(out).not.toContain("[{");
  });

  it("formats stats overview", () => {
    const out = formatHumanOutput({
      total_requests: 100,
      payment_required: 40,
      paid_requests: 25,
      unique_payers: 3,
      total_earnings: [{ network: "eip155:84532", amount: "1000000", count: 5 }],
      top_payers: [{ payer: "0xabc123def456", amount: "500000", count: 2 }],
      top_apis: [],
    });
    expect(out).toContain("Stats");
    expect(out).toContain("100");
    expect(out).toContain("1 USDC");
    expect(out).toContain("Top payers");
  });

  it("formats x402 inspect 402", () => {
    const out = formatHumanOutput({
      status: 402,
      url: "https://gw.example/v1/foo",
      method: "GET",
      headers: {},
      body: {},
      paymentRequired: {
        accepts: [{ scheme: "exact", network: "eip155:84532", asset: "0xabc", amount: "100000" }],
      },
    });
    expect(out).toContain("HTTP 402");
    expect(out).toContain("Payment required");
    expect(out).toContain("0.1 USDC");
  });

  it("keeps JSON mode in formatShellOutput", () => {
    const data = { id: "api_1", name: "Demo", slug: "demo", upstream_base_url: "https://x" };
    expect(formatShellOutput(data, true)).toContain('"id": "api_1"');
    expect(formatShellOutput(data, false, "apis", "get")).toContain("Demo");
    expect(formatShellOutput(data, false, "apis", "get")).toContain("id:          api_1");
  });

  it("formats by command even with sparse API rows", () => {
    const out = formatShellOutput(
      [{ id: "abc", name: "X", slug: "x", upstream_base_url: "https://a" }],
      false,
      "apis",
      "list",
    );
    expect(out).toContain("APIs (1)");
    expect(out).not.toContain("{");
  });

  it("uses generic fallback without braces for unknown objects", () => {
    const out = formatHumanOutput({ foo: "bar", count: 2 });
    expect(out).toContain("foo: bar");
    expect(out).not.toContain('{"foo"');
  });
});
