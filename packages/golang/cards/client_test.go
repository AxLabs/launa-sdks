package cards

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestCardRetryPreservesTokenAndDisablesRedirects(t *testing.T) {
	c, err := New("https://gateway.example/data", "")
	if err != nil {
		t.Fatal(err)
	}
	token := c.Token
	var operations []string
	c.HTTP = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.Header.Get("Launa-Payment-Token") != token {
			t.Fatal("token changed")
		}
		operations = append(operations, r.Header.Get("Launa-Payment"))
		return &http.Response{StatusCode: 202, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"status":"pending","checkout_url":"https://checkout.stripe.com/test"}`))}, nil
	})}
	if _, err = c.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err = c.Status(context.Background()); err != nil {
		t.Fatal(err)
	}
	resp, err := c.Resume(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if strings.Join(operations, ",") != "checkout,status,resume" {
		t.Fatal(operations)
	}
	c.HTTP.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 302, Header: http.Header{"Location": []string{"https://other.example"}}, Body: io.NopCloser(strings.NewReader("")), Request: r}, nil
	})
	resp, err = c.Resume(context.Background())
	if err != nil || resp.StatusCode != 302 {
		t.Fatal("followed redirect", err)
	}
	resp.Body.Close()
}
func TestCardRejectsMixedPaymentAndUnsafeURL(t *testing.T) {
	if _, err := New("http://gateway.example", ""); err == nil {
		t.Fatal("http accepted")
	}
	c, _ := New("https://gateway.example", "")
	c.Headers.Set("X-PAYMENT", "x")
	if _, err := c.Start(context.Background()); err == nil {
		t.Fatal("mixed payment accepted")
	}
}

func TestCheckoutRejectsMPPProof(t *testing.T) {
	for _, header := range []string{"Authorization", "Payment-Authorization"} {
		c, err := New("https://gateway.example/data", "")
		if err != nil {
			t.Fatal(err)
		}
		c.Headers.Set(header, "Payment fixture")
		if _, err = c.Start(context.Background()); err == nil {
			t.Fatal("mixed payment accepted")
		}
	}
}
