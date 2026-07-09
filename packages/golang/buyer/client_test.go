package buyer

import (
	"context"
	"net/http"
	"net/http/httptest"
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
