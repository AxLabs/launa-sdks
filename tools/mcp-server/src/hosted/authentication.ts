import type { IncomingMessage } from "node:http";
import { z } from "zod";
import { backendFetch } from "./backend.js";
import type { HostedConfig } from "./config.js";
import { OAuthError } from "./errors.js";
import type { OAuthService } from "./oauth.js";

const keyIdentity = z.object({
  environment: z.enum(["development", "production"]),
  scopes: z.array(z.string()),
});

/** Accept exactly one explicit credential. Never use cookies or query parameters. */
function credential(req: IncomingMessage) {
  const headerNames = req.rawHeaders.filter((_, index) => index % 2 === 0);
  const count = headerNames.filter((name) =>
    ["authorization", "x-api-key"].includes(name.toLowerCase()),
  ).length;
  if (count !== 1) throw new OAuthError(401, "invalid_token");
  const key = req.headers["x-api-key"];
  if (typeof key === "string") {
    if (!/^launa_(live|sandbox)_[a-f0-9]{48}$/.test(key))
      throw new OAuthError(401, "invalid_token");
    return key;
  }
  const match = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/i.exec(
    req.headers.authorization ?? "",
  );
  if (!match) throw new OAuthError(401, "invalid_token");
  return match[1];
}

export async function authenticateCredential(
  req: IncomingMessage,
  config: HostedConfig,
  oauth: OAuthService,
  fetchFn: typeof fetch,
) {
  const token = credential(req);
  if (!token.startsWith("launa_")) {
    const { grant, apiKey } = await oauth.authenticate(token);
    return { environment: grant.environment, apiKey };
  }
  const match = /^launa_(live|sandbox)_[a-f0-9]{48}$/.exec(token);
  if (!match) throw new OAuthError(401, "invalid_token");
  // Validate on every request, including initialize/tools/list. Do not cache
  // credentials or forward client-supplied routing/environment headers.
  const response = await backendFetch(config, fetchFn)(
    config.backendUrl + "/auth/api-key",
    { headers: { "X-API-Key": token, Accept: "application/json" } },
  );
  if (!response.ok) throw new OAuthError(401, "invalid_token");
  const identity = keyIdentity.parse(await response.json());
  const expected = match[1] === "sandbox" ? "development" : "production";
  if (identity.environment !== expected)
    throw new OAuthError(401, "invalid_token");
  // The control plane rechecks scopes and tenant ownership on every operation.
  return { environment: identity.environment, apiKey: token };
}
