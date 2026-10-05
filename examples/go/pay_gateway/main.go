// Pay a gateway URL with an EVM wallet.
//
// Usage:
//
//	export LAUNA_EVM_PRIVATE_KEY=0x...
//	go run ./pay_gateway/ [gateway-url]
//
// Batch-settlement gateway:
//
//	go run ./pay_gateway/ -batch [gateway-url]
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/AxLabs/ax402-sdk/go/buyer"
)

func main() {
	args := os.Args[1:]
	batch := false
	if len(args) > 0 && args[0] == "-batch" {
		batch = true
		args = args[1:]
	}

	url := "https://my-api.launa.io/v1/echo?test=1"
	if len(args) > 0 {
		url = args[0]
	}

	key := os.Getenv("LAUNA_EVM_PRIVATE_KEY")
	if key == "" {
		key = os.Getenv("EVM_PRIVATE_KEY")
	}
	if key == "" {
		fmt.Fprintln(os.Stderr, "LAUNA_EVM_PRIVATE_KEY is required")
		os.Exit(1)
	}

	var opts buyer.Options
	if batch {
		opts.Batch = &buyer.BatchOptions{DepositMultiplier: 5}
	}

	client, err := buyer.NewFromPrivateKey(key, opts)
	if err != nil {
		fatal(err)
	}

	ctx := context.Background()
	resp, err := client.Get(ctx, url)
	if err != nil {
		fatal(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
	settle, _ := client.SettleResponseFrom(resp)

	out := map[string]any{
		"status":      resp.StatusCode,
		"url":         url,
		"batch":       batch,
		"settlement":  settle,
		"body":        string(body),
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(out)

	if resp.StatusCode >= 400 {
		os.Exit(1)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
