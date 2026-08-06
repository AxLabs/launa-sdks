# Policy & networks

`PaywallProvider` `policy` filters server `accepts` before signing.

```ts
type PaywallPolicy = {
  maxAmount?: string
  /** Comma-separated schemes. Default: `exact,batch-settlement`. */
  allowedSchemes?: string
  preferredSchemes?: string
  allowedChains?: string      // comma-separated eip155:…
  allowedAssets?: string      // comma-separated token addresses
  allowedPayTo?: string
  preferredNetworks?: string
  preferredAssets?: string
  preferredTransferMethods?: string
  strategy?: 'server-order' | 'preference-first'
}
```

Example — Base USDC, exact + batch:

```tsx
policy={{
  allowedSchemes: 'exact,batch-settlement',
  preferredNetworks: 'eip155:8453',
  allowedAssets: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  strategy: 'preference-first',
}}
```

The gateway `upto` scheme is not supported by the paywall — use `exact` or `batch-settlement` endpoints.

Use constants from your codebase / facilitator docs — do not hardcode from memory in production without verifying.

## Batch-settlement

When the gateway accepts `batch-settlement`, pass `batch` on `PaywallProvider`:

```tsx
<PaywallProvider
  policy={{ allowedSchemes: 'batch-settlement', preferredNetworks: 'eip155:8453' }}
  batch={{
    channelSalt: '0x0000000000000000000000000000000000000000000000000000000000000000',
    depositMultiplier: 5,
    withdrawDelaySecs: 259200,
    debugChannel: false,
  }}
>
```

`withdrawDelaySecs` must match the API batch withdraw delay configured on the seller gateway.

`privateKey` mode skips wallet discovery; `rpc` is used for Permit2 allowance checks on ERC-20 paths.
