# Getting started

## Install

```bash
pnpm add @launaio/react-paywall @x402/fetch @x402/evm viem react react-dom
```

Peer dependencies: **React 18+** and a wallet (browser extension) or `privateKey` for headless signing.

## Import styles

Default UI uses BEM classes and CSS variables. Import once at your app entry:

```tsx
import '@launaio/react-paywall/styles.css'
```

You can skip this import only if you use `appearance.unstyled` and supply your own CSS for every slot (see [Custom UI](./custom-ui.md)).

## Minimal integration

1. Wrap your app (or route) in `PaywallProvider`.
2. Set `policy` so the client only signs payments you support (network + asset).
3. Wrap paid content in `PaywallGate` with the **same URL** your backend/gateway protects.

```tsx
import { PaywallProvider, PaywallGate } from '@launaio/react-paywall'

export function ArticleRoute() {
  return (
    <PaywallProvider
      policy={{
        preferredNetworks: 'eip155:8453',
        allowedAssets: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      }}
      rpc={{ defaultUrl: 'https://mainnet.base.org' }}
    >
      <PaywallGate
        resourceUrl="https://my-api.launa.io/v1/echo?test=1"
        title="Unlock full article"
        description="One-time micropayment via x402."
      >
        <p>The first paragraph is visible as a blurred teaser…</p>
      </PaywallGate>
    </PaywallProvider>
  )
}
```

## What happens

1. On mount, `PaywallGate` **inspects** `resourceUrl` (plain `fetch`).
2. **402** → overlay shows price (from `accepts`) and wallet actions.
3. User connects wallet → **Pay to read** → `@x402/fetch` signs and retries.
4. **200** → teaser is replaced with the paid response body.

## CORS in local dev

Browsers block cross-origin **402** responses without `Access-Control-Allow-Origin`. Options:

- Proxy gateway requests through your dev server (configure your bundler's dev proxy to forward `/gateway` to your gateway origin).
- Or host the SPA on the same origin as the gateway.

## Headless / testing

Pass `privateKey` to `PaywallProvider` (env only, never commit):

```tsx
<PaywallProvider privateKey={import.meta.env.VITE_SIGNER_KEY} policy={…} />
```

No wallet UI is shown; signing uses the key directly.

## Next steps

- [Theming & branding](./theming.md) — match your product
- [Components](./components.md) — full API
- [Examples](./examples.md) — branded themes, custom overlay, programmatic unlock
