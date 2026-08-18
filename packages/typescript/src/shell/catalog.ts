import {
  SCOPE_APIS_READ,
  SCOPE_APIS_WRITE,
  SCOPE_BILLING_READ,
  SCOPE_BILLING_WRITE,
  SCOPE_DOMAINS_READ,
  SCOPE_DOMAINS_WRITE,
  SCOPE_ENDPOINTS_READ,
  SCOPE_ENDPOINTS_WRITE,
  SCOPE_INCOME_PAYOUT,
  SCOPE_INCOME_READ,
  SCOPE_OPENAPI_READ,
  SCOPE_SETTLEMENTS_READ,
  SCOPE_STATS_READ,
} from "../scopes.js";
import { findMethod, findResource, SHELL_RESOURCES } from "./registry.js";
import type {
  FlagType,
  ShellAuth,
  ShellCatalogEntry,
  ShellCatalogFlag,
  ShellCommandCatalog,
  ShellMethodDef,
  ShellResourceDef,
  ShellResourceGroup,
} from "./types.js";

const WRITE_METHOD_IDS = new Set([
  "create",
  "update",
  "delete",
  "add",
  "revoke",
  "reset",
  "import",
  "verify",
  "cors-set",
  "cors-add",
  "cors-remove",
  "settings",
]);

const RESOURCE_SCOPES: Record<string, { read: string[]; write: string[] }> = {
  apis: { read: [SCOPE_APIS_READ], write: [SCOPE_APIS_WRITE] },
  endpoints: { read: [SCOPE_ENDPOINTS_READ], write: [SCOPE_ENDPOINTS_WRITE] },
  domains: { read: [SCOPE_DOMAINS_READ], write: [SCOPE_DOMAINS_WRITE] },
  openapi: { read: [SCOPE_OPENAPI_READ], write: [SCOPE_OPENAPI_READ] },
  discovery: { read: [SCOPE_APIS_READ], write: [SCOPE_APIS_WRITE] },
  stats: { read: [SCOPE_STATS_READ], write: [SCOPE_STATS_READ] },
  settlements: { read: [SCOPE_SETTLEMENTS_READ], write: [SCOPE_SETTLEMENTS_READ] },
  billing: { read: [SCOPE_BILLING_READ], write: [SCOPE_BILLING_WRITE] },
  income: { read: [SCOPE_INCOME_READ], write: [SCOPE_INCOME_PAYOUT] },
  batch: { read: [SCOPE_APIS_READ], write: [SCOPE_APIS_WRITE] },
};

export const SHELL_GROUPS: { id: ShellResourceGroup; label: string; description: string }[] = [
  {
    id: "seller",
    label: "Seller",
    description: "Wrap APIs, price routes, domains, discovery, and analytics. API key.",
  },
  {
    id: "account",
    label: "Account",
    description: "Auth, keys, billing, and income. Some commands are JWT-only.",
  },
  {
    id: "buyer",
    label: "Buyer",
    description: "Inspect or pay a gateway URL. No seller API key. pay uses a buyer wallet env.",
  },
  {
    id: "meta",
    label: "Meta",
    description: "Help, command catalog, and public platform config.",
  },
];

export const SHELL_GLOBALS = [
  { name: "--json", description: "JSON on stdout, including errors." },
  { name: "--sandbox", description: "Test mode (development APIs and fork USDC)." },
  { name: "--help", description: "Command or resource help. Does not run the command." },
];

function catalogFlag(flag: ShellFlagDefLike): ShellCatalogFlag {
  return {
    name: flag.name,
    required: Boolean(flag.required),
    type: (flag.type ?? "string") as FlagType,
    default: flag.defaultValue ?? null,
    prefill: flag.prefill ?? flag.defaultValue ?? null,
    placeholder: flag.placeholder ?? null,
    aliases: flag.aliases ?? [],
    alias_of: flag.aliasOf ?? null,
    api_field: flag.apiField ?? null,
    description: flag.description ?? flag.label ?? "",
  };
}

type ShellFlagDefLike = {
  name: string;
  label?: string;
  required?: boolean;
  type?: FlagType;
  defaultValue?: string;
  prefill?: string;
  placeholder?: string;
  description?: string;
  aliases?: string[];
  aliasOf?: string;
  apiField?: string;
};

export function resourceGroup(resource: ShellResourceDef): ShellResourceGroup {
  return resource.group ?? "seller";
}

export function methodAuth(resource: ShellResourceDef, method: ShellMethodDef): ShellAuth {
  return method.auth ?? resource.auth ?? "api_key";
}

export function methodMutating(method: ShellMethodDef): boolean {
  return method.mutating ?? WRITE_METHOD_IDS.has(method.id);
}

export function methodScopes(resource: ShellResourceDef, method: ShellMethodDef): string[] {
  if (method.scopes) return method.scopes;
  const auth = methodAuth(resource, method);
  if (auth === "public" || auth === "buyer" || auth === "jwt") return [];
  const pair = RESOURCE_SCOPES[resource.id];
  if (!pair) return [];
  return methodMutating(method) ? pair.write : pair.read;
}

export function methodDescription(method: ShellMethodDef): string {
  return method.description ?? method.label;
}

export function catalogEntryFor(resource: ShellResourceDef, method: ShellMethodDef): ShellCatalogEntry {
  const auth = methodAuth(resource, method);
  return {
    command: `${resource.id} ${method.id}`,
    resource: resource.id,
    method: method.id,
    label: method.label,
    description: methodDescription(method),
    group: resourceGroup(resource),
    auth,
    scopes: methodScopes(resource, method),
    mutating: methodMutating(method),
    jwt_required: auth === "jwt",
    flags: method.flags.map(catalogFlag),
    example: method.example ?? null,
    sdk_snippet: method.sdkSnippet ?? null,
  };
}

const META_COMMANDS: ShellCatalogEntry[] = [
  {
    command: "help",
    resource: "help",
    method: "",
    label: "Help",
    description: "Command index. Use <command> --help for flags. help --all prints every command.",
    group: "meta",
    auth: "public",
    scopes: [],
    mutating: false,
    jwt_required: false,
    flags: [
      catalogFlag({
        name: "--all",
        required: false,
        type: "boolean",
        description: "Print every command (human cheatsheet). Prefer commands --json for agents.",
      }),
    ],
    example: "help",
    sdk_snippet: null,
  },
  {
    command: "commands",
    resource: "commands",
    method: "",
    label: "Command catalog",
    description: "Machine-readable command registry (flags, types, auth, scopes).",
    group: "meta",
    auth: "public",
    scopes: [],
    mutating: false,
    jwt_required: false,
    flags: [],
    example: "commands --json",
    sdk_snippet: null,
  },
];

export function shellCommandCatalog(): ShellCommandCatalog {
  const commands: ShellCatalogEntry[] = [...META_COMMANDS];
  for (const resource of SHELL_RESOURCES) {
    for (const method of resource.methods) {
      commands.push(catalogEntryFor(resource, method));
    }
  }
  return {
    globals: SHELL_GLOBALS,
    groups: SHELL_GROUPS,
    commands,
  };
}

export function catalogEntry(cmd: string, sub: string): ShellCatalogEntry | undefined {
  if (cmd === "help" || cmd === "commands") {
    return META_COMMANDS.find((c) => c.resource === cmd);
  }
  const resource = findResource(cmd);
  if (!resource || !sub) return undefined;
  const method = findMethod(resource.id, sub);
  if (!method) return undefined;
  return catalogEntryFor(resource, method);
}

export function resolvedAuth(cmd: string, sub: string): ShellAuth | undefined {
  if (cmd === "help" || cmd === "commands" || cmd === "clear") return "public";
  const resource = findResource(cmd);
  if (!resource) return undefined;
  if (!sub) return resource.auth ?? "api_key";
  const method = findMethod(resource.id, sub);
  if (!method) return resource.auth ?? "api_key";
  return methodAuth(resource, method);
}

export function shellCommandRequiresJwt(cmd: string, sub: string): boolean {
  return resolvedAuth(cmd, sub) === "jwt";
}
