# CLI

Binary: `ax402` in `tools/cli/`.

Run from the **ax402-sdk** repository root.

## Build

```bash
pnpm --filter @axlabs/ax402-cli build
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL |
| `AX402_API_KEY` | Scoped API key |
| `AX402_EVM_PRIVATE_KEY` | `pay url` command |

## Examples

```bash
ax402 apis list --json
ax402 endpoints create --api-id ID --method GET --path "/v1/data" --price-usdc 0.01 --json
ax402 pay url https://myapi.localhost:8090/v1/data
```

Exit codes: 0 success, 1 API error, 2 usage error.
