import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist/index.js");

describe("launa cli", () => {
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
    const r = run(["--json", "apis", "list"], { LAUNA_API_KEY: "", LAUNA_JWT: "" });
    expect(r.status).toBe(2);
  });
});
