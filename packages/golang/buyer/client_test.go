package buyer

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPayURLFreeEndpoint(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	// nil signer still registers scheme; free endpoints never trigger signing.
	cl := New(nil)
	resp, err := cl.Get(context.Background(), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestNewWithBatchOptions(t *testing.T) {
	cl := New(nil, Options{Batch: &BatchOptions{DepositMultiplier: 5}})
	if cl == nil || cl.http == nil {
		t.Fatal("expected client")
	}
}

func TestNewFromPrivateKeyInvalid(t *testing.T) {
	_, err := NewFromPrivateKey("not-a-key")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestNewFromEnvHederaUnsupported(t *testing.T) {
	t.Setenv("AX402_EVM_PRIVATE_KEY", "")
	t.Setenv("EVM_PRIVATE_KEY", "")
	t.Setenv("HEDERA_ACCOUNT_ID", "0.0.1234")
	t.Setenv("HEDERA_PRIVATE_KEY", "deadbeef")
	_, err := NewFromEnv()
	if err == nil || !strings.Contains(err.Error(), "hedera buyer signing is not supported") {
		t.Fatalf("got %v", err)
	}
}

func TestNewFromEnvMissing(t *testing.T) {
	t.Setenv("AX402_EVM_PRIVATE_KEY", "")
	t.Setenv("EVM_PRIVATE_KEY", "")
	t.Setenv("HEDERA_ACCOUNT_ID", "")
	t.Setenv("HEDERA_PRIVATE_KEY", "")
	_, err := NewFromEnv()
	if err == nil {
		t.Fatal("expected error")
	}
}
