# @axlabs/x402-react-paywall

Embeddable React overlay for x402 micropayments (pay-per-fetch). Pairs with an x402 **seller** (e.g. [ax402-backend](https://github.com/AxLabs/ax402-backend)) and wallet signing via `@x402/fetch`.

## Documentation

**End users:** Ax402 site — [/docs/react-paywall](https://github.com/AxLabs/ax402-frontend) (getting started, theming, examples).

**Package contributors:** [docs/README.md](./docs/README.md)

| Topic | Link |
|-------|------|
| Getting started | [docs/getting-started.md](./docs/getting-started.md) |
| Components | [docs/components.md](./docs/components.md) |
| Theming & branding | [docs/theming.md](./docs/theming.md) |
| Custom UI | [docs/custom-ui.md](./docs/custom-ui.md) |
| Examples | [docs/examples.md](./docs/examples.md) |
| Policy | [docs/policy.md](./docs/policy.md) |
| AI agents | [docs/agents.md](./docs/agents.md) |

## Install

```bash
pnpm add @axlabs/x402-react-paywall @x402/fetch @x402/evm viem react react-dom
```

## Quick start

```tsx
import '@axlabs/x402-react-paywall/styles.css'
import { PaywallProvider, PaywallGate } from '@axlabs/x402-react-paywall'

export function ArticlePage() {
  return (
    <PaywallProvider
      policy={{ preferredNetworks: 'eip155:84532' }}
      appearance={{
        theme: { accent: '#2563eb' },
        labels: { payToRead: 'Unlock' },
      }}
    >
      <PaywallGate resourceUrl="https://echo.staging.ax402.io/echo/get?test=1">
        <p className="teaser">Preview…</p>
      </PaywallGate>
    </PaywallProvider>
  )
}
```

## Customization

- **`appearance.theme`** — CSS variables (`--x402-accent`, …)
- **`appearance.brand`** — logo / header in the overlay card
- **`appearance.labels`** — button and picker copy
- **`appearance.classNames`** — Tailwind or your BEM hooks
- **`renderLockedOverlay`** — replace the default card entirely

See [Theming & branding](./docs/theming.md).

## Local demo

```bash
cd ax402-paywall-demo && make demo
```

## Server paywall alternative

For full-page Next.js protection, use [`@x402/paywall`](https://www.npmjs.com/package/@x402/paywall). This package is for **in-app** SPA overlays.
