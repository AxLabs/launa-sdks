---
status: accepted
date: 2026-10-20
---

# Hosted MCP also accepts directly supplied scoped API keys

Some automation clients cannot complete browser OAuth. The hosted `/mcp` resource
therefore accepts either a Launa API key or an opaque OAuth access token in the
Bearer header, and alternatively accepts an API key in `X-API-Key`. Ambiguous or
duplicate credential headers are rejected. Cookies and query parameters are not
credentials. OAuth remains the default for plugins and interactive clients.

Direct keys are validated on every HTTP request through the configured control
plane's read-only key identity endpoint. The backend remains authoritative for
account status, revocation, scopes and tenant ownership. The returned environment
must match the key prefix. Requests never accept an environment override or
persist/cache a direct key. Using a scoped resource endpoint for validation was
rejected because it would require unrelated read permissions for analytics-only
or other restricted keys. This adds a backend round trip per direct-key request
but ensures revoked keys cannot even initialize a new MCP connection.

OAuth issuance, frontend sessions, callbacks and existing grant isolation stay
as described in decision 0002. This change does not expose buyer or wallet tools.
