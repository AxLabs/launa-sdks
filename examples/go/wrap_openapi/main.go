// Import OpenAPI operations as paid gateway endpoints.
//
// Usage:
//
//	export AX402_API_KEY=ax402_live_...
//	go run ./wrap_openapi/ path/to/openapi.yaml YOUR_API_ID [price-usdc]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	ax402 "github.com/AxLabs/ax402-sdks/go"
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

	key := os.Getenv("AX402_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "AX402_API_KEY is required")
		os.Exit(1)
	}

	base := os.Getenv("AX402_BASE_URL")
	if base == "" {
		base = "https://api.ax402.io"
	}

	spec, err := os.ReadFile(specPath)
	if err != nil {
		fatal(err)
	}

	atomic, err := ax402.UsdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := ax402.NewClient(base, ax402.Credentials{APIKey: key})

	result, err := ax402.WrapOpenAPI(ctx, client, apiID, string(spec), []ax402.AcceptOption{
		ax402.BuildUsdcAccept("exact", atomic),
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
