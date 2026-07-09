# @ax402/sdk

TypeScript client for the [Ax402](https://ax402.io) control plane — manage APIs, endpoints, domains, analytics, and gateway configuration from Node.js or the browser.

Payment signing uses [x402](https://github.com/x402-foundation/x402) via optional `@ax402/sdk/buyer`. This package covers **platform automation**, not the protocol itself.

## Install

```bash
npm install @ax402/sdk
```

Buyer helpers (optional):

```bash
npm install @x402/fetch @x402/evm viem
```

## Quick start

```typescript
import { Ax402Client } from "@ax402/sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY!,
});

const apis = await client.apis.list();
```

Create an API key in the [Ax402 dashboard](https://ax402.io).

## Subpaths

| Import | Purpose |
|--------|---------|
| `@ax402/sdk` | Control-plane client + platform helpers |
| `@ax402/sdk/buyer` | Pay gateway URLs (`BuyerClient`, `payAndFetch`) |
| `@ax402/sdk/platform` | Token/network helpers (`buildUsdcAccept`, `gatewayURL`, …) |
| `@ax402/sdk/scopes` | API key scope presets |
| `@ax402/sdk/shell` | Shell-oriented helpers for CLI tooling |

## Control plane

Resources on `Ax402Client`: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, `config`.

```typescript
import { buildUsdcAccept, usdcToAtomic } from "@ax402/sdk";

const accept = buildUsdcAccept({ priceUsdc: 0.1, payTo: "0xYourWallet" });
```

## Buyer

Pay wrapped gateway URLs — not the control plane.

```typescript
import { buyerClientFromEnv } from "@ax402/sdk/buyer";

const client = await buyerClientFromEnv();
const { response, payment } = await client.pay({
  url: "https://my-api.ax402.io/v1/echo?test=1",
});
```

Browser wallet: `createEvmSignerFromBrowserProvider()` + `BuyerClient.create(signer)`.

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL (default `https://api.ax402.io`) |
| `AX402_API_KEY` | Scoped API key (`ax402_live_...`) |
| `AX402_EVM_PRIVATE_KEY` | Signs x402 payments for buyer helpers |

## Links

- [Full TypeScript SDK docs](https://github.com/AxLabs/ax402-sdks/blob/main/docs/sdks/typescript/README.md)
- [Buyer guide](https://github.com/AxLabs/ax402-sdks/blob/main/docs/buyers/README.md)
- [CLI](https://www.npmjs.com/package/@ax402/cli) · [MCP server](https://www.npmjs.com/package/@ax402/mcp-server)

## License

Apache-2.0
