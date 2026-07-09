# React paywall

Embeddable React overlay for x402 micropayments (pay-per-fetch). Works with any x402 gateway and wallet signing via `@x402/fetch`.

Docs: [getting started](./getting-started.md) · [examples](./examples.md) · [ax402.io/docs/react-paywall](https://ax402.io/docs/react-paywall)

## Install

```bash
pnpm add @ax402/react-paywall @x402/fetch @x402/evm viem
```

## Minimal usage

```tsx
import { PaywallProvider, PaywallGate } from "@ax402/react-paywall";

export function App() {
  return (
    <PaywallProvider>
      <PaywallGate
        resourceUrl="https://my-api.ax402.io/v1/echo?test=1"
        title="Unlock content"
      />
    </PaywallProvider>
  );
}
```

## Dev

```bash
pnpm --filter @ax402/react-paywall build
```
