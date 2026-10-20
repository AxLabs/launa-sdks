import { z } from "zod";
import type { OAuthClient } from "./config.js";
import type { OAuthStore } from "./store.js";
import { randomToken } from "./crypto.js";
import { OAuthError } from "./errors.js";

// Reviewed web-client callbacks only. Registration never fetches client metadata.
export const WEB_CALLBACKS = new Set([
  "https://chatgpt.com/connector_platform_oauth_redirect",
  "https://claude.ai/api/mcp/auth_callback",
  "https://www.cursor.com/agents/mcp/oauth/callback",
  "https://vscode.dev/redirect",
  "https://insiders.vscode.dev/redirect",
]);
const loopback = new Set(["127.0.0.1", "[::1]", "localhost"]);
export function loopbackRedirect(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol === "http:" &&
      loopback.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !value.includes("\\") &&
      !/[\s\u0000-\u001f]/.test(value)
    )
      return url;
  } catch {
    /* Invalid URIs are rejected below. */
  }
}

const registrationSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/)
    .default("Developer tool"),
  redirect_uris: z.array(z.string().max(512)).min(1).max(8),
  token_endpoint_auth_method: z.literal("none").default("none"),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .min(1)
    .max(2)
    .default(["authorization_code"]),
  response_types: z.tuple([z.literal("code")]).default(["code"]),
});

export function registrationMetadata(input: unknown) {
  const result = registrationSchema.safeParse(input);
  if (!result.success) throw new OAuthError(400, "invalid_client_metadata");
  const metadata = result.data;
  if (!metadata.grant_types.includes("authorization_code"))
    throw new OAuthError(400, "invalid_client_metadata");
  for (const uri of metadata.redirect_uris) {
    if (!WEB_CALLBACKS.has(uri) && !loopbackRedirect(uri))
      throw new OAuthError(400, "invalid_redirect_uri");
  }
  return metadata;
}

export function matchesRedirect(client: OAuthClient, requested: string) {
  if (client.redirectUris.includes(requested)) return true;
  // RFC 8252 §7.3: native clients choose an available loopback port at login.
  // Keep static clients exact; only registered native clients get this exception.
  if (!client.dynamic) return false;
  const candidate = loopbackRedirect(requested);
  if (!candidate) return false;
  return client.redirectUris.some((uri) => {
    const registered = loopbackRedirect(uri);
    return (
      registered?.hostname === candidate.hostname &&
      registered.pathname === candidate.pathname
    );
  });
}

const MINUTE = 60_000;
const CLIENT_TTL = 90 * 24 * 60 * MINUTE;

export class OAuthClientRegistry {
  constructor(
    private configured: OAuthClient[],
    private store: OAuthStore,
    private resource: string,
  ) {}
  async get(id: string | null) {
    if (!id || id.length > 200) throw new OAuthError(400, "invalid_client");
    const configured = this.configured.find((c) => c.id === id);
    if (configured) return configured;
    const record = await this.store.get(id, "client");
    const value = record?.value as
      | { resource: string; client: OAuthClient }
      | undefined;
    const client = value?.resource === this.resource ? value.client : undefined;
    if (!client) throw new OAuthError(400, "invalid_client");
    // Retire unused registrations, while keeping cached active client IDs usable.
    if (
      record!.expiresAt.getTime() <
      Date.now() + CLIENT_TTL - 24 * 60 * MINUTE
    )
      await this.store.extendClient(id, new Date(Date.now() + CLIENT_TTL));
    return client;
  }
  async register(input: unknown) {
    const metadata = registrationMetadata(input);
    const client: OAuthClient = {
      id: `dcr_${randomToken()}`,
      name: metadata.client_name,
      redirectUris: metadata.redirect_uris,
      dynamic: true,
    };
    await this.store.put({
      id: client.id,
      kind: "client",
      value: { resource: this.resource, client },
      expiresAt: new Date(Date.now() + CLIENT_TTL),
      used: false,
    });
    return {
      ...metadata,
      client_id: client.id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
  }
}
