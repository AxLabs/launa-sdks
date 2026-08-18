import { catalogEntry, catalogEntryFor, SHELL_GROUPS, shellCommandCatalog } from "./catalog.js";
import { findMethod, findResource, SHELL_RESOURCES } from "./registry.js";
import type { ParsedShellCommand, ShellCatalogEntry, ShellResourceDef } from "./types.js";

export type ShellHelpIndex = {
  kind: "index";
  usage: string;
  groups: {
    id: string;
    label: string;
    description: string;
    commands: { command: string; description: string }[];
  }[];
  hints: string[];
};

export type ShellHelpResource = {
  kind: "resource";
  resource: string;
  label: string;
  description: string;
  usage: string;
  methods: { id: string; description: string; auth: string; jwt_required: boolean }[];
  hints: string[];
};

export type ShellHelpCommand = {
  kind: "command";
  command: string;
  usage: string;
  description: string;
  auth: string;
  scopes: string[];
  mutating: boolean;
  jwt_required: boolean;
  flags: ShellCatalogEntry["flags"];
  example: string | null;
  aliases: { flag: string; maps_to: string }[];
};

export type ShellHelpAll = {
  kind: "all";
  text: string;
};

export type ShellHelpView = ShellHelpIndex | ShellHelpResource | ShellHelpCommand | ShellHelpAll;

function usageLine(resourceId: string, methodId: string, entry: ShellCatalogEntry): string {
  const required = entry.flags
    .filter((f) => f.required && !f.alias_of)
    .map((f) => (f.type === "boolean" ? f.name : `${f.name} VALUE`))
    .join(" ");
  const optional = entry.flags
    .filter((f) => !f.required && !f.alias_of)
    .map((f) => (f.type === "boolean" ? `[${f.name}]` : `[${f.name} VALUE]`))
    .join(" ");
  return `ax402 [--json] [--sandbox] ${resourceId} ${methodId}${required ? " " + required : ""}${optional ? " " + optional : ""}`;
}

export function shellWelcomeText(): string {
  return [
    "Ax402 CLI",
    "",
    "Type help for commands, or <command> --help for flags.",
    "Agents: commands --json",
  ].join("\n");
}

export function helpIndex(): ShellHelpIndex {
  const catalog = shellCommandCatalog();
  const groups = SHELL_GROUPS.map((group) => {
    const resources = SHELL_RESOURCES.filter((r) => (r.group ?? "seller") === group.id);
    const commands: { command: string; description: string }[] = [];
    if (group.id === "meta") {
      commands.push(
        { command: "help", description: "Command index (this page)." },
        { command: "commands", description: "Machine-readable catalog. Use --json." },
      );
    }
    for (const resource of resources) {
      commands.push({
        command: resource.id,
        description: resource.description ?? resource.label,
      });
    }
    return {
      id: group.id,
      label: group.label,
      description: group.description,
      commands,
    };
  });
  return {
    kind: "index",
    usage: catalog.globals.length
      ? "ax402 [--json] [--sandbox] <command> [subcommand] [options]"
      : "ax402 <command> [subcommand] [options]",
    groups,
    hints: [
      "ax402 <command> --help              list subcommands",
      "ax402 <command> <subcommand> --help flags and example JSON",
      "ax402 commands --json               full registry for agents",
      "ax402 help --all                    every command (human cheatsheet)",
      "Buyer inspect/pay do not use AX402_API_KEY.",
    ],
  };
}

export function helpResource(resourceId: string): ShellHelpResource | ShellHelpIndex {
  const resource = findResource(resourceId);
  if (!resource) return helpIndex();
  return helpResourceFrom(resource);
}

function helpResourceFrom(resource: ShellResourceDef): ShellHelpResource {
  return {
    kind: "resource",
    resource: resource.id,
    label: resource.label,
    description: resource.description ?? resource.label,
    usage: `ax402 [--json] [--sandbox] ${resource.id} <subcommand> [options]`,
    methods: resource.methods.map((method) => {
      const entry = catalogEntryFor(resource, method);
      return {
        id: method.id,
        description: entry.description,
        auth: entry.auth,
        jwt_required: entry.jwt_required,
      };
    }),
    hints: [
      `ax402 ${resource.id} <subcommand> --help`,
      resource.auth === "jwt" || resource.methods.some((m) => m.auth === "jwt")
        ? "Some subcommands require AX402_JWT (not an API key)."
        : "",
      resource.group === "buyer" ? "No seller API key. pay uses AX402_EVM_PRIVATE_KEY and/or Hedera keys." : "",
    ].filter(Boolean),
  };
}

export function helpCommand(resourceId: string, methodId: string): ShellHelpCommand | ShellHelpResource | ShellHelpIndex {
  const resource = findResource(resourceId);
  if (!resource) return helpIndex();
  const method = findMethod(resource.id, methodId);
  if (!method) return helpResourceFrom(resource);
  const entry = catalogEntryFor(resource, method);
  const aliases: { flag: string; maps_to: string }[] = [];
  const seen = new Set<string>();
  const addAlias = (flagName: string, mapsTo: string) => {
    const key = `${flagName}\0${mapsTo}`;
    if (seen.has(key)) return;
    seen.add(key);
    aliases.push({ flag: flagName, maps_to: mapsTo });
  };
  for (const flag of entry.flags) {
    if (flag.alias_of) addAlias(flag.name, flag.alias_of);
    for (const alias of flag.aliases) addAlias(alias, flag.name);
    if (flag.api_field) {
      const fromFlag = flag.name.replace(/^--/, "").replace(/-/g, "_");
      if (flag.api_field !== fromFlag) addAlias(flag.name, flag.api_field);
    }
  }
  return {
    kind: "command",
    command: entry.command,
    usage: usageLine(resource.id, method.id, entry),
    description: entry.description,
    auth: entry.auth,
    scopes: entry.scopes,
    mutating: entry.mutating,
    jwt_required: entry.jwt_required,
    flags: entry.flags,
    example: entry.example,
    aliases,
  };
}

export function shellHelpAllText(): string {
  const lines = [
    "Usage: ax402 [--json] [--sandbox] <command> [options]",
    "",
    "Commands:",
  ];
  for (const resource of SHELL_RESOURCES) {
    for (const method of resource.methods) {
      const entry = catalogEntryFor(resource, method);
      const flagParts = entry.flags
        .filter((f) => f.required && !f.alias_of)
        .map((f) => `${f.name} VALUE`)
        .join(" ");
      const optional = entry.flags
        .filter((f) => !f.required && !f.alias_of)
        .map((f) => (f.type === "boolean" ? `[${f.name}]` : `[${f.name} VALUE]`))
        .join(" ");
      const jwt = entry.jwt_required ? "  # JWT" : entry.auth === "buyer" ? "  # buyer, no seller key" : "";
      lines.push(
        `  ${resource.id} ${method.id}${flagParts ? " " + flagParts : ""}${optional ? " " + optional : ""}${jwt}`,
      );
    }
  }
  lines.push("  help");
  lines.push("  commands --json");
  lines.push("");
  lines.push(
    "Env: AX402_API_KEY or AX402_JWT (control plane); --sandbox / AX402_ENVIRONMENT=development / AX402_SANDBOX=1 for Test mode; JWT-only: keys, auth me, sandbox-wallet, scopes list; pay url: AX402_EVM_PRIVATE_KEY and/or HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY",
  );
  return lines.join("\n");
}

/** Compact command index (default `ax402` / `help`). */
export function shellUsageText(): string {
  return formatHelpText(helpIndex());
}

export function formatHelpText(view: ShellHelpView): string {
  if (view.kind === "all") return view.text;
  if (view.kind === "index") {
    const lines = [view.usage, ""];
    for (const group of view.groups) {
      lines.push(`${group.label}`);
      if (group.description) lines.push(`  ${group.description}`);
      for (const command of group.commands) {
        lines.push(`  ${command.command.padEnd(16)} ${command.description}`);
      }
      lines.push("");
    }
    lines.push("Next:");
    for (const hint of view.hints) lines.push(`  ${hint}`);
    return lines.join("\n").trimEnd();
  }
  if (view.kind === "resource") {
    const lines = [
      `Usage: ${view.usage}`,
      "",
      view.description,
      "",
      "Subcommands:",
    ];
    for (const method of view.methods) {
      const jwt = method.jwt_required ? " (JWT)" : "";
      lines.push(`  ${method.id.padEnd(18)} ${method.description}${jwt}`);
    }
    if (view.hints.length) {
      lines.push("");
      for (const hint of view.hints) lines.push(hint);
    }
    return lines.join("\n");
  }

  const lines = [`Usage: ${view.usage}`, "", view.description, ""];
  lines.push(`Auth: ${authLabel(view.auth)}${view.jwt_required ? " (JWT required)" : ""}`);
  if (view.scopes.length) lines.push(`Scopes: ${view.scopes.join(", ")}`);
  lines.push(`Mutating: ${view.mutating ? "yes" : "no"}`);
  const required = view.flags.filter((f) => f.required);
  const optional = view.flags.filter((f) => !f.required);
  if (required.length) {
    lines.push("", "Required:");
    for (const flag of required) lines.push(formatFlagHelp(flag));
  }
  if (optional.length) {
    lines.push("", "Optional:");
    for (const flag of optional) lines.push(formatFlagHelp(flag));
  }
  if (view.aliases.length) {
    lines.push("", "Aliases:");
    for (const alias of view.aliases) lines.push(`  ${alias.flag} → ${alias.maps_to}`);
  }
  if (view.example) {
    lines.push("", "Example:", `  ax402 ${view.example}`);
  }
  return lines.join("\n");
}

function formatFlagHelp(flag: ShellCatalogEntry["flags"][number]): string {
  const bits: string[] = [flag.type];
  if (flag.required) bits.push("required");
  if (flag.default) bits.push(`default ${flag.default}`);
  if (flag.alias_of) bits.push(`alias of ${flag.alias_of}`);
  const meta = bits.join(", ");
  const desc = flag.description || flag.placeholder || "";
  return `  ${flag.name.padEnd(28)} ${meta}${desc ? "  " + desc : ""}`;
}

function authLabel(auth: string): string {
  if (auth === "api_key") return "API key";
  if (auth === "jwt") return "JWT";
  if (auth === "buyer") return "buyer wallet (no seller key)";
  return "none (public)";
}

export function isHelpInvocation(parsed: ParsedShellCommand): boolean {
  if (parsed.cmd === "help") return true;
  if (parsed.flags["--help"] === "true") return true;
  if (parsed.cmd && !parsed.sub && findResource(parsed.cmd)) return true;
  return false;
}

export function resolveHelp(parsed: ParsedShellCommand): ShellHelpView {
  if (parsed.cmd === "help") {
    if (parsed.flags["--all"] === "true") return { kind: "all", text: shellHelpAllText() };
    const resourceId = parsed.sub;
    const methodId = parsed.args[0] ?? "";
    if (!resourceId) return helpIndex();
    if (!methodId) return helpResource(resourceId);
    return helpCommand(resourceId, methodId);
  }
  if (!parsed.cmd) return helpIndex();
  if (!parsed.sub) return helpResource(parsed.cmd);
  const view = helpCommand(parsed.cmd, parsed.sub);
  if (view.kind === "command") return view;
  if (parsed.flags["--help"] === "true") return view;
  return view;
}

/** Help text for a usage error: per-command when possible, else the compact index. */
export function usageHelpText(cmd: string, sub: string): string {
  if (!cmd) return shellUsageText();
  const resource = findResource(cmd);
  if (!resource) return shellUsageText();
  if (!sub) return formatHelpText(helpResourceFrom(resource));
  const method = findMethod(resource.id, sub);
  if (!method) return formatHelpText(helpResourceFrom(resource));
  return formatHelpText(helpCommand(resource.id, sub) as ShellHelpCommand);
}

export function jwtRequiredResult(cmd: string, sub: string): {
  ok: false;
  kind: "api";
  code: "jwt_required";
  status: 403;
  error: string;
  hint: string;
} {
  const entry = catalogEntry(cmd, sub);
  const command = entry?.command ?? `${cmd} ${sub}`.trim();
  return {
    ok: false,
    kind: "api",
    code: "jwt_required",
    status: 403,
    error: "jwt required",
    hint: `${command} needs AX402_JWT from \`ax402 auth login\`. An API key cannot run keys, auth me, sandbox-wallet, or scopes list.`,
  };
}
