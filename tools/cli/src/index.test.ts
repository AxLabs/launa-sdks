import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist/index.js");

describe("ax402 cli", () => {
  function run(args: string[], env: Record<string, string> = {}) {
    return spawnSync("node", [cli, ...args], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: 5000,
    });
  }

  it("returns exit 2 on unknown command", () => {
    const r = run(["nope"]);
    expect(r.status).toBe(2);
  });

  it("returns exit 2 when credentials missing", () => {
    const r = run(["--json", "apis", "list"], { AX402_API_KEY: "", AX402_JWT: "" });
    expect(r.status).toBe(2);
  });

  it("inspect url does not require control-plane credentials", () => {
    const r = run(
      ["--json", "inspect", "url", "--url", "https://example.invalid/x402-inspect-test"],
      { AX402_API_KEY: "", AX402_JWT: "" },
    );
    expect(r.stderr).not.toContain("AX402_API_KEY or AX402_JWT required");
  });

  it("help and commands work without credentials", () => {
    const help = run(["help"], { AX402_API_KEY: "", AX402_JWT: "" });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("commands --json");
    expect(help.stdout).not.toContain("--claim-interval-secs");

    const catalog = run(["--json", "commands"], { AX402_API_KEY: "", AX402_JWT: "" });
    expect(catalog.status).toBe(0);
    const body = JSON.parse(catalog.stdout) as { commands: Array<{ command: string; jwt_required?: boolean }> };
    expect(body.commands.some((c) => c.command === "apis create")).toBe(true);
    expect(body.commands.find((c) => c.command === "keys list")?.jwt_required).toBe(true);
  });

  it("keys list with an API key returns jwt_required", () => {
    const r = run(["--json", "keys", "list"], { AX402_API_KEY: "ax402_live_test", AX402_JWT: "" });
    expect(r.status).toBe(1);
    const body = JSON.parse(r.stdout) as { code?: string };
    expect(body.code).toBe("jwt_required");
  });
});
