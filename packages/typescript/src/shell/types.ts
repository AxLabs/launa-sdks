export type FlagType = "string" | "number" | "url" | "address" | "textarea" | "boolean";

/** How a command authenticates. */
export type ShellAuth = "api_key" | "jwt" | "public" | "buyer";

export type ShellResourceGroup = "seller" | "account" | "buyer" | "meta";

export type ShellCredentialKind = "apiKey" | "jwt" | "none";

export type ShellFlagDef = {
  name: string;
  label?: string;
  required?: boolean;
  type?: FlagType;
  /** Applied by the CLI if the flag is omitted. */
  defaultValue?: string;
  /** Dashboard/form prefill; not applied by the CLI unless also defaultValue. */
  prefill?: string;
  placeholder?: string;
  description?: string;
  /** Other CLI flags that map to this one. */
  aliases?: string[];
  /** This flag is an alias of another flag. */
  aliasOf?: string;
  /** Control-plane / SDK field name when it differs from the flag. */
  apiField?: string;
};

export type ShellMethodDef = {
  id: string;
  label: string;
  flags: ShellFlagDef[];
  /** SDK snippet template for "Show code" */
  sdkSnippet?: string;
  description?: string;
  auth?: ShellAuth;
  scopes?: string[];
  mutating?: boolean;
  /** Example argv (without the binary name). */
  example?: string;
};

export type ShellResourceDef = {
  id: string;
  label: string;
  methods: ShellMethodDef[];
  description?: string;
  group?: ShellResourceGroup;
  /** Default auth for methods that omit it. */
  auth?: ShellAuth;
  aliases?: string[];
};

export type ParsedShellCommand = {
  tokens: string[];
  json: boolean;
  /** Global --sandbox: target development environment + fork USDC defaults. */
  sandbox: boolean;
  cmd: string;
  sub: string;
  /** Positional args after cmd/sub (e.g. API id for `apis get <id>`). */
  args: string[];
  flags: Record<string, string>;
};

export type ShellResult =
  | { ok: true; data: unknown }
  | {
      ok: false;
      error: string;
      kind?: "usage" | "api";
      status?: number;
      data?: Record<string, unknown>;
      code?: string;
      hint?: string;
      /** Human help attached to usage errors (per-command, not the full dump). */
      help?: string;
    };

export type ShellExecuteContext = {
  client: import("../client.js").Ax402Client;
  /** Base URL for auth login (guest client) */
  baseUrl?: string;
  /** Resolved sandbox mode (--sandbox or AX402_ENVIRONMENT/AX402_SANDBOX). */
  sandbox?: boolean;
  /** How the caller authenticated. Used to fail JWT-only commands locally. */
  credentialKind?: ShellCredentialKind;
  /** Read file path to string (Node CLI --file flags) */
  readFile?: (path: string) => Promise<string>;
  /** Inspect gateway URL (402 payment requirements) */
  runInspectUrl?: (url: string, method: string) => Promise<unknown>;
  /** Pay gateway URL (CLI private key or browser wallet) */
  runPayUrl?: (url: string, method: string) => Promise<unknown>;
};

export type ShellCatalogFlag = {
  name: string;
  required: boolean;
  type: FlagType;
  default: string | null;
  prefill: string | null;
  placeholder: string | null;
  aliases: string[];
  alias_of: string | null;
  api_field: string | null;
  description: string;
};

export type ShellCatalogEntry = {
  command: string;
  resource: string;
  method: string;
  label: string;
  description: string;
  group: ShellResourceGroup;
  auth: ShellAuth;
  scopes: string[];
  mutating: boolean;
  jwt_required: boolean;
  flags: ShellCatalogFlag[];
  example: string | null;
  sdk_snippet: string | null;
};

export type ShellCommandCatalog = {
  globals: { name: string; description: string }[];
  groups: { id: ShellResourceGroup; label: string; description: string }[];
  commands: ShellCatalogEntry[];
};
