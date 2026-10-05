# Go SDK

Module: `github.com/AxLabs/ax402-sdk/go` in `packages/golang/`.

Buyer module: `github.com/AxLabs/ax402-sdk/go/buyer`.

## Control plane

```go
import launa "github.com/AxLabs/ax402-sdk/go"

client := launa.NewClient(baseURL, launa.Credentials{APIKey: os.Getenv("LAUNA_API_KEY")})
apis, err := client.ListAPIs(ctx)
api, err := client.CreateAPI(ctx, launa.CreateAPIInput{...})
```

Flat methods mirror the TypeScript resources: auth, keys, apis, endpoints, domains, openapi, stats, settlements, billing, income, exchange rates, and config.

Helpers: `launa.GatewayURL`, `launa.BuildUsdcAccept`, `launa.UsdcToAtomic`, `launa.WrapOpenAPI`, `launa.SetupAPIWithDefaultDomain`, `launa.ScopePresets`.

## Buyer

Pay gateway URLs with EVM `exact` and `batch-settlement`. Full guide: [buyers](../buyers/README.md).

```go
import "github.com/AxLabs/ax402-sdk/go/buyer"

c, err := buyer.NewFromPrivateKey(os.Getenv("LAUNA_EVM_PRIVATE_KEY"))
if err != nil { /* handle */ }

resp, err := c.Get(ctx, "https://my-api.launa.io/v1/echo?test=1")
defer resp.Body.Close()

settle, _ := c.SettleResponseFrom(resp)
```

Batch endpoints: pass `buyer.BatchOptions{DepositMultiplier: 5}` to `buyer.New` / `NewFromPrivateKey`.

Also: `PayURL(ctx, method, url, body)`, `Do(ctx, req)`, `HTTPClient()`.

## Tests

```bash
cd packages/golang && go test ./...
```

## Examples

See [examples/go/](../../examples/go/) — setup API, pay gateway, stats, wrap OpenAPI. Run from `examples/go` with `go run ./<example>/`.
