import { vi } from "vitest";
import { OAuthService } from "./oauth.js";
import type { HostedConfig } from "./config.js";
import { hash } from "./crypto.js";
import type { OAuthStore, RecordValue } from "./store.js";
import type { SellerBackend } from "./backend.js";

export class MemoryStore implements OAuthStore {
  records = new Map<string, RecordValue>();
  async put(record: RecordValue) {
    if (this.records.has(`${record.kind}:${record.id}`))
      throw new Error("Duplicate record");
    this.records.set(`${record.kind}:${record.id}`, structuredClone(record));
  }
  async get(id: string, kind: string) {
    const record = this.records.get(`${kind}:${id}`);
    return record && record.expiresAt.getTime() > Date.now()
      ? structuredClone(record)
      : null;
  }
  async consume(id: string, kind: string) {
    const record = this.records.get(`${kind}:${id}`);
    if (!record || record.used || record.expiresAt.getTime() <= Date.now())
      return null;
    record.used = true;
    return structuredClone(record);
  }
  async remove(id: string, kind: string) {
    this.records.delete(`${kind}:${id}`);
  }
  async extendClient(id: string, expiresAt: Date) {
    const record = this.records.get(`client:${id}`);
    if (record && record.expiresAt.getTime() > Date.now())
      record.expiresAt = new Date(
        Math.max(record.expiresAt.getTime(), expiresAt.getTime()),
      );
  }
}
export const config: HostedConfig = {
  publicUrl: "https://mcp.example.com",
  frontendUrl: "https://app.example.com",
  backendUrl: "https://api.example.com",
  encryptionKey: Buffer.alloc(32, 7),
  bridgeSecret: "test-only-bridge-secret".repeat(3),
  clients: [
    {
      id: "cursor",
      name: "Cursor",
      redirectUris: ["http://localhost:8787/callback"],
    },
    {
      id: "other",
      name: "Other",
      redirectUris: ["https://other.example.com/callback"],
    },
  ],
};
export const verifier = "test-only-verifier".repeat(4);
export function fixture(overrides: Partial<HostedConfig> = {}) {
  const store = new MemoryStore();
  const backend = {
    user: vi.fn(async (session: string) => ({
      id: session,
      email: `${session}@example.com`,
    })),
    createKey: vi.fn(async (session: string, env: string) => ({
      id: `id-${session}`,
      key: `test-only-key-${session}-${env}`,
    })),
    revokeKey: vi.fn(async () => {}),
  };
  const oauth = new OAuthService(
    { ...config, ...overrides },
    store,
    backend as unknown as SellerBackend,
  );
  const authorize = () =>
    new URLSearchParams({
      client_id: "cursor",
      redirect_uri: config.clients[0].redirectUris[0],
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: hash(verifier),
      resource: oauth.resource,
      state: "client-state",
    });
  async function connect(
    user = "alice",
    environment: "development" | "production" = "development",
  ) {
    const location = await oauth.authorize(authorize());
    const request = new URL(location).searchParams.get("request")!;
    const info = await oauth.consentInfo(request, user);
    const callback = new URL(
      await oauth.consent(
        {
          request,
          consentToken: info.consentToken,
          environment,
          approve: true,
        },
        user,
      ),
    );
    const exchange = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "cursor",
      redirect_uri: config.clients[0].redirectUris[0],
      resource: oauth.resource,
      code: callback.searchParams.get("code")!,
      code_verifier: verifier,
    });
    return {
      exchange,
      request,
      info,
      callback,
      tokens: await oauth.token(exchange),
    };
  }
  return { store, backend, oauth, authorize, connect };
}
