import { describe, expect, it } from "vitest";
import { catalogEntry, shellCommandCatalog, shellCommandRequiresJwt } from "./catalog.js";
import {
  formatHelpText,
  helpCommand,
  helpIndex,
  isHelpInvocation,
  jwtRequiredResult,
  resolveHelp,
  shellUsageText,
  shellWelcomeText,
} from "./help.js";
import { parseShellArgv } from "./parse.js";

describe("shell help and catalog", () => {
  it("welcome text points agents at commands --json", () => {
    expect(shellWelcomeText()).toContain("commands --json");
    expect(shellWelcomeText().split("\n").length).toBeLessThan(8);
  });

  it("default help is a short index grouped for humans and agents", () => {
    const text = shellUsageText();
    expect(text).toContain("Seller");
    expect(text).toContain("Account");
    expect(text).toContain("Buyer");
    expect(text).toContain("No seller API key");
    expect(text).toContain("commands --json");
    expect(text).not.toContain("--claim-interval-secs");
  });

  it("per-command help includes aliases and path matching", () => {
    const view = helpCommand("endpoints", "create");
    expect(view.kind).toBe("command");
    if (view.kind !== "command") return;
    const text = formatHelpText(view);
    expect(text).toContain("--price-usdc");
    expect(text).toContain("alias of --price-usdc");
    expect(text).toContain("path_pattern");
    expect(text).toContain("Ephemeral gateway-route");
  });

  it("catalog marks JWT-only and buyer commands", () => {
    const catalog = shellCommandCatalog();
    expect(catalog.globals.some((g) => g.name === "--json")).toBe(true);
    expect(catalogEntry("keys", "list")?.jwt_required).toBe(true);
    expect(catalogEntry("auth", "me")?.jwt_required).toBe(true);
    expect(catalogEntry("auth", "login")?.auth).toBe("public");
    expect(catalogEntry("pay", "url")?.auth).toBe("buyer");
    expect(catalogEntry("config", "platform")?.auth).toBe("public");
    expect(shellCommandRequiresJwt("sandbox-wallet", "get")).toBe(true);
    expect(shellCommandRequiresJwt("sandbox_wallet", "get")).toBe(true);
    expect(shellCommandRequiresJwt("apis", "list")).toBe(false);
  });

  it("treats resource-only argv and --help as help", () => {
    expect(isHelpInvocation(parseShellArgv(["help"]))).toBe(true);
    expect(isHelpInvocation(parseShellArgv(["--help"]))).toBe(true);
    expect(isHelpInvocation(parseShellArgv(["endpoints"]))).toBe(true);
    expect(isHelpInvocation(parseShellArgv(["endpoints", "create", "--help"]))).toBe(true);
    expect(isHelpInvocation(parseShellArgv(["endpoints", "create", "--api-id", "x"]))).toBe(false);
    expect(resolveHelp(parseShellArgv(["help", "--all"])).kind).toBe("all");
    expect(helpIndex().groups.some((g) => g.id === "buyer")).toBe(true);
  });

  it("jwt_required result is structured", () => {
    const result = jwtRequiredResult("keys", "create");
    expect(result).toMatchObject({ ok: false, code: "jwt_required", status: 403, kind: "api" });
    expect(result.hint).toContain("keys create");
  });
});
