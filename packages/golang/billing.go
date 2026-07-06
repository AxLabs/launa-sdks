package ax402

import (
	"context"
	"net/http"
)

func (c *Client) BillingOverview(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/billing", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) BillingPackages(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/billing/packages", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) BillingInvoices(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/billing/invoices", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
