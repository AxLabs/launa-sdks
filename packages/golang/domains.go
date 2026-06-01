package ax402

import (
	"context"
	"net/http"
)

func (c *Client) ListDomains(ctx context.Context, apiID string) ([]DomainSetup, error) {
	var out []DomainSetup
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/domains", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) AddDomain(ctx context.Context, apiID, hostname string) (*DomainSetup, error) {
	var out DomainSetup
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/domains", map[string]string{"hostname": hostname}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) VerifyDomain(ctx context.Context, apiID, domainID string) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/domains/"+domainID+"/verify", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
