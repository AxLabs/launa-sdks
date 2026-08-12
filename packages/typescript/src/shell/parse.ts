import type { ParsedShellCommand } from "./types.js";

export function tokenizeInput(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i]!)) i++;
    if (i >= input.length) break;
    const ch = input[i]!;
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let buf = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++;
          buf += input[i];
        } else {
          buf += input[i];
        }
        i++;
      }
      if (i < input.length) i++;
      tokens.push(buf);
      continue;
    }
    let buf = "";
    while (i < input.length && !/\s/.test(input[i]!)) {
      buf += input[i];
      i++;
    }
    tokens.push(buf);
  }
  return tokens;
}

export function parseShellArgv(argv: string[]): ParsedShellCommand {
  const json = argv.includes("--json");
  const sandbox = argv.includes("--sandbox");
  const tokens = argv.filter((a) => a !== "--json" && a !== "--sandbox");
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.startsWith("--")) {
      const next = tokens[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[t] = next;
        i++;
      } else {
        flags[t] = "true";
      }
    } else {
      positional.push(t);
    }
  }
  return {
    tokens,
    json,
    sandbox,
    cmd: positional[0] ?? "",
    sub: positional[1] ?? "",
    args: positional.slice(2),
    flags,
  };
}

export function parseShellInput(input: string): ParsedShellCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { tokens: [], json: false, sandbox: false, cmd: "", sub: "", args: [], flags: {} };
  }
  if (trimmed === "help" || trimmed === "?") {
    return { tokens: ["help"], json: false, sandbox: false, cmd: "help", sub: "", args: [], flags: {} };
  }
  if (trimmed === "clear") {
    return { tokens: ["clear"], json: false, sandbox: false, cmd: "clear", sub: "", args: [], flags: {} };
  }
  return parseShellArgv(tokenizeInput(trimmed));
}

export function flag(parsed: ParsedShellCommand, name: string): string | undefined {
  return parsed.flags[name];
}

/** `--id` or first positional after the subcommand. */
export function idFlag(parsed: ParsedShellCommand): string | undefined {
  return flag(parsed, "--id") ?? parsed.args[0];
}

/** Buyer and auth-login commands talk to gateway URLs or /auth/login — no API key. */
export function shellCommandNeedsCredentials(parsed: ParsedShellCommand): boolean {
  const { cmd, sub } = parsed;
  if (cmd === "help" || cmd === "clear") return false;
  if (cmd === "inspect" && sub === "url") return false;
  if (cmd === "x402" && sub === "inspect") return false;
  if (cmd === "pay" && sub === "url") return false;
  if (cmd === "auth" && sub === "login") return false;
  if (cmd === "config" && (sub === "platform" || sub === "billing")) return false;
  return true;
}

/** True when AX402_ENVIRONMENT=development or AX402_SANDBOX is truthy. */
export function envRequestsSandbox(env: NodeJS.ProcessEnv = process.env): boolean {
  const environment = (env.AX402_ENVIRONMENT ?? "").trim().toLowerCase();
  if (environment === "development") return true;
  const sandbox = (env.AX402_SANDBOX ?? "").trim().toLowerCase();
  return sandbox === "1" || sandbox === "true" || sandbox === "yes";
}

/** Reject live API keys when sandbox mode is requested. */
export function assertSandboxCredentials(apiKey: string | undefined, sandbox: boolean): string | undefined {
  if (!sandbox || !apiKey) return undefined;
  if (apiKey.startsWith("ax402_live_")) {
    return "sandbox mode requires an ax402_test_… API key (or AX402_JWT); ax402_live_… keys are production-only";
  }
  return undefined;
}
