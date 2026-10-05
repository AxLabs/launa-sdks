# @launa/sdk

TypeScript client for the [Launa](https://launa.io) control plane — manage APIs, endpoints, domains, analytics, and gateway configuration from Node.js or the browser.

Payment signing uses [x402](https://github.com/x402-foundation/x402) via optional `@launa/sdk/buyer`. This package covers **platform automation**, not the protocol itself.

## Install

```bash
npm install @launa/sdk
```

Buyer helpers (optional):

```bash
npm install @x402/fetch @x402/evm viem
# optional Hedera:
npm install @x402/hedera
```

## Quick start

```typescript
import { LaunaClient } from "@launa/sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY!,
});

const apis = await client.apis.list();
```

Create an API key in the [Launa dashboard](https://launa.io).

## Subpaths

| Import | Purpose |
|--------|---------|
| `@launa/sdk` | Control-plane client + platform helpers |
| `@launa/sdk/buyer` | Pay gateway URLs (`BuyerClient`, `payAndFetch`) |
| `@launa/sdk/platform` | Token/network helpers (`buildUsdcAccept`, `gatewayURL`, …) |
| `@launa/sdk/scopes` | API key scope presets |
| `@launa/sdk/shell` | Shell-oriented helpers for CLI tooling |

## Control plane

Resources on `LaunaClient`: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, `config`.

```typescript
import { buildUsdcAccept, usdcToAtomic } from "@launa/sdk";

const accept = buildUsdcAccept({ priceUsdc: 0.1, payTo: "0xYourWallet" });
```

## Buyer

Pay wrapped gateway URLs — not the control plane.

```typescript
import { buyerClientFromEnv } from "@launa/sdk/buyer";

const client = await buyerClientFromEnv();
const { response, payment } = await client.pay({
  url: "https://my-api.launa.io/v1/echo?test=1",
});
```

Browser wallet: `createEvmSignerFromBrowserProvider()` + `BuyerClient.create(signer)`.

## Environment

| Variable | Purpose |
|----------|---------|
| `LAUNA_BASE_URL` | Control plane URL (default `https://api.launa.io`) |
| `LAUNA_API_KEY` | Scoped API key (`launa_live_...`) |
| `LAUNA_EVM_PRIVATE_KEY` | Signs x402 payments for buyer helpers |
| `HEDERA_ACCOUNT_ID` | Hedera payer account for buyer helpers |
| `HEDERA_PRIVATE_KEY` | Hedera private key for buyer helpers |
| `HEDERA_NETWORK` | Optional `hedera:testnet` / `hedera:mainnet` |

## Links

- [Full TypeScript SDK docs](https://github.com/AxLabs/launa-sdks/blob/main/docs/sdks/typescript/README.md)
- [Buyer guide](https://github.com/AxLabs/launa-sdks/blob/main/docs/buyers/README.md)
- [CLI](https://www.npmjs.com/package/@launa/cli) · [MCP server](https://www.npmjs.com/package/@launa/mcp-server)

## License

Apache-2.0
