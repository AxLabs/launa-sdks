// Import OpenAPI operations as paid gateway endpoints.
//
// Usage:
//
//	export LAUNA_API_KEY=launa_live_...
//	go run ./wrap_openapi/ path/to/openapi.yaml YOUR_API_ID [price-usdc]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	launa "github.com/AxLabs/launa-sdks/go"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "Usage: wrap_openapi <spec.yaml> <apiId> [price-usdc]")
		os.Exit(2)
	}

	specPath := os.Args[1]
	apiID := os.Args[2]
	price := "0.10"
	if len(os.Args) > 3 {
		price = os.Args[3]
	}

	key := os.Getenv("LAUNA_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "LAUNA_API_KEY is required")
		os.Exit(1)
	}

	base := os.Getenv("LAUNA_BASE_URL")
	if base == "" {
		base = "https://api.launa.io"
	}

	spec, err := os.ReadFile(specPath)
	if err != nil {
		fatal(err)
	}

	atomic, err := launa.UsdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := launa.NewClient(base, launa.Credentials{APIKey: key})

	result, err := launa.WrapOpenAPI(ctx, client, apiID, string(spec), []launa.AcceptOption{
		launa.BuildUsdcAccept("exact", atomic),
	}, nil)
	if err != nil {
		fatal(err)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(result)
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
