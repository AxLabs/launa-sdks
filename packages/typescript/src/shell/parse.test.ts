import { describe, expect, it } from "vitest";
import { parseShellArgv, parseShellInput, tokenizeInput } from "./parse.js";
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

  it("parses flags", () => {
    const p = parseShellArgv(["endpoints", "create", "--api-id", "abc", "--path", "/v1/*"]);
    expect(p.flags["--api-id"]).toBe("abc");
    expect(p.flags["--path"]).toBe("/v1/*");
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
});
