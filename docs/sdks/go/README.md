# Go SDK

Module: `github.com/AxLabs/ax402-sdks/go` in `packages/golang/`.

The Go import path follows the GitHub repo (`AxLabs/ax402-sdks`), not the npm scope (`@ax402`). npm scopes and Go module paths are independent — there is no `github.com/ax402` org required.

Buyer module: `github.com/AxLabs/ax402-sdks/go/buyer`.

## Control plane

```go
import ax402 "github.com/AxLabs/ax402-sdks/go"

client := ax402.NewClient(baseURL, ax402.Credentials{APIKey: os.Getenv("AX402_API_KEY")})
apis, err := client.ListAPIs(ctx)
api, err := client.CreateAPI(ctx, ax402.CreateAPIInput{...})
```

Flat methods mirror the TypeScript resources: auth, keys, apis (`GetAPIDiscovery`), endpoints (schema fields on create/update), domains, openapi, stats, settlements, billing, income, exchange rates, and config. Includes `CheckSlugAvailability`, `ProbeUpstream`, and `ListWebhookDeliveries`.

Settlement webhooks on `CreateAPIInput`: `WebhookURL`, `WebhookSecret`, `ClearWebhook`. Response includes `WebhookURL` and `WebhookConfigured` (secret is never returned).

Discovery on `CreateAPIInput` / `API`: `DiscoveryGuidance`, `DiscoveryContactEmail`, `OpenAPIVersion`. Endpoints: `RequestSchema`, `ResponseSchema`, `SchemaSource`, `ClearSchemas`.

```go
api, err := client.CreateAPI(ctx, ax402.CreateAPIInput{
    Name: "Search", Slug: "search", UpstreamBaseURL: "https://upstream.example.com",
    DiscoveryGuidance: "Use POST /search.", DiscoveryContactEmail: "support@example.com",
})
disc, err := client.GetAPIDiscovery(ctx, api.ID)
```

Helpers: `ax402.GatewayURL`, `ax402.BuildUsdcAccept`, `ax402.UsdcToAtomic`, `ax402.WrapOpenAPI`, `ax402.SetupAPIWithDefaultDomain`, `ax402.ScopePresets`.

## Buyer

Pay gateway URLs with EVM `exact` and `batch-settlement`. Full guide: [buyers](../buyers/README.md).

Native Hedera (`hedera:mainnet`) buyer signing is TypeScript-only (`@ax402/sdk/buyer` + `@x402/hedera`) until foundation ships a Go Hedera client scheme. Platform helpers still expose `NetworkHedera*` / `HBAR` / `USDCHedera*` for seller config.

```go
import "github.com/AxLabs/ax402-sdks/go/buyer"

c, err := buyer.NewFromEnv() // AX402_EVM_PRIVATE_KEY
if err != nil { /* handle */ }

resp, err := c.Get(ctx, "https://my-api.ax402.io/v1/echo?test=1")
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
