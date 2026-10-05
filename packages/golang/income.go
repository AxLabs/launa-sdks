package launa

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

func (c *Client) IncomeSummary(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/income/summary", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type IncomeLedgerQuery struct {
	Limit   int
	Offset  int
	APIID   string
	Network string
}

func (c *Client) IncomeLedger(ctx context.Context, query IncomeLedgerQuery) (map[string]any, error) {
	params := url.Values{}
	if query.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", query.Limit))
	}
	if query.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", query.Offset))
	}
	if query.APIID != "" {
		params.Set("api_id", query.APIID)
	}
	if query.Network != "" {
		params.Set("network", query.Network)
	}
	path := "/income/ledger"
	if enc := params.Encode(); enc != "" {
		path += "?" + enc
	}
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) IncomeLedgerEntry(ctx context.Context, entryID string) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/income/ledger/"+entryID, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) IncomePayoutRequests(ctx context.Context) ([]map[string]any, error) {
	var out []map[string]any
	if err := c.do(ctx, http.MethodGet, "/income/payout-requests", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
