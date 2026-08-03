package ax402

import "testing"

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

func TestExportPaymentHistoryURL(t *testing.T) {
	got := ExportPaymentHistoryURL(PaymentHistoryQuery{Days: 30, APIID: "api1"}, "csv")
	if got != "/settlements?api_id=api1&days=30&format=csv" && got != "/settlements?days=30&api_id=api1&format=csv" {
		t.Fatalf("got %s", got)
	}
}
