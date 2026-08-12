package ax402

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

type Credentials struct {
	APIKey string
	Token  string
}

type Client struct {
	baseURL     string
	credentials Credentials
	httpClient  *http.Client
	environment string
}

type ClientOption func(*Client)

func WithHTTPClient(c *http.Client) ClientOption {
	return func(cl *Client) { cl.httpClient = c }
}

func WithEnvironment(env string) ClientOption {
	return func(cl *Client) { cl.environment = strings.TrimSpace(env) }
}

func NewClient(baseURL string, creds Credentials, opts ...ClientOption) *Client {
	cl := &Client{
		baseURL:     strings.TrimRight(baseURL, "/"),
		credentials: creds,
		httpClient:  &http.Client{Timeout: 120 * time.Second},
	}
	for _, o := range opts {
		o(cl)
	}
	return cl
}

func (c *Client) SetAPIKey(key string) { c.credentials.APIKey = key; c.credentials.Token = "" }
func (c *Client) SetToken(token string) {
	c.credentials.Token = token
	c.credentials.APIKey = ""
}

func (c *Client) SetEnvironment(env string) {
	c.environment = strings.TrimSpace(env)
}

func (c *Client) applyAuth(req *http.Request) {
	if c.credentials.APIKey != "" {
		req.Header.Set("X-API-Key", c.credentials.APIKey)
		return
	}
	if c.credentials.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.credentials.Token)
		if c.environment != "" && req.Header.Get("X-Ax402-Environment") == "" {
			req.Header.Set("X-Ax402-Environment", c.environment)
		}
	}
}

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, rdr)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	c.applyAuth(req)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return parseError(resp.StatusCode, data)
	}
	if resp.StatusCode == 204 || out == nil {
		return nil
	}
	return json.Unmarshal(data, out)
}

func (c *Client) doMultipart(ctx context.Context, path string, filename string, content []byte, out any) error {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		return err
	}
	if _, err := part.Write(content); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	c.applyAuth(req)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return parseError(resp.StatusCode, data)
	}
	return json.Unmarshal(data, out)
}

func (c *Client) PlatformConfig(ctx context.Context) (*PlatformConfig, error) {
	var cfg PlatformConfig
	if err := c.do(ctx, http.MethodGet, "/config/platform", nil, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (c *Client) LocalDevConfig(ctx context.Context) (*LocalDevConfig, error) {
	var cfg LocalDevConfig
	if err := c.do(ctx, http.MethodGet, "/config/local-dev", nil, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (c *Client) DevBalances(ctx context.Context, address string) (*DevBalances, error) {
	var out DevBalances
	if err := c.do(ctx, http.MethodPost, "/dev/balances", map[string]string{"address": address}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) DevFaucet(ctx context.Context, address, asset string) (map[string]any, error) {
	if asset == "" {
		asset = "all"
	}
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/dev/faucet", map[string]string{
		"address": address,
		"asset":   asset,
	}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) GetSandboxWallet(ctx context.Context) (*SandboxWallet, error) {
	var out SandboxWallet
	if err := c.do(ctx, http.MethodGet, "/sandbox-wallet", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ResetSandboxWallet(ctx context.Context) (*SandboxWallet, error) {
	var out SandboxWallet
	if err := c.do(ctx, http.MethodPost, "/sandbox-wallet/reset", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) SupportedNetworks(ctx context.Context) (SupportedNetworks, error) {
	var out SupportedNetworks
	if err := c.do(ctx, http.MethodGet, "/supported-networks", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) DomainSuggest(ctx context.Context, apex, prefix, upstreamPath string) (*DomainPlan, error) {
	path := fmt.Sprintf("/domains/suggest?apex=%s&prefix=%s&upstream_path=%s", apex, prefix, upstreamPath)
	var out DomainPlan
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
