// Create an API with default subdomain and one paid endpoint.
//
// Usage:
//
//	export LAUNA_API_KEY=launa_live_...
//	go run ./setup_api/ [slug] [upstream-url] [price-usdc]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	launa "github.com/AxLabs/launa-sdks/go"
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

	key := os.Getenv("LAUNA_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "LAUNA_API_KEY is required")
		os.Exit(1)
	}

	base := os.Getenv("LAUNA_BASE_URL")
	if base == "" {
		base = "https://api.launa.io"
	}

	atomic, err := launa.UsdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	client := launa.NewClient(base, launa.Credentials{APIKey: key})

	setup, err := launa.SetupAPIWithDefaultDomain(ctx, client, launa.CreateAPIInput{
		Name:            titleSlug(slug),
		Slug:            slug,
		UpstreamBaseURL: upstream,
	})
	if err != nil {
		fatal(err)
	}

	endpoint, err := client.CreateEndpoint(ctx, setup.API.ID, launa.CreateEndpointInput{
		Method:      "GET",
		PathPattern: "/get",
		Description: "Paid echo via httpbin",
		Accepts:     []launa.AcceptOption{launa.BuildUsdcAccept("exact", atomic)},
	})
	if err != nil {
		fatal(err)
	}

	out := map[string]string{
		"apiId":       setup.API.ID,
		"slug":        setup.API.Slug,
		"endpointId":  endpoint.ID,
		"gatewayUrl":  launa.GatewayURL(setup.GatewayHost, "/get", setup.Platform.GatewayPort),
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
