package buyer

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	x402 "github.com/x402-foundation/x402/go"
	x402http "github.com/x402-foundation/x402/go/http"
	x402evm "github.com/x402-foundation/x402/go/mechanisms/evm"
	batchevm "github.com/x402-foundation/x402/go/mechanisms/evm/batch-settlement/client"
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

// BatchOptions configures batch-settlement scheme registration alongside exact.
type BatchOptions struct {
	ChannelSalt       string
	DepositMultiplier int
}

// Options configures a buyer Client.
type Options struct {
	HTTPClient *http.Client
	Timeout    time.Duration
	Batch      *BatchOptions
}

const defaultBatchSalt = "0x0000000000000000000000000000000000000000000000000000000000000000"

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
	if o.Batch != nil {
		salt := o.Batch.ChannelSalt
		if salt == "" {
			salt = defaultBatchSalt
		}
		mult := o.Batch.DepositMultiplier
		if mult == 0 {
			mult = batchevm.DefaultDepositMultiplier
		}
		x402Client.Register("eip155:*", batchevm.NewBatchSettlementEvmScheme(signer, &batchevm.BatchSettlementEvmSchemeOptions{
			Salt:              salt,
			DepositMultiplier: mult,
		}))
	}
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

// NewFromEnv builds a Client from LAUNA_EVM_PRIVATE_KEY (or EVM_PRIVATE_KEY).
// Hedera buyer signing is not available in the Go SDK yet — use TypeScript
// @launa/sdk/buyer with HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY.
func NewFromEnv(opts ...Options) (*Client, error) {
	key := strings.TrimSpace(os.Getenv("LAUNA_EVM_PRIVATE_KEY"))
	if key == "" {
		key = strings.TrimSpace(os.Getenv("EVM_PRIVATE_KEY"))
	}
	if key != "" {
		return NewFromPrivateKey(key, opts...)
	}
	if strings.TrimSpace(os.Getenv("HEDERA_ACCOUNT_ID")) != "" ||
		strings.TrimSpace(os.Getenv("HEDERA_PRIVATE_KEY")) != "" {
		return nil, fmt.Errorf("hedera buyer signing is not supported in the Go SDK; use TypeScript @launa/sdk/buyer with HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY")
	}
	return nil, fmt.Errorf("LAUNA_EVM_PRIVATE_KEY or EVM_PRIVATE_KEY required")
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
