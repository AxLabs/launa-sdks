# Go SDK

Module: `github.com/AxLabs/launa-sdks/go` in `packages/golang/`.

The Go import path follows the GitHub repo (`AxLabs/launa-sdks`), not the npm scope (`@launa`). npm scopes and Go module paths are independent — there is no `github.com/launa` org required.

Buyer module: `github.com/AxLabs/launa-sdks/go/buyer`.

## Control plane

```go
import launa "github.com/AxLabs/launa-sdks/go"

client := launa.NewClient(baseURL, launa.Credentials{APIKey: os.Getenv("LAUNA_API_KEY")})
apis, err := client.ListAPIs(ctx)
api, err := client.CreateAPI(ctx, launa.CreateAPIInput{...})
```

Flat methods mirror the TypeScript resources: auth, keys, apis, endpoints, domains, openapi, stats, settlements, billing, income, exchange rates, and config. Includes `CheckSlugAvailability`, `ProbeUpstream`, and `ListWebhookDeliveries`.

Settlement webhooks on `CreateAPIInput`: `WebhookURL`, `WebhookSecret`, `ClearWebhook`. Response includes `WebhookURL` and `WebhookConfigured` (secret is never returned).

Helpers: `launa.GatewayURL`, `launa.BuildUsdcAccept`, `launa.UsdcToAtomic`, `launa.WrapOpenAPI`, `launa.SetupAPIWithDefaultDomain`, `launa.ScopePresets`.

## Buyer

Pay gateway URLs with EVM `exact` and `batch-settlement`. Full guide: [buyers](../buyers/README.md).

Native Hedera (`hedera:testnet` / `hedera:mainnet`) buyer signing is TypeScript-only (`@launa/sdk/buyer` + `@x402/hedera`) until foundation ships a Go Hedera client scheme. Platform helpers still expose `NetworkHedera*` / `HBAR` / `USDCHedera*` for seller config.

```go
import "github.com/AxLabs/launa-sdks/go/buyer"

c, err := buyer.NewFromEnv() // LAUNA_EVM_PRIVATE_KEY
if err != nil { /* handle */ }

resp, err := c.Get(ctx, "https://my-api.launa.io/v1/echo?test=1")
defer resp.Body.Close()

settle, _ := c.SettleResponseFrom(resp)
```

`NewFromPrivateKey` remains available. Batch endpoints: pass `buyer.BatchOptions{DepositMultiplier: 5}` to `buyer.New` / `NewFromPrivateKey` / `NewFromEnv`.

Also: `PayURL(ctx, method, url, body)`, `Do(ctx, req)`, `HTTPClient()`.

## Tests

```bash
cd packages/golang && go test ./...
```

## Examples

See [examples/go/](../../examples/go/) — setup API, pay gateway, stats, wrap OpenAPI. Run from `examples/go` with `go run ./<example>/`.
