# Go SDK

Module: `github.com/AxLabs/ax402-sdk/go` in `packages/golang/`.

## Control plane

```go
import ax402 "github.com/AxLabs/ax402-sdk/go"

client := ax402.NewClient(baseURL, ax402.Credentials{APIKey: key})
apis, err := client.ListAPIs(ctx)
```

## Buyer

```go
import "github.com/AxLabs/ax402-sdk/go/buyer"

c, err := buyer.NewFromPrivateKey(ctx, privateKeyHex)
resp, err := c.Get(ctx, gatewayURL)
```

## Tests

```bash
cd packages/golang && go test ./...
```
