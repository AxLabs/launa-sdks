import { z } from "zod";

export const CONTROL_SCOPES = [
  "apis:read",
  "apis:write",
  "endpoints:read",
  "endpoints:write",
  "domains:read",
  "domains:write",
  "stats:read",
  "settlements:read",
  "openapi:read",
  "billing:read",
  "income:read",
  "sandbox:wallet",
] as const;
export type Environment = "development" | "production";
export interface OAuthClient {
  id: string;
  name: string;
  redirectUris: string[];
  dynamic?: boolean;
}
export interface HostedConfig {
  publicUrl: string;
  frontendUrl: string;
  backendUrl: string;
  encryptionKey: Buffer;
  bridgeSecret: string;
  clients: OAuthClient[];
}

function origin(value: string, name: string): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must be an HTTPS origin (HTTP loopback allowed for development)`,
    );
  }
  return url.origin;
}

export function readConfig(env: NodeJS.ProcessEnv): HostedConfig {
  const required = (name: string) => {
    const value = env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  const encryptionKey = Buffer.from(required("MCP_ENCRYPTION_KEY"), "base64");
  if (encryptionKey.length !== 32)
    throw new Error("MCP_ENCRYPTION_KEY must encode 32 random bytes");
  const bridgeSecret = required("MCP_BRIDGE_SECRET");
  if (bridgeSecret.length < 43)
    throw new Error(
      "MCP_BRIDGE_SECRET must contain at least 32 random bytes (base64url)",
    );
  const clients = z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        name: z.string().min(1).max(100),
        redirectUris: z.array(z.string().url()).min(1),
      }),
    )
    .min(1)
    .parse(JSON.parse(required("MCP_OAUTH_CLIENTS")));
  if (new Set(clients.map((c) => c.id)).size !== clients.length)
    throw new Error("Duplicate OAuth client ID");
  for (const client of clients)
    for (const redirect of client.redirectUris) {
      const url = new URL(redirect);
      origin(url.origin, "OAuth redirect");
      if (url.username || url.password || url.hash || url.search)
        throw new Error("Invalid OAuth redirect URI");
    }
  return {
    publicUrl: origin(required("MCP_PUBLIC_URL"), "MCP_PUBLIC_URL"),
    frontendUrl: origin(required("MCP_FRONTEND_URL"), "MCP_FRONTEND_URL"),
    backendUrl: origin(required("LAUNA_BASE_URL"), "LAUNA_BASE_URL"),
    encryptionKey,
    bridgeSecret,
    clients,
  };
}
