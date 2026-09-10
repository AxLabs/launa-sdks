package ax402

import (
	"encoding/json"
	"testing"
)

func TestUsdcToAtomic(t *testing.T) {
	got, err := UsdcToAtomic("0.10")
	if err != nil {
		t.Fatal(err)
	}
	if got != "100000" {
		t.Fatalf("got %s", got)
	}
}

func TestAtomicToUsdc(t *testing.T) {
	if AtomicToUsdc("100000") != "0.1" {
		t.Fatalf("got %s", AtomicToUsdc("100000"))
	}
}

func TestBuildUsdcAccept(t *testing.T) {
	accept := BuildUsdcAccept("exact", "1000")
	if accept.Amount != "1000" || accept.Scheme != "exact" {
		t.Fatalf("got %+v", accept)
	}
	batch := BuildUsdcAccept("batch-settlement", "1000")
	if batch.Scheme != "batch-settlement" {
		t.Fatalf("got %+v", batch)
	}
	if batch.Extra["withdrawDelay"] != DefaultBatchWithdrawDelay {
		t.Fatalf("withdrawDelay: %v", batch.Extra["withdrawDelay"])
	}
}

func TestBuildSandboxUsdcAccept(t *testing.T) {
	accept, err := BuildSandboxUsdcAccept("exact", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if accept.Network != NetworkSandboxFork || accept.Asset != USDCBaseMainnet || accept.Amount != "1000" {
		t.Fatalf("got %+v", accept)
	}
	if accept.Extra["name"] != "USD Coin" {
		t.Fatalf("eip-712 name=%v want USD Coin", accept.Extra["name"])
	}
	if _, err := BuildSandboxUsdcAccept("batch-settlement", "1000"); err == nil {
		t.Fatal("expected error for batch-settlement")
	}
}

func TestFormatWithdrawDelay(t *testing.T) {
	if FormatWithdrawDelay(900) != "15 minutes" {
		t.Fatalf("got %s", FormatWithdrawDelay(900))
	}
}

func TestHederaNetworkAssetConstants(t *testing.T) {
	if NetworkHederaMainnet != "hedera:mainnet" || NetworkHederaTestnet != "hedera:testnet" {
		t.Fatalf("networks: %s %s", NetworkHederaMainnet, NetworkHederaTestnet)
	}
	if HBAR != "0.0.0" {
		t.Fatalf("HBAR=%s", HBAR)
	}
	if USDCHederaTestnet != "0.0.429274" || USDCHederaMainnet != "0.0.456858" {
		t.Fatalf("usdc: %s %s", USDCHederaTestnet, USDCHederaMainnet)
	}
}

func TestGatewayHostFromAPI(t *testing.T) {
	api := &API{
		Slug: "sdk-go-sbx",
		Domains: []APIDomain{
			{Hostname: "sdk-go-sbx.x.staging.ax402.io"},
			{Hostname: "sdk-go-sbx.dev.x.staging.ax402.io", IsPrimary: true},
		},
	}
	if got := GatewayHostFromAPI(api, "x.staging.ax402.io"); got != "sdk-go-sbx.dev.x.staging.ax402.io" {
		t.Fatalf("got %s", got)
	}
	if got := GatewayHostFromAPI(&API{Slug: "echo"}, "x.staging.ax402.io"); got != "echo.x.staging.ax402.io" {
		t.Fatalf("fallback got %s", got)
	}
}

func TestPayToAddressesNullDecodesEmpty(t *testing.T) {
	var api API
	if err := json.Unmarshal([]byte(`{"id":"1","name":"n","slug":"s","upstream_base_url":"https://x.com","pay_to_mode":"user_wallet","pay_to_addresses":null}`), &api); err != nil {
		t.Fatal(err)
	}
	if api.PayToAddresses == nil {
		t.Fatal("expected empty map, got nil")
	}
	if len(api.PayToAddresses) != 0 {
		t.Fatalf("got %+v", api.PayToAddresses)
	}
}

func TestExportPaymentHistoryURL(t *testing.T) {
	got := ExportPaymentHistoryURL(PaymentHistoryQuery{Days: 30, APIID: "api1"}, "csv")
	if got != "/settlements?api_id=api1&days=30&format=csv" && got != "/settlements?days=30&api_id=api1&format=csv" {
		t.Fatalf("got %s", got)
	}
}
