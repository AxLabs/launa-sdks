import { describe, expect, it } from "vitest";
import {
  apiKeyImpliesSandbox,
  assertSandboxCredentials,
  envRequestsSandbox,
  parsePayToAddressesFlag,
  parseShellArgv,
  parseShellInput,
  tokenizeInput,
} from "./parse.js";
import { buildArgvFromForm, argvToShellCommand } from "./registry.js";

describe("shell parse", () => {
  it("tokenizes quoted strings", () => {
    expect(tokenizeInput('apis create --name "My API" --slug test')).toEqual([
      "apis",
      "create",
      "--name",
      "My API",
      "--slug",
      "test",
    ]);
  });

  it("parses --json flag", () => {
    const p = parseShellArgv(["--json", "apis", "list"]);
    expect(p.json).toBe(true);
    expect(p.cmd).toBe("apis");
    expect(p.sub).toBe("list");
  });

  it("parses --sandbox flag", () => {
    const p = parseShellArgv(["--sandbox", "apis", "list"]);
    expect(p.sandbox).toBe(true);
    expect(p.cmd).toBe("apis");
    expect(p.sub).toBe("list");
  });

  it("parses --json without waiting implication for sandbox-wallet argv", () => {
    const p = parseShellArgv(["--json", "--sandbox", "sandbox-wallet", "get"]);
    expect(p.json).toBe(true);
    expect(p.sandbox).toBe(true);
    expect(p.cmd).toBe("sandbox-wallet");
    expect(p.sub).toBe("get");
  });

  it("envRequestsSandbox is case-insensitive", () => {
    expect(envRequestsSandbox({ AX402_ENVIRONMENT: "Development" } as NodeJS.ProcessEnv)).toBe(true);
    expect(envRequestsSandbox({ AX402_SANDBOX: "YES" } as NodeJS.ProcessEnv)).toBe(true);
    expect(envRequestsSandbox({ AX402_ENVIRONMENT: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("envRequestsSandbox infers sandbox from API key prefix", () => {
    expect(envRequestsSandbox({ AX402_API_KEY: "ax402_sandbox_abc" } as NodeJS.ProcessEnv)).toBe(true);
    expect(envRequestsSandbox({ AX402_API_KEY: "ax402_test_abc" } as NodeJS.ProcessEnv)).toBe(false);
    expect(envRequestsSandbox({ AX402_API_KEY: "ax402_live_abc" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("apiKeyImpliesSandbox matches sandbox prefix only", () => {
    expect(apiKeyImpliesSandbox("ax402_sandbox_abc")).toBe(true);
    expect(apiKeyImpliesSandbox("ax402_test_abc")).toBe(false);
    expect(apiKeyImpliesSandbox("ax402_live_abc")).toBe(false);
    expect(apiKeyImpliesSandbox(undefined)).toBe(false);
  });

  it("assertSandboxCredentials rejects live keys", () => {
    expect(assertSandboxCredentials("ax402_live_abc", true)).toMatch(/ax402_sandbox_/);
    expect(assertSandboxCredentials("ax402_sandbox_abc", true)).toBeUndefined();
    expect(assertSandboxCredentials("ax402_live_abc", false)).toBeUndefined();
  });

  it("parses flags", () => {
    const p = parseShellArgv(["endpoints", "create", "--api-id", "abc", "--path", "/v1/*"]);
    expect(p.flags["--api-id"]).toBe("abc");
    expect(p.flags["--path"]).toBe("/v1/*");
  });

  it("captures positional args after cmd/sub", () => {
    const p = parseShellArgv([
      "apis",
      "update",
      "6a5a069930cbab77aee99e9d",
      "--webhook-url",
      "https://app.example/hooks",
    ]);
    expect(p.cmd).toBe("apis");
    expect(p.sub).toBe("update");
    expect(p.args).toEqual(["6a5a069930cbab77aee99e9d"]);
    expect(p.flags["--webhook-url"]).toBe("https://app.example/hooks");
  });

  it("maps help and clear", () => {
    expect(parseShellInput("help").cmd).toBe("help");
    expect(parseShellInput("clear").cmd).toBe("clear");
  });

  it("builds argv from explorer form", () => {
    const argv = buildArgvFromForm("apis", "create", {
      "--name": "Demo",
      "--slug": "demo",
      "--upstream": "https://api.example.com",
    });
    expect(argv).toEqual([
      "apis",
      "create",
      "--name",
      "Demo",
      "--slug",
      "demo",
      "--upstream",
      "https://api.example.com",
    ]);
    expect(argvToShellCommand(["apis", "create", "--name", "My API"])).toContain('"My API"');
  });

  it("parses pay_to_addresses JSON and network=address pairs", () => {
    expect(parsePayToAddressesFlag('{"hedera:testnet":"0.0.1234"}')).toEqual({
      "hedera:testnet": "0.0.1234",
    });
    expect(parsePayToAddressesFlag("{}")).toEqual({});
    expect(parsePayToAddressesFlag("hedera:testnet=0.0.1234,eip155:8453=0xabc")).toEqual({
      "hedera:testnet": "0.0.1234",
      "eip155:8453": "0xabc",
    });
    expect(parsePayToAddressesFlag("{")).toMatch(/invalid JSON/);
    expect(parsePayToAddressesFlag("0.0.1234")).toMatch(/network=address/);
  });
});
