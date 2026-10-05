# AI agents

While content is locked, `PaywallGate` exposes machine-readable payment hints for crawlers and LLM agents.

## What is rendered

| Artifact | Purpose |
|----------|---------|
| `#x402-agent-instructions` | Visible steps for agents |
| `#x402-agent-manifest` | JSON (`type="application/json"`) |
| `<meta name="x402:resource">` | Protected URL |
| `<meta name="x402:protected">` | `true` |

Agents should **not** click “Connect wallet”. They should use `@x402/fetch` or launa buyer SDKs with an EVM signer.

## Customize copy

```tsx
<PaywallGate
  resourceUrl={url}
  agentInstructions="This API requires x402. Use @x402/fetch with Base USDC."
  appearance={{ labels: { agentTitle: 'x402 API access' } }}
/>
```

Disable: `agentDiscovery={false}`.

## Manifest shape

```json
{
  "protocol": "x402",
  "role": "buyer-instructions",
  "message": "…",
  "resource": { "url": "https://…", "method": "GET" },
  "access": {
    "unpaidHttpStatus": 402,
    "flow": ["GET …", "If 402 …", "…"],
    "clientLibraries": ["@x402/fetch (TypeScript)", "…"],
    "retryHeaders": ["PAYMENT-SIGNATURE", "X-PAYMENT"]
  },
  "payment": {
    "status": 402,
    "accepts": […],
    "recommended": { … }
  }
}
```

`payment` is present after a successful inspect. Build manifests yourself with `buildPaywallAgentManifest()`.

## vs server `@x402/paywall`

| | React overlay | Server paywall |
|--|---------------|----------------|
| UI | In-app SPA | Full HTML 402 page |
| Agents | In-page manifest | HTTP 402 body/headers |

Use this package when humans and agents share the same React app shell.
