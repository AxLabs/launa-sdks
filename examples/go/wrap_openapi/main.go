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

	ax402 "github.com/AxLabs/ax402-sdk/go"
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

	atomic, err := usdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := ax402.NewClient(base, ax402.Credentials{APIKey: key})

	parsed, err := client.ParseOpenAPI(ctx, string(spec))
	if err != nil {
		fatal(err)
	}

	ops := make([]map[string]string, 0, len(parsed.Operations))
	for _, op := range parsed.Operations {
		desc := op.Summary
		if desc == "" {
			desc = op.Description
		}
		ops = append(ops, map[string]string{
			"method":       op.Method,
			"path_pattern": op.PathPattern,
			"description":  desc,
		})
	}

	result, err := client.ImportOpenAPI(ctx, apiID, ops, []ax402.AcceptOption{
		ax402.BuildUsdcAccept("exact", atomic),
	})
	if err != nil {
		fatal(err)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(result)
}

func usdcToAtomic(amount string) (string, error) {
	trimmed := amount
	for len(trimmed) > 0 && trimmed[0] == ' ' {
		trimmed = trimmed[1:]
	}
	for len(trimmed) > 0 && trimmed[len(trimmed)-1] == ' ' {
		trimmed = trimmed[:len(trimmed)-1]
	}
	dot := -1
	for i := 0; i < len(trimmed); i++ {
		if trimmed[i] == '.' {
			dot = i
			break
		}
	}
	whole := trimmed
	frac := ""
	if dot >= 0 {
		whole = trimmed[:dot]
		frac = trimmed[dot+1:]
	}
	if len(frac) > 6 {
		return "", fmt.Errorf("USDC supports at most 6 decimal places")
	}
	for len(frac) < 6 {
		frac += "0"
	}
	if whole == "0" && frac == "000000" {
		return "", fmt.Errorf("price must be > 0")
	}
	return whole + frac, nil
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
