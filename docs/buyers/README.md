# Buyer clients

Pay wrapped gateway URLs with automatic 402 handling and x402 signing.

## Environment

- `AX402_EVM_PRIVATE_KEY` — EVM key with testnet USDC on configured networks
- Gateway URL — API domain hostname, not the control plane

## By language

| Language | Entry |
|----------|-------|
| TypeScript | `@axlabs/ax402-sdk/buyer` — `payAndFetch`, `BuyerClient` |
| Go | `go/buyer` — `NewFromPrivateKey`, `Get` |
| Python | `ax402_sdk.buyer` — `BuyerClient`, `AsyncBuyerClient` |
| CLI | `ax402 pay url <gateway-url>` |

Protocol details: [x402-foundation/x402](https://github.com/x402-foundation/x402).
