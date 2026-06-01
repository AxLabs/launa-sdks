package buyer

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	x402 "github.com/x402-foundation/x402/go"
	x402http "github.com/x402-foundation/x402/go/http"
	x402evm "github.com/x402-foundation/x402/go/mechanisms/evm"
	exactevm "github.com/x402-foundation/x402/go/mechanisms/evm/exact/client"
	evmsigners "github.com/x402-foundation/x402/go/signers/evm"
)

// EVMSigner signs x402 EVM exact-scheme payments. Re-exported from x402-foundation.
type EVMSigner = x402evm.ClientEvmSigner

// Client performs HTTP requests against x402 gateway URLs with automatic 402 payment.
type Client struct {
	http *http.Client
	x402 *x402http.HTTPClient
}

// Options configures a buyer Client.
type Options struct {
	HTTPClient *http.Client
	Timeout    time.Duration
}

// New builds a payment-enabled HTTP client for EVM exact scheme on any eip155 network.
func New(signer EVMSigner, opts ...Options) *Client {
	var o Options
	if len(opts) > 0 {
		o = opts[0]
	}
	base := o.HTTPClient
	if base == nil {
		base = &http.Client{Timeout: 120 * time.Second}
	}
	if o.Timeout > 0 {
		base = cloneHTTPClient(base, o.Timeout)
	}

	x402Client := x402.Newx402Client()
	x402Client.Register("eip155:*", exactevm.NewExactEvmScheme(signer, nil))
	httpHelper := x402http.Newx402HTTPClient(x402Client)
	return &Client{
		http: x402http.WrapHTTPClientWithPayment(base, httpHelper),
		x402: httpHelper,
	}
}

// NewFromPrivateKey creates a Client from a hex-encoded EVM private key.
func NewFromPrivateKey(privateKeyHex string, opts ...Options) (*Client, error) {
	signer, err := evmsigners.NewClientSignerFromPrivateKey(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("evm signer: %w", err)
	}
	return New(signer, opts...), nil
}

// Do issues an HTTP request. Returns after payment retry when the server responds 402.
func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, error) {
	req = req.WithContext(ctx)
	return c.http.Do(req)
}

// Get is a GET helper against a gateway URL.
func (c *Client) Get(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return c.Do(ctx, req)
}

// PayURL performs method against url with optional body bytes.
func (c *Client) PayURL(ctx context.Context, method, url string, body []byte) (*http.Response, error) {
	var rdr io.Reader
	if len(body) > 0 {
		rdr = strings.NewReader(string(body))
	}
	req, err := http.NewRequestWithContext(ctx, method, url, rdr)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.Do(ctx, req)
}

// HTTPClient returns the underlying payment-wrapped *http.Client.
func (c *Client) HTTPClient() *http.Client {
	return c.http
}

// SettleResponseFrom extracts settlement metadata from a successful paid response.
func (c *Client) SettleResponseFrom(resp *http.Response) (*x402.SettleResponse, error) {
	headers := map[string]string{}
	for k, vs := range resp.Header {
		if len(vs) > 0 {
			headers[k] = vs[0]
		}
	}
	return c.x402.GetPaymentSettleResponse(headers)
}

func cloneHTTPClient(base *http.Client, timeout time.Duration) *http.Client {
	c := *base
	c.Timeout = timeout
	return &c
}
