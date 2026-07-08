# Ax402 Webflow plugin

Hybrid Webflow app: Designer Extension wizard + DevLink paywall component + OAuth backend.

## Components

| Directory | Purpose |
|-----------|---------|
| `devlink/` | DevLink library — `declareComponent` wrapping `@axlabs/x402-buyer-plugin-react` |
| `designer-extension/` | Designer iframe wizard — attach config to canvas elements |
| `backend/` | OAuth server for Webflow Data API (custom code scopes) |

## DevLink import

```bash
cd plugins/webflow/devlink
pnpm install
# Authenticate: WEBFLOW_WORKSPACE_API_TOKEN in .env
webflow devlink import
```

Drag **Ax402 Paywall** from the library onto the canvas. Each instance embeds its own `PaywallProvider` (isolated React root).

## Designer Extension

```bash
cd plugins/webflow/designer-extension
pnpm install
pnpm dev
```

Open from Webflow Designer → Apps → Ax402 Paywall. Use the wizard, then **Attach config to selected element** or insert the DevLink component.

## OAuth backend (marketplace)

```bash
cd plugins/webflow/backend
cp .env.example .env
pnpm dev
```

Visit `http://localhost:3002/oauth/start` to authorize `custom_code:read` / `custom_code:write`.

## Buyer flow

Buyers pay at the configured gateway URL via x402. No seller API keys in the browser plugin.

See [CORS guide](../shared/docs/cors.md).
