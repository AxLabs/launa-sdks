// List APIs and print platform stats.
//
// Usage:
//
//	export LAUNA_API_KEY=launa_live_...
//	go run ./stats_overview/ [days]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	launa "github.com/AxLabs/ax402-sdk/go"
)

func main() {
	days := 30
	if len(os.Args) > 1 {
		n, err := strconv.Atoi(os.Args[1])
		if err != nil {
			fatal(err)
		}
		days = n
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

	apis, err := client.ListAPIs(ctx)
	if err != nil {
		fatal(err)
	}

	overview, err := client.StatsOverview(ctx, days)
	if err != nil {
		fatal(err)
	}

	apiSummaries := make([]map[string]string, 0, len(apis))
	for _, a := range apis {
		apiSummaries = append(apiSummaries, map[string]string{
			"id":   a.ID,
			"slug": a.Slug,
			"name": a.Name,
		})
	}

	out := map[string]any{
		"days":     days,
		"apiCount": len(apis),
		"apis":     apiSummaries,
		"stats":    overview,
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(out)
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
