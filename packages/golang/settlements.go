package ax402

import (
	"context"
	"net/http"
)

func (c *Client) ListSettlements(ctx context.Context, apiID string) ([]Settlement, error) {
	var out []Settlement
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/settlements", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) ListBatchSettlements(ctx context.Context, apiID string) ([]BatchSettlement, error) {
	var out []BatchSettlement
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/batch-settlements", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
