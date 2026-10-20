---
status: accepted
date: 2026-10-20
supersedes:
  - 0001-hosted-mcp-isolated-oauth.md
---

# Hosted MCP supports restricted public OAuth registration with isolated grants

The hosted developer MCP shares control-plane registrations with stdio, but does
not expose local buyer inspection or wallet signing. Each request constructs a
fresh MCP server and SDK client using one grant's account and environment.

OAuth sessions are separate from frontend sessions. After explicit browser
consent, the existing JWT-authenticated API creates a scoped API key. The hosted
service stores the key encrypted and issues opaque, audience-bound tokens with
PKCE, short access lifetimes, and single-use refresh rotation. This preserves the
existing backend JWT validation and frontend login behavior. Static registration
remains available for Cursor. Restricted public dynamic registration supports
other clients without arbitrary metadata fetches: reviewed exact web callbacks
or native loopback callbacks only, with the RFC 8252 port exception. Names are
self-reported and consent displays the callback address. Persisted registrations
expire after 90 inactive days; active IDs renew. Registration is separately rate
limited, and a public rollout requires edge abuse controls. CIMD is not enabled.

This requires a protected encryption key, dedicated durable grant storage and a
trusted consent BFF. Existing API-key revocation remains authoritative for backend
operations. OAuth revocation deletes the grant; unused backend keys must currently
be removed through the account's API-key controls because backend API keys do not
have an expiry or self-revocation API. Moving OAuth issuance into backend account
authentication would remove this cleanup tradeoff but would couple a new public
authentication surface to the existing frontend session path.
