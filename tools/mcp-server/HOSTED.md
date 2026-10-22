# Hosted developer MCP

The hosted server exposes all **43 control-plane tools** from the local MCP over
stateless Streamable HTTP at `/mcp`. Registrations and schemas are shared with
stdio. Local stdio retains its two buyer tools; the hosted server has no buyer
inspection, signing, payment approval, or arbitrary URL fetch. The dedicated
`launa_sandbox_wallet` tool returns the prepared Sandbox private key to the AI
client with explicit `sandbox:wallet` consent. Live access and wallet reset are
not available. Treat that tool result as a secret, never telemetry.

This is source prepared for deployment. It does not deploy anything or publish an
npm package. `https://mcp.launa.io/mcp` is the intended plugin endpoint, not evidence
of an active deployment. Confirm the seller frontend origin before provisioning.

## Run

Use Node 22 and pnpm 9.15.9, from the SDK repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @launaio/sdk --filter @launaio/mcp-server build
# Supply the variables in tools/mcp-server/.env.hosted.example through the runtime's secret manager.
pnpm --filter @launaio/mcp-server start:hosted
```

Or build the image from this root:

```sh
docker build -f tools/mcp-server/Dockerfile -t launa-mcp:local .
```

For staging, use `.env.hosted.staging.example`: MCP at
`https://mcp.staging.launa.io`, seller consent at `https://staging.launa.io`,
and backend at `https://api.staging.launa.io`. Deploy the SDK repository's
`staging` branch with build context `/` and Dockerfile
`/tools/mcp-server/Dockerfile`. The image's health check requests the local
listener with the canonical Host header. Disable the deployment platform's
generated HTTP check and use this image check instead.

Required server configuration:

- `MCP_PUBLIC_URL`: canonical HTTPS origin. No path; `/mcp` is the resource.
- `MCP_FRONTEND_URL`: existing seller app origin hosting `/mcp/connect`.
- `LAUNA_BASE_URL`: control-plane origin, routed by its own hostname. Use its
  public HTTPS name (not an internal hostname that needs Host rewriting).
- `MCP_MONGODB_URI`, `MCP_MONGODB_DATABASE`: dedicated database/user. The service
  needs read/write and index creation on its `mcp_oauth` collection.
- `MCP_ENCRYPTION_KEY`: base64 encoding of 32 cryptographically random bytes.
- `MCP_BRIDGE_SECRET`: separate random secret, at least 43 characters; share only
  with the seller BFF. Never expose either secret as `NEXT_PUBLIC_*`.
- `MCP_OAUTH_CLIENTS`: JSON array of `{id, name, redirectUris}`. Only explicit,
  exact callbacks are allowed. The example registers Cursor's documented desktop
  and cloud callbacks. Static registrations retain exact matching. Public dynamic
  registration is available under the restricted policy below.
- `HOST`, `PORT`: defaults `127.0.0.1:3001`; image binds `0.0.0.0` inside the container.

On the seller app, set `MCP_SERVICE_URL` to the hosted public origin,
`MCP_FRONTEND_URL` to the same seller origin, and the matching `MCP_BRIDGE_SECRET`.
Deploy its new `/mcp/connect` page and `/api/mcp/consent` BFF route together.
If these variables are absent only plugin consent is unavailable; ordinary
frontend login continues unchanged.

Terminate TLS at the reverse proxy, **preserve Host**, and restrict direct access
to the listener. Preserve Authorization and WWW-Authenticate. Disable caching and
request/response body logging on all OAuth/MCP/consent paths; redact query strings,
Cookie, Authorization, X-API-Key, and X-Launa-MCP-Bridge in proxy/trace logs. Restrict the
consent bridge route to seller-app egress at the proxy as defense in depth.
The service checks Host and Origin and bounds request bodies, connection headers,
and backend timeouts. Its coarse 300 requests/minute/IP limit sees the actual
socket peer; with a shared proxy, configure a per-client limit at the edge and
capacity-test this shared ceiling before rollout. Never trust arbitrary forwarded
IP headers. Health checks must send the canonical Host to `/healthz`.

## API-key clients

Clients without OAuth can use the same `/mcp` endpoint with a scoped seller API
key. Set **one** header in the client's secure credential settings:

```http
Authorization: Bearer YOUR_LAUNA_API_KEY
```

Alternatively, use `X-API-Key: YOUR_LAUNA_API_KEY`. Do not send both headers,
put keys in URLs, or put real keys into shared configuration or chat messages.
OAuth remains the default for interactive clients and bundled plugins.

`launa_sandbox_...` selects Test mode; `launa_live_...` selects Live mode. Each
request validates the key against the configured control plane's
`GET /auth/api-key` endpoint, including initialization and tool listing. Deploy
that backend endpoint before this MCP version. Validation returns the stored key
environment and scopes; the service rejects a prefix/environment mismatch.
It never accepts a frontend JWT, forwards user-supplied environment headers, caches
the validation, or stores a direct API key in the OAuth database. Backend operations
recheck key revocation, account status, scopes, environment, and tenant ownership.
Tools may be listed even when the key cannot invoke them; insufficient scope is
denied by the backend. Direct keys last until revoked, independently of OAuth's
30-day grant lifetime.

## OAuth authorization and isolation

1. The client discovers protected-resource and authorization-server metadata.
2. Authorization requires a registered callback, exact resource audience and
   authorization-code PKCE with S256.
3. The seller signs in through the existing login, including MFA/passkeys. The
   consent page shows client name, callback address, account, scopes, and test/live selection.
4. The authenticated BFF passes the session only to the trusted service. The
   service verifies it via `/auth/me`, then creates a scoped API key using the
   existing JWT-only API. The session JWT is never persisted or returned to MCP.
5. API keys are AES-256-GCM encrypted with the grant ID as authenticated context.
   Access/code/refresh values are stored only as SHA-256 hashes. Codes expire in
   one minute, requests in ten minutes, access tokens in ten minutes, and grants
   after thirty days. Refresh tokens rotate atomically; reuse revokes the grant.
6. Every HTTP call creates an isolated client/server with the grant's key and
   environment. Backend key revocation, user blocking, scopes and tenant checks
   remain authoritative. Runtime wallet/API-key/sandbox environment variables
   cannot select a hosted tenant or change its environment.

Default scopes cover configuration plus billing/income **reads**; no billing
mutation or payout scope is granted. Clients can request a smaller subset at
initial consent. Tokens cannot broaden or change scope during refresh. Existing
backend scopes enforce operations, including writes; tool visibility is shared.

OAuth revocation immediately deletes the grant, making its access and refresh
tokens unusable. The underlying key is never disclosed to the client and remains
listed as `MCP: <client> (...)` in the selected environment's API-key screen. Users
can revoke that key to deny all backend operations immediately. Backend API keys
currently have no expiry/self-revocation API: after expired/abandoned/OAuth-revoked
grants, remove these unused named keys through the existing API-key UI. A failed
consent persistence attempts to revoke its newly created key using the still-live
session. No background process retains a frontend JWT for cleanup.

Keep database backups and the encryption key separately protected. Rotating the
encryption key invalidates existing encrypted grants; revoke/delete grants and
have users reconnect. Do not restore old grant snapshots into a live instance:
that could restore consumed refresh tokens or revoked access. An account login
or logout does not silently create, extend, or replace an OAuth grant.

## Verification before release

Automated tests cover tool/schema parity, concurrent tenant/environment isolation,
PKCE and audience/client/callback binding, scoped grants, consent/account binding,
code/refresh replay, expiry, revocation, bridge CSRF, body limits, origin/Host
checks, backend error redaction, and frontend login helpers. Run `pnpm build` and
`pnpm test`; the seller app has its own tests/typecheck. Mongo persistence tests
use an explicitly supplied **local-only** `MCP_TEST_MONGODB_URI` and an isolated
random test database, never an existing application database.

Before public rollout, refresh the pinned official Node image against the
[current security releases](https://nodejs.org/en/blog/vulnerability) and rerun
the container smoke test. The Dockerfile pins a reviewed image digest rather than
tracking a floating tag.

Before enabling Cursor: provision a staging host/database, set the registered
origins/callbacks, complete a real Cursor OAuth connection, list a disposable
seller's test APIs, exercise a configuration write, refresh, revoke the named API
key, and verify denial. Repeat with a second tenant and separate live-mode consent.
No paid requests are part of this developer MCP smoke test. Repeat native sign-in
for Claude Code, Codex, Grok Build, and the advertised web/editor integrations.
Automated protocol coverage is not evidence that every native client has passed.

References: [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization),
[Cursor static OAuth configuration](https://cursor.com/docs/mcp).

## Dynamic client registration

`POST /oauth/register` accepts JSON public-client registrations. Metadata advertises
this endpoint so Claude Code, Codex, Grok Build and other MCP clients can discover
it. Portable OpenAI plugins declare `auth.type: oauth` and `client.mode: dcr`.
Only authorization-code/refresh grants and `token_endpoint_auth_method: none` are
accepted. PKCE S256, user consent and resource binding remain mandatory.

Callbacks are restricted to HTTP loopback (`127.0.0.1`, `[::1]`, `localhost`) or
reviewed exact HTTPS callbacks in `src/hosted/registration.ts`: Cursor web, Claude,
ChatGPT with issuer-bound responses, and VS Code. No userinfo, fragment or query
is allowed on loopback redirects. RFC 8252 permits the native loopback port to
change at authorization; host and path stay bound, and the token exchange still
requires the exact redirect used for that authorization. Static clients do not
receive the variable-port exception. No arbitrary client metadata, logo, JWKS or
redirect URI is fetched by the service. Client names are self-reported, not proof
of a verified publisher; consent shows the actual callback address.

Registrations persist in the dedicated Mongo collection, bound to the resource,
and expire after 90 days without use. Active IDs renew at most once per day. A
client retaining an expired ID must remove/re-add its connection. Registration
bodies are limited to 8 KiB and 8 callbacks. A separate 20 attempts/minute global
per-process ceiling bounds registrations in addition to the shared HTTP limit.
Configure stricter abuse controls and shared limits at the edge before public
rollout or adding replicas; restarting a process resets its local rate counter.
CIMD is not advertised or fetched. Web callbacks outside the reviewed list need
explicit review/registration; custom integrations are not a public directory listing.

Client references: [OpenAI OAuth](https://developers.openai.com/plugins/build/auth),
[Claude Code](https://code.claude.com/docs/en/mcp),
[Grok Build](https://docs.x.ai/build/features/mcp-servers),
[VS Code install links](https://code.visualstudio.com/api/extension-guides/ai/mcp),
[Gemini CLI](https://geminicli.com/docs/tools/mcp-server/).

## Sandbox wallet permission

Reconnect older OAuth grants to add `sandbox:wallet`; existing grants are not
silently widened. API-key clients need an explicitly scoped Sandbox key. The
backend enforces scope, account ownership and environment, and returns no-store
responses. MCP also rejects Live before requesting the wallet and validates the
fork network in the returned payload. The existing dashboard JWT flow remains
supported; reset remains JWT-only. Preparing a wallet can fund it on the fork,
so the MCP tool is not marked read-only. This does not authorize spending.

Endpoint creation and OpenAPI import require explicit pricing. Agents should ask
for missing business inputs instead of silently selecting a default charge.
