# Components & API

## PaywallProvider

| Prop | Type | Description |
|------|------|-------------|
| `policy` | `PaywallPolicy` | Buyer-side filters for `accepts` |
| `rpc` | `RpcConfig` | RPC URLs for Permit2 / chain reads |
| `privateKey` | `string` | Optional hex key (no wallet UI) |
| `fetch` | `typeof fetch` | Custom fetch implementation |
| `appearance` | `PaywallAppearance` | Global theme, labels, brand, classes |
| `batch` | `BatchPaywallOptions` | Batch-settlement channel (`channelSalt`, `depositMultiplier`, `withdrawDelaySecs`, `debugChannel`) |
| `signTypedData` | `PaywallSignTypedDataOptions` | ERC-5267 EIP-712 domain for `eth_signTypedData_v4` |
| `debugWallets` | `boolean` | Console wallet discovery logs |

### usePaywall()

| Field | Description |
|-------|-------------|
| `inspect(url, init?)` | Fetch; parse 402 requirements |
| `unlock(url, init?)` | Paid fetch via `@x402/fetch` |
| `getBatchChannelStatus(requirements)` | Batch escrow balance / headroom for a 402 accept |
| `resolveBatchPayButtonLabel(requirements)` | Dynamic pay button label for batch channels |
| `connectWallet(id?)` | EIP-6963 picker if multiple wallets |
| `disconnectWallet()` | Clear session |
| `wallets` | Discovered extensions |
| `walletAddress` | Connected address |

Throws `WalletSelectionRequiredError` with `.wallets` when multiple and no `id`.

## PaywallGate

| Prop | Default | Description |
|------|---------|-------------|
| `resourceUrl` | — | Protected HTTP URL |
| `requestInit` | — | Passed to inspect/unlock |
| `title` | `Continue reading` | Overlay heading |
| `description` | session copy | Subtitle |
| `priceLabel` | auto from 402 | Fixed price text |
| `appearance` | — | Merged with provider |
| `agentDiscovery` | `true` | Agent instructions block |
| `agentInstructions` | — | Custom agent message |
| `inspectOnMount` | `true` | Probe 402 on mount |
| `onUnlocked` | — | `(result, parsed) => void` |
| `renderLockedOverlay` | — | Custom locked UI |
| `className` / `teaserClassName` / … | — | Layout class hooks |

## PaywallOverlay

Presentational card only — wire buttons to `usePaywall()` yourself.

## WalletPicker

Lists `DiscoveredWallet[]`; supports `appearance` and `className`.

## PaywallAgentDiscovery

Standalone agent block + meta tags. Props: `resourceUrl`, `inspect`, `instructions`, `enabled`, `appearance`.

## Utilities (exported)

- `formatRequirementPrice(req)` — human price string
- `createSelectionResult(accepts, policy)` — policy engine
- `discoverWallets()`, `buildPaywallAgentManifest()`
- Wallet helpers: `connectWalletAddress`, `createBrowserWalletSigner`, …

## Types

`PaywallPolicy`, `InspectResult`, `UnlockResult`, `PaywallAppearance`, `PaywallTheme`, `PaywallClassNames`, `PaywallLabels`, `PaywallLockedOverlayState`.
