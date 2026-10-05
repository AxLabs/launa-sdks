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

	launa "github.com/AxLabs/launa-sdk/go"
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

	atomic, err := usdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := launa.NewClient(base, launa.Credentials{APIKey: key})

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

	result, err := client.ImportOpenAPI(ctx, apiID, ops, []launa.AcceptOption{
		launa.BuildUsdcAccept("exact", atomic),
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
