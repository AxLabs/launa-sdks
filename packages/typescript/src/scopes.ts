export const SCOPE_APIS_READ = "apis:read";
export const SCOPE_APIS_WRITE = "apis:write";
export const SCOPE_ENDPOINTS_READ = "endpoints:read";
export const SCOPE_ENDPOINTS_WRITE = "endpoints:write";
export const SCOPE_DOMAINS_READ = "domains:read";
export const SCOPE_DOMAINS_WRITE = "domains:write";
export const SCOPE_STATS_READ = "stats:read";
export const SCOPE_SETTLEMENTS_READ = "settlements:read";
export const SCOPE_OPENAPI_READ = "openapi:read";

export const ALL_SCOPES = [
  SCOPE_APIS_READ,
  SCOPE_APIS_WRITE,
  SCOPE_ENDPOINTS_READ,
  SCOPE_ENDPOINTS_WRITE,
  SCOPE_DOMAINS_READ,
  SCOPE_DOMAINS_WRITE,
  SCOPE_STATS_READ,
  SCOPE_SETTLEMENTS_READ,
  SCOPE_OPENAPI_READ,
] as const;

export const SCOPE_PRESETS = {
  readonly: [
    SCOPE_APIS_READ,
    SCOPE_ENDPOINTS_READ,
    SCOPE_DOMAINS_READ,
    SCOPE_STATS_READ,
    SCOPE_SETTLEMENTS_READ,
    SCOPE_OPENAPI_READ,
  ],
  apiManager: [
    SCOPE_APIS_READ,
    SCOPE_APIS_WRITE,
    SCOPE_ENDPOINTS_READ,
    SCOPE_ENDPOINTS_WRITE,
    SCOPE_DOMAINS_READ,
    SCOPE_DOMAINS_WRITE,
    SCOPE_OPENAPI_READ,
  ],
  analytics: [SCOPE_STATS_READ, SCOPE_SETTLEMENTS_READ],
} as const;

export type ScopePreset = keyof typeof SCOPE_PRESETS;

export const SCOPE_LABELS: Record<string, string> = {
  [SCOPE_APIS_READ]: "Read APIs",
  [SCOPE_APIS_WRITE]: "Manage APIs",
  [SCOPE_ENDPOINTS_READ]: "Read endpoints",
  [SCOPE_ENDPOINTS_WRITE]: "Manage endpoints",
  [SCOPE_DOMAINS_READ]: "Read domains",
  [SCOPE_DOMAINS_WRITE]: "Manage domains",
  [SCOPE_STATS_READ]: "Read analytics",
  [SCOPE_SETTLEMENTS_READ]: "Read settlements",
  [SCOPE_OPENAPI_READ]: "Parse OpenAPI specs",
};

export function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

export function parseApiError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return parsed.error ?? body;
  } catch {
    return body;
  }
}
