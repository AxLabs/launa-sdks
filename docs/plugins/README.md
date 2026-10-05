# Launa buyer CMS plugins

Buyer-side plugins wrap `@axlabs/x402-react-paywall` and route payments through **Launa gateway URLs**. They do **not** call the control plane or hold seller API keys.

## Packages

| Plugin | Path | Install surface |
|--------|------|-----------------|
| Shared config | [shared/](shared/) | `@axlabs/x402-buyer-plugin-core` |
| React wrapper | [buyer-react/](buyer-react/) | `@axlabs/x402-buyer-plugin-react` |
| Editor wizard UI | [editor-ui/](editor-ui/) | `@axlabs/x402-buyer-plugin-editor-ui` |
| Payload CMS | [payload/](payload/) | `@axlabs/launa-payload` |
| Framer | [framer/](framer/) | Framer Marketplace plugin + code component |
| Webflow | [webflow/](webflow/) | DevLink library + Designer Extension |

## Buyer flow

```
Editor configures resourceUrl + policy
  → Published site renders paywall component
  → Browser inspects gateway URL (402)
  → Wallet signs x402 payment
  → Gateway verifies/settle → content unlocked
```

## CORS

Browser plugins require CORS on gateway 402/200 responses. See [shared/docs/cors.md](shared/docs/cors.md).

## Staging smoke test

Use gateway URL:

```
https://echo.staging.launa.io/echo/get?test=1
```

Policy: `preferredNetworks: eip155:84532`, Base Sepolia testnet USDC + wallet.

## Per-plugin guides

- [Payload README](payload/README.md)
- [Framer README](framer/README.md)
- [Webflow README](webflow/README.md)
