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

	launa "github.com/AxLabs/launa-sdk/go"
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

	ctx := context.Background()
	client := launa.NewClient(base, launa.Credentials{APIKey: key})

	platform, err := client.PlatformConfig(ctx)
	if err != nil {
		fatal(err)
	}

	api, err := client.CreateAPI(ctx, launa.CreateAPIInput{
		Name:            titleSlug(slug),
		Slug:            slug,
		UpstreamBaseURL: upstream,
	})
	if err != nil {
		fatal(err)
	}

	atomic, err := usdcToAtomic(price)
	if err != nil {
		fatal(err)
	}

	endpoint, err := client.CreateEndpoint(ctx, api.ID, launa.CreateEndpointInput{
		Method:      "GET",
		PathPattern: "/get",
		Description: "Paid echo via httpbin",
		Accepts:     []launa.AcceptOption{launa.BuildUsdcAccept("exact", atomic)},
	})
	if err != nil {
		fatal(err)
	}

	host := slug + "." + platform.PlatformDomain
	out := map[string]string{
		"apiId":       api.ID,
		"slug":        api.Slug,
		"endpointId":  endpoint.ID,
		"gatewayUrl":  launa.GatewayURL(host, "/get", platform.GatewayPort),
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

func usdcToAtomic(amount string) (string, error) {
	trimmed := strings.TrimSpace(amount)
	parts := strings.SplitN(trimmed, ".", 2)
	whole := parts[0]
	frac := ""
	if len(parts) == 2 {
		frac = parts[1]
	}
	if len(frac) > 6 {
		return "", fmt.Errorf("USDC supports at most 6 decimal places")
	}
	for len(frac) < 6 {
		frac += "0"
	}
	combined := strings.TrimLeft(whole+frac, "0")
	if combined == "" {
		return "", fmt.Errorf("price must be > 0")
	}
	return combined, nil
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
