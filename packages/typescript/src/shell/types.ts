export type FlagType = "string" | "number" | "url" | "address" | "textarea" | "boolean";

export type ShellFlagDef = {
  name: string;
  label?: string;
  required?: boolean;
  type?: FlagType;
  defaultValue?: string;
  placeholder?: string;
};

export type ShellMethodDef = {
  id: string;
  label: string;
  flags: ShellFlagDef[];
  /** SDK snippet template for "Show code" */
  sdkSnippet?: string;
};

export type ShellResourceDef = {
  id: string;
  label: string;
  methods: ShellMethodDef[];
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
  | { ok: false; error: string; kind?: "usage" | "api"; status?: number; data?: Record<string, unknown> };

export type ShellExecuteContext = {
  client: import("../client.js").LaunaClient;
  /** Base URL for auth login (guest client) */
  baseUrl?: string;
  /** Resolved sandbox mode (--sandbox or LAUNA_ENVIRONMENT/LAUNA_SANDBOX). */
  sandbox?: boolean;
  /** Read file path to string (Node CLI --file flags) */
  readFile?: (path: string) => Promise<string>;
  /** Inspect gateway URL (402 payment requirements) */
  runInspectUrl?: (url: string, method: string) => Promise<unknown>;
  /** Pay gateway URL (CLI private key or browser wallet) */
  runPayUrl?: (url: string, method: string) => Promise<unknown>;
};
