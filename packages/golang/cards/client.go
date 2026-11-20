// Package cards implements the hosted card checkout/resume flow without a crypto wallet.
package cards

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	URL     string
	Token   string
	Headers http.Header
	HTTP    *http.Client
}
type Status struct {
	Status      string `json:"status"`
	CheckoutURL string `json:"checkout_url,omitempty"`
	PurchaseID  string `json:"purchase_id,omitempty"`
}

func New(rawURL, token string) (*Client, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.Fragment != "" {
		return nil, fmt.Errorf("HTTPS gateway URL required")
	}
	if token == "" {
		b := make([]byte, 32)
		if _, err = rand.Read(b); err != nil {
			return nil, err
		}
		token = base64.RawURLEncoding.EncodeToString(b)
	}
	b, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(b) != 32 {
		return nil, fmt.Errorf("invalid payment token")
	}
	return &Client{URL: rawURL, Token: token, Headers: make(http.Header), HTTP: &http.Client{Timeout: 90 * time.Second}}, nil
}
func (c *Client) request(ctx context.Context, action string) (*http.Response, error) {
	if c.Headers.Get("PAYMENT-SIGNATURE") != "" || c.Headers.Get("X-PAYMENT") != "" || c.Headers.Get("Payment-Authorization") != "" || strings.HasPrefix(strings.ToLower(c.Headers.Get("Authorization")), "payment ") {
		return nil, fmt.Errorf("choose one payment mechanism")
	}
	req, err := http.NewRequestWithContext(ctx, "GET", c.URL, nil)
	if err != nil {
		return nil, err
	}
	req.Header = c.Headers.Clone()
	req.Header.Set("Launa-Payment", action)
	req.Header.Set("Launa-Payment-Token", c.Token)
	base := c.HTTP
	if base == nil {
		base = &http.Client{Timeout: 90 * time.Second}
	}
	client := *base
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return client.Do(req)
}
func (c *Client) state(ctx context.Context, action string) (*Status, error) {
	r, err := c.request(ctx, action)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 && r.StatusCode != 202 && r.StatusCode != 402 && r.StatusCode != 409 && r.StatusCode != 410 {
		return nil, fmt.Errorf("card payment unavailable; retry with the same token")
	}
	var out Status
	if err = json.NewDecoder(io.LimitReader(r.Body, 65536)).Decode(&out); err != nil {
		return nil, err
	}
	if out.Status == "" {
		return nil, fmt.Errorf("invalid payment status")
	}
	if out.CheckoutURL != "" {
		u, e := url.Parse(out.CheckoutURL)
		if e != nil || u.Scheme != "https" || u.Host != "checkout.stripe.com" || u.User != nil {
			return nil, fmt.Errorf("invalid checkout URL")
		}
	}
	return &out, nil
}

// Start creates one purchase. Persist Token before calling; reuse it after uncertain errors.
func (c *Client) Start(ctx context.Context) (*Status, error)  { return c.state(ctx, "checkout") }
func (c *Client) Status(ctx context.Context) (*Status, error) { return c.state(ctx, "status") }

// Resume returns the resource on HTTP 2xx with Launa-Payment-Receipt. Caller closes Body.
func (c *Client) Resume(ctx context.Context) (*http.Response, error) { return c.request(ctx, "resume") }
