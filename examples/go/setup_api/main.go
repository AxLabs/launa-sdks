// Create an API with default subdomain and one paid endpoint.
//
// Usage:
//
//	export AX402_API_KEY=ax402_live_...
//	go run ./setup_api/ [slug] [upstream-url] [price-usdc]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	ax402 "github.com/AxLabs/ax402-sdks/go"
)

func main() {
	slug := "demo-api"
	if len(os.Args) > 1 {
		slug = os.Args[1]
	}
	upstream := "https://httpbin.org"
	if len(os.Args) > 2 {
		upstream = os.Args[2]
	}
	price := "0.01"
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

	atomic, err := ax402.UsdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := ax402.NewClient(base, ax402.Credentials{APIKey: key})

	setup, err := ax402.SetupAPIWithDefaultDomain(ctx, client, ax402.CreateAPIInput{
		Name:            titleSlug(slug),
		Slug:            slug,
		UpstreamBaseURL: upstream,
	})
	if err != nil {
		fatal(err)
	}

	endpoint, err := client.CreateEndpoint(ctx, setup.API.ID, ax402.CreateEndpointInput{
		Method:      "GET",
		PathPattern: "/get",
		Description: "Paid echo via httpbin",
		Accepts:     []ax402.AcceptOption{ax402.BuildUsdcAccept("exact", atomic)},
	})
	if err != nil {
		fatal(err)
	}

	out := map[string]string{
		"apiId":       setup.API.ID,
		"slug":        setup.API.Slug,
		"endpointId":  endpoint.ID,
		"gatewayUrl":  ax402.GatewayURL(setup.GatewayHost, "/get", setup.Platform.GatewayPort),
		"priceUsdc":   price,
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(out)
}

func titleSlug(slug string) string {
	parts := strings.Split(slug, "-")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
