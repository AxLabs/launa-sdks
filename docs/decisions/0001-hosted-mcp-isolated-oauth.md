---
status: superseded
superseded_by: 0002-hosted-mcp-client-registration.md
date: 2026-10-20
---

# Hosted MCP uses isolated OAuth grants over scoped seller API keys

The hosted developer MCP shares control-plane registrations with stdio, but does
not expose local buyer inspection or wallet signing. Each request constructs a
fresh MCP server and SDK client using one grant's account and environment.

OAuth sessions are separate from frontend sessions. After explicit browser
consent, the existing JWT-authenticated API creates a scoped API key. The hosted
service stores the key encrypted and issues opaque, audience-bound tokens with
PKCE, short access lifetimes, and single-use refresh rotation. This preserves the
existing backend JWT validation and frontend login behavior. Static registration
avoids arbitrary metadata fetches and limits callbacks to reviewed clients.

This requires a protected encryption key, dedicated durable grant storage and a
trusted consent BFF. Existing API-key revocation remains authoritative for backend
operations. OAuth revocation deletes the grant; unused backend keys must currently
be removed through the account's API-key controls because backend API keys do not
have an expiry or self-revocation API. Moving OAuth issuance into backend account
authentication would remove this cleanup tradeoff but would couple a new public
authentication surface to the existing frontend session path.
