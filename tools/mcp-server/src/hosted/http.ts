import type { IncomingMessage, ServerResponse } from "node:http";
import { LaunaClient, LaunaError } from "@launaio/sdk";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createMcpServer } from "../server.js";
import { createToolHandlers, type ToolHandlers } from "../tools.js";
import { CONTROL_SCOPES, type HostedConfig } from "./config.js";
import { backendFetch } from "./backend.js";
import { authenticateCredential } from "./authentication.js";
import { equal } from "./crypto.js";
import { OAuthError } from "./errors.js";
import type { OAuthService } from "./oauth.js";

function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage, limit: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit)
      throw new OAuthError(413, "invalid_request", "Request body too large");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function unique(params: URLSearchParams) {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length)
    throw new OAuthError(400, "invalid_request", "Duplicate parameters");
  return params;
}
function bearer(req: IncomingMessage) {
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(
    req.headers.authorization ?? "",
  );
  if (!match || match[1].length > 4096)
    throw new OAuthError(401, "invalid_token");
  return match[1];
}
function safeHandlers(handlers: ToolHandlers): ToolHandlers {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, fn]) => [
      name,
      async (...args: unknown[]) => {
        try {
          return await (fn as (...args: unknown[]) => Promise<unknown>)(
            ...args,
          );
        } catch (error) {
          // Backend errors can contain request data; never echo them to a remote agent.
          throw new Error(
            error instanceof LaunaError
              ? `Launa request rejected (${error.status})`
              : "Launa request failed",
          );
        }
      },
    ]),
  ) as ToolHandlers;
}

type Services = {
  config: HostedConfig;
  oauth: OAuthService;
  fetchFn: typeof fetch;
};
type Rates = Map<string, { count: number; reset: number }>;
const consentSchema = z
  .object({
    request: z.string().length(43),
    consentToken: z.string().length(43),
    environment: z.enum(["development", "production"]),
    approve: z.boolean(),
  })
  .strict();

function requireContentType(req: IncomingMessage, type: string) {
  if (
    req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== type
  ) {
    throw new OAuthError(415, "invalid_request");
  }
}
function validateRequest(
  req: IncomingMessage,
  config: HostedConfig,
  rates: Rates,
) {
  // Never trust client-provided forwarding headers for authority or rate-limit identity.
  if (req.headers.host !== new URL(config.publicUrl).host)
    throw new OAuthError(403, "access_denied");
  if (req.headers.origin && req.headers.origin !== config.frontendUrl)
    throw new OAuthError(403, "access_denied");
  const ip = req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  let rate = rates.get(ip);
  if (!rate || rate.reset <= now) {
    if (rates.size >= 10_000) rates.delete(rates.keys().next().value!);
    rate = { count: 0, reset: now + 60_000 };
    rates.set(ip, rate);
  }
  if (++rate.count > 300) throw new OAuthError(429, "rate_limited");
  const url = new URL(req.url ?? "/", config.publicUrl);
  if (url.origin !== config.publicUrl)
    throw new OAuthError(400, "invalid_request");
  return url;
}
function metadata({ config, oauth }: Services) {
  const resource = {
    resource: oauth.resource,
    authorization_servers: [config.publicUrl],
    scopes_supported: CONTROL_SCOPES,
    bearer_methods_supported: ["header"],
  };
  return new Map<string, unknown>([
    ["/healthz", { status: "ok" }],
    ["/.well-known/oauth-protected-resource/mcp", resource],
    ["/.well-known/oauth-protected-resource", resource],
    [
      "/.well-known/oauth-authorization-server",
      {
        issuer: config.publicUrl,
        authorization_endpoint: `${config.publicUrl}/oauth/authorize`,
        token_endpoint: `${config.publicUrl}/oauth/token`,
        registration_endpoint: `${config.publicUrl}/oauth/register`,
        revocation_endpoint: `${config.publicUrl}/oauth/revoke`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: ["none"],
        revocation_endpoint_auth_methods_supported: ["none"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: CONTROL_SCOPES,
        authorization_response_iss_parameter_supported: true,
      },
    ],
  ]);
}
async function handleConsent(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  { config, oauth }: Services,
) {
  // Only the seller BFF can call this bridge; MCP tokens are not frontend sessions.
  const secret = req.headers["x-launa-mcp-bridge"];
  if (typeof secret !== "string" || !equal(secret, config.bridgeSecret))
    throw new OAuthError(403, "access_denied");
  const session = bearer(req);
  if (req.method === "GET")
    return json(
      res,
      200,
      await oauth.consentInfo(
        unique(url.searchParams).get("request") ?? "",
        session,
      ),
    );
  if (req.method !== "POST") throw new OAuthError(405, "method_not_allowed");
  requireContentType(req, "application/json");
  const input = consentSchema.parse(JSON.parse(await body(req, 4096)));
  json(res, 200, { redirect: await oauth.consent(input, session) });
}
async function authenticateMcp(
  req: IncomingMessage,
  res: ServerResponse,
  { config, oauth, fetchFn }: Services,
) {
  try {
    return await authenticateCredential(req, config, oauth, fetchFn);
  } catch {
    res.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource/mcp", scope="${CONTROL_SCOPES.join(" ")}"`,
    );
    throw new OAuthError(401, "invalid_token");
  }
}
async function handleMcp(
  req: IncomingMessage,
  res: ServerResponse,
  services: Services,
) {
  const { environment, apiKey } = await authenticateMcp(req, res, services);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    throw new OAuthError(405, "method_not_allowed");
  }
  requireContentType(req, "application/json");
  const parsed = JSON.parse(await body(req, 2 * 1024 * 1024));
  if (Array.isArray(parsed))
    throw new OAuthError(
      400,
      "invalid_request",
      "Batched requests are not supported",
    );
  const client = new LaunaClient({
    baseUrl: services.config.backendUrl,
    apiKey,
    environment,
    fetch: backendFetch(services.config, services.fetchFn),
  });
  const server = createMcpServer(
    safeHandlers(
      createToolHandlers(() => client, {
        sandbox: environment === "development",
      }),
    ),
    { buyerTools: false },
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  // A fresh server per HTTP request prevents state or credentials crossing tenant boundaries.
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsed);
  } finally {
    await server.close();
  }
}
async function routeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  services: Services,
) {
  const { oauth } = services;
  const path = url.pathname;
  const publicResponse =
    req.method === "GET" ? metadata(services).get(path) : undefined;
  if (publicResponse) return json(res, 200, publicResponse);
  if (req.method === "POST" && path === "/oauth/register") {
    requireContentType(req, "application/json");
    return json(
      res,
      201,
      await oauth.register(JSON.parse(await body(req, 8192))),
    );
  }
  if (req.method === "GET" && path === "/oauth/authorize") {
    res.writeHead(302, {
      Location: await oauth.authorize(unique(url.searchParams)),
    });
    res.end();
    return;
  }
  if (
    req.method === "POST" &&
    (path === "/oauth/token" || path === "/oauth/revoke")
  ) {
    requireContentType(req, "application/x-www-form-urlencoded");
    const params = unique(new URLSearchParams(await body(req, 16_384)));
    if (path === "/oauth/revoke") {
      await oauth.revoke(params);
      return json(res, 200, {});
    }
    return json(res, 200, await oauth.token(params));
  }
  if (path === "/oauth/consent") return handleConsent(req, res, url, services);
  if (path === "/mcp") return handleMcp(req, res, services);
  json(res, 404, { error: "not_found" });
}
function errorResponse(res: ServerResponse, error: unknown) {
  if (res.headersSent) {
    res.end();
    return;
  }
  const expected = error instanceof OAuthError;
  const malformed = error instanceof SyntaxError || error instanceof z.ZodError;
  if (expected && error.status === 429) res.setHeader("Retry-After", "60");
  json(res, expected ? error.status : malformed ? 400 : 500, {
    error: expected
      ? error.code
      : malformed
        ? "invalid_request"
        : "server_error",
  });
}
export function createHttpHandler(
  config: HostedConfig,
  oauth: OAuthService,
  fetchFn: typeof fetch = fetch,
) {
  const rates: Rates = new Map();
  const services = { config, oauth, fetchFn };
  let registrations = { count: 0, reset: 0 };
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    try {
      const url = validateRequest(req, config, rates);
      if (req.method === "POST" && url.pathname === "/oauth/register") {
        // A global per-process budget also bounds storage when behind a proxy.
        if (registrations.reset <= Date.now())
          registrations = { count: 0, reset: Date.now() + 60_000 };
        if (++registrations.count > 20)
          throw new OAuthError(429, "rate_limited");
      }
      await routeRequest(req, res, url, services);
    } catch (error) {
      errorResponse(res, error);
    }
  };
}
