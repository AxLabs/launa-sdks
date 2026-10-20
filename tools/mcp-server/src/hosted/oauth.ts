import { createHmac } from "node:crypto";
import {
  CONTROL_SCOPES,
  type HostedConfig,
  type Environment,
} from "./config.js";
import { encrypt, decrypt, equal, hash, randomToken } from "./crypto.js";
import { OAuthError } from "./errors.js";
import type { OAuthStore } from "./store.js";
import type { SellerBackend } from "./backend.js";

const MINUTE = 60_000;
const GRANT_TTL = 30 * 24 * 60 * MINUTE;
interface Authorization {
  resource: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
  scopes: string[];
}
export interface Grant {
  id: string;
  resource: string;
  userId: string;
  clientId: string;
  environment: Environment;
  scopes: string[];
  keyId: string;
  encryptedKey: string;
  expiresAt: number;
}
interface Code extends Authorization {
  grantId: string;
}
interface Token {
  grantId: string;
  clientId: string;
}
const invalid = () => new OAuthError(400, "invalid_grant");

export class OAuthService {
  readonly resource: string;
  constructor(
    readonly config: HostedConfig,
    private store: OAuthStore,
    private backend: SellerBackend,
  ) {
    this.resource = `${config.publicUrl}/mcp`;
  }
  private put(id: string, kind: string, value: unknown, expiresAt: number) {
    return this.store.put({
      id,
      kind,
      value,
      expiresAt: new Date(expiresAt),
      used: false,
    });
  }
  private validateResource(value: string | null) {
    if (value !== this.resource) throw new OAuthError(400, "invalid_target");
  }
  private client(id: string | null) {
    const client = this.config.clients.find((c) => c.id === id);
    if (!client) throw new OAuthError(400, "invalid_client");
    return client;
  }
  async authorize(params: URLSearchParams) {
    const client = this.client(params.get("client_id"));
    const redirectUri = params.get("redirect_uri") ?? "";
    if (!client.redirectUris.includes(redirectUri))
      throw new OAuthError(400, "invalid_request", "Unregistered redirect URI");
    this.validateResource(params.get("resource"));
    const challenge = params.get("code_challenge") ?? "";
    if (
      params.get("response_type") !== "code" ||
      params.get("code_challenge_method") !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge)
    )
      throw new OAuthError(
        400,
        "invalid_request",
        "Authorization code with S256 PKCE required",
      );
    const scopes = (params.get("scope") ?? CONTROL_SCOPES.join(" ")).split(" ");
    if (
      !scopes.length ||
      new Set(scopes).size !== scopes.length ||
      scopes.some((s) => !(CONTROL_SCOPES as readonly string[]).includes(s))
    ) {
      throw new OAuthError(400, "invalid_scope");
    }
    const state = params.get("state") ?? "";
    if (state.length > 1024) throw new OAuthError(400, "invalid_request");
    const requestId = randomToken();
    await this.put(
      hash(requestId),
      "authorization",
      {
        resource: this.resource,
        clientId: client.id,
        redirectUri,
        challenge,
        state,
        scopes,
      } satisfies Authorization,
      Date.now() + 10 * MINUTE,
    );
    return `${this.config.frontendUrl}/mcp/connect?request=${encodeURIComponent(requestId)}`;
  }
  private async pending(requestId: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(requestId)) throw invalid();
    const record = await this.store.get(hash(requestId), "authorization");
    if (!record || record.used) throw invalid();
    const pending = record.value as Authorization;
    if (pending.resource !== this.resource) throw invalid();
    return pending;
  }
  private consentToken(requestId: string, userId: string) {
    return createHmac("sha256", this.config.bridgeSecret)
      .update(JSON.stringify([requestId, userId]))
      .digest("base64url");
  }
  async consentInfo(requestId: string, session: string) {
    const pending = await this.pending(requestId);
    const user = await this.backend.user(session);
    return {
      client: this.client(pending.clientId).name,
      email: user.email,
      scopes: pending.scopes,
      consentToken: this.consentToken(requestId, user.id),
    };
  }
  async consent(
    input: {
      request: string;
      consentToken: string;
      environment: Environment;
      approve: boolean;
    },
    session: string,
  ) {
    const pending = await this.pending(input.request);
    const user = await this.backend.user(session);
    if (!equal(input.consentToken, this.consentToken(input.request, user.id)))
      throw new OAuthError(403, "access_denied");
    const claimed = await this.store.consume(
      hash(input.request),
      "authorization",
    );
    if (!claimed) throw invalid();
    const redirect = new URL(pending.redirectUri);
    redirect.searchParams.set("state", pending.state);
    redirect.searchParams.set("iss", this.config.publicUrl);
    if (!input.approve) {
      redirect.searchParams.set("error", "access_denied");
      return redirect.href;
    }
    if (
      input.environment !== "development" &&
      input.environment !== "production"
    )
      throw new OAuthError(400, "invalid_request");
    const grantId = randomToken();
    const key = await this.backend.createKey(
      session,
      input.environment,
      pending.scopes,
      `MCP: ${this.client(pending.clientId).name} (${grantId.slice(0, 8)})`,
    );
    try {
      const grant: Grant = {
        id: grantId,
        resource: this.resource,
        userId: user.id,
        clientId: pending.clientId,
        environment: input.environment,
        scopes: pending.scopes,
        keyId: key.id,
        encryptedKey: encrypt(key.key, this.config.encryptionKey, grantId),
        expiresAt: Date.now() + GRANT_TTL,
      };
      await this.put(grantId, "grant", grant, grant.expiresAt);
      const code = randomToken();
      await this.put(
        hash(code),
        "code",
        { ...pending, grantId } satisfies Code,
        Date.now() + MINUTE,
      );
      redirect.searchParams.set("code", code);
      return redirect.href;
    } catch (error) {
      await this.store.remove(grantId, "grant").catch(() => {});
      // Best-effort rollback; the named key remains revocable in the account if backend is down.
      await this.backend
        .revokeKey(session, input.environment, key.id)
        .catch(() => {});
      throw error;
    }
  }
  private async grant(id: string) {
    const record = await this.store.get(id, "grant");
    if (!record) throw invalid();
    const grant = record.value as Grant;
    if (grant.expiresAt <= Date.now() || grant.resource !== this.resource)
      throw invalid();
    return grant;
  }
  private async issue(grant: Grant) {
    const access = randomToken();
    const refresh = randomToken();
    const value: Token = { grantId: grant.id, clientId: grant.clientId };
    try {
      await this.put(
        hash(access),
        "access",
        value,
        Math.min(Date.now() + 10 * MINUTE, grant.expiresAt),
      );
      await this.put(hash(refresh), "refresh", value, grant.expiresAt);
    } catch (error) {
      await this.store.remove(grant.id, "grant");
      throw error;
    }
    return {
      access_token: access,
      token_type: "Bearer",
      expires_in: Math.min(
        600,
        Math.floor((grant.expiresAt - Date.now()) / 1000),
      ),
      refresh_token: refresh,
      scope: grant.scopes.join(" "),
    };
  }
  private validateScope(params: URLSearchParams, scopes: string[]) {
    if (
      params.has("scope") &&
      params.get("scope")!.split(" ").sort().join(" ") !==
        [...scopes].sort().join(" ")
    ) {
      throw new OAuthError(400, "invalid_scope");
    }
  }
  async token(params: URLSearchParams) {
    const client = this.client(params.get("client_id"));
    this.validateResource(params.get("resource"));
    const type = params.get("grant_type");
    if (type === "authorization_code") {
      const codeId = hash(params.get("code") ?? "");
      const record = await this.store.get(codeId, "code");
      const code = record?.value as Code | undefined;
      const verifier = params.get("code_verifier") ?? "";
      if (
        !code ||
        code.resource !== this.resource ||
        code.clientId !== client.id ||
        code.redirectUri !== params.get("redirect_uri") ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        !equal(hash(verifier), code.challenge)
      )
        throw invalid();
      this.validateScope(params, code.scopes);
      if (!(await this.store.consume(codeId, "code"))) {
        await this.store.remove(code.grantId, "grant");
        throw invalid();
      }
      return this.issue(await this.grant(code.grantId));
    }
    if (type === "refresh_token") {
      const tokenId = hash(params.get("refresh_token") ?? "");
      const record = await this.store.get(tokenId, "refresh");
      const token = record?.value as Token | undefined;
      if (!token || token.clientId !== client.id) throw invalid();
      const grant = await this.grant(token.grantId);
      this.validateScope(params, grant.scopes);
      if (!(await this.store.consume(tokenId, "refresh"))) {
        // Retain consumed refresh hashes until the grant expires to detect theft/replay.
        await this.store.remove(token.grantId, "grant");
        throw invalid();
      }
      return this.issue(await this.grant(token.grantId));
    }
    throw new OAuthError(400, "unsupported_grant_type");
  }
  async authenticate(accessToken: string) {
    const record = await this.store.get(hash(accessToken), "access");
    if (!record) throw new OAuthError(401, "invalid_token");
    try {
      const grant = await this.grant((record.value as Token).grantId);
      return {
        grant,
        apiKey: decrypt(
          grant.encryptedKey,
          this.config.encryptionKey,
          grant.id,
        ),
      };
    } catch {
      throw new OAuthError(401, "invalid_token");
    }
  }
  async revoke(params: URLSearchParams) {
    const client = this.client(params.get("client_id"));
    const id = hash(params.get("token") ?? "");
    const record =
      (await this.store.get(id, "refresh")) ??
      (await this.store.get(id, "access"));
    const token = record?.value as Token | undefined;
    if (token?.clientId === client.id) {
      const record = await this.store.get(token.grantId, "grant");
      if ((record?.value as Grant | undefined)?.resource === this.resource)
        await this.store.remove(token.grantId, "grant");
    }
  }
}
