# Launa Framer plugin

Buyer-side Framer plugin — configure gateway URL and policy, then insert a paywall code component on the canvas.

## Structure

- `plugin/` — Framer editor app (wizard UI)
- `component/` — Framer code component with `addPropertyControls`

## Development

```bash
cd plugins/framer/plugin
pnpm install
pnpm dev
```

In Framer: enable **Developer Tools** → **Open Development Plugin**.

## Usage

1. Open the Launa Paywall plugin in Framer.
2. Configure gateway URL and policy in the wizard tabs.
3. Click **Insert paywall on canvas** — creates/updates `LaunaPaywall.tsx` and adds an instance.
4. Fine-tune props in the Framer properties panel.

## Runtime

Buyers pay via x402 at the configured gateway URL. No seller API keys in the plugin.

See [shared CORS guide](../../shared/docs/cors.md) for local development.
