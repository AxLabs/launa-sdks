#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROUTER="$ROOT/../ax402-backend/internal/admin/router.go"
OPENAPI="$ROOT/openapi/control-plane.yaml"

if [[ ! -f "$ROUTER" ]]; then
  echo "router not found: $ROUTER" >&2
  exit 1
fi

# Expected routes from ax402-backend router (method + chi path pattern)
EXPECTED=(
  "POST /auth/signup"
  "POST /auth/login"
  "POST /auth/logout"
  "POST /auth/verify-email"
  "GET /config/platform"
  "GET /auth/me"
  "POST /auth/resend-verification"
  "PUT /auth/password"
  "GET /auth/scopes"
  "GET /auth/api-keys"
  "POST /auth/api-keys"
  "DELETE /auth/api-keys/{keyID}"
  "GET /domains/suggest"
  "GET /stats/overview"
  "POST /openapi/parse"
  "GET /supported-networks"
  "GET /apis"
  "POST /apis"
  "GET /apis/{apiID}"
  "PUT /apis/{apiID}"
  "DELETE /apis/{apiID}"
  "GET /apis/{apiID}/endpoints"
  "POST /apis/{apiID}/endpoints"
  "POST /apis/{apiID}/openapi/import"
  "PUT /apis/{apiID}/endpoints/{endpointID}"
  "DELETE /apis/{apiID}/endpoints/{endpointID}"
  "GET /apis/{apiID}/domains"
  "POST /apis/{apiID}/domains"
  "DELETE /apis/{apiID}/domains/{domainID}"
  "POST /apis/{apiID}/domains/{domainID}/verify"
  "GET /apis/{apiID}/settlements"
  "GET /apis/{apiID}/batch-settlements"
  "GET /apis/{apiID}/stats"
  "POST /auth/onboarding/complete"
)

missing=0
for entry in "${EXPECTED[@]}"; do
  method="${entry%% *}"
  path="${entry#* }"
  if ! grep -qF "  ${path}:" "$OPENAPI"; then
    echo "MISSING in OpenAPI: $method $path" >&2
    missing=$((missing + 1))
  fi
done

if [[ $missing -gt 0 ]]; then
  echo "contract check failed: $missing missing path(s)" >&2
  exit 1
fi

echo "contract check passed (${#EXPECTED[@]} routes)"
