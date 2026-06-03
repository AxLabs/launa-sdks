# Policy & networks

`PaywallProvider` `policy` filters server `accepts` before signing.

```ts
type PaywallPolicy = {
  maxAmount?: string
  allowedChains?: string      // comma-separated eip155:…
  allowedAssets?: string      // comma-separated token addresses
  allowedPayTo?: string
  preferredNetworks?: string
  preferredAssets?: string
  preferredTransferMethods?: string
  strategy?: 'server-order' | 'preference-first'
}
```

Example — Base Sepolia USDC only:

```tsx
policy={{
  preferredNetworks: 'eip155:84532',
  allowedAssets: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  strategy: 'preference-first',
}}
```

Use constants from your codebase / facilitator docs — do not hardcode from memory in production without verifying.

`privateKey` mode skips wallet discovery; `rpc` is used for Permit2 allowance checks on ERC-20 paths.
