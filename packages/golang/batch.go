package launa

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

type PaymentHistoryQuery struct {
	Days   int
	Limit  int
	Offset int
	APIID  string
}

type PaymentHistoryPage struct {
	Items  []PaymentActivity `json:"items"`
	Total  int               `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type PaymentActivity struct {
	ID        string `json:"id"`
	APIID     string `json:"api_id,omitempty"`
	Type      string `json:"type,omitempty"`
	Payer     string `json:"payer"`
	Amount    string `json:"amount"`
	Network   string `json:"network"`
	Tx        string `json:"tx,omitempty"`
	CreatedAt string `json:"created_at"`
}

func paymentHistoryQueryString(q PaymentHistoryQuery) string {
	params := url.Values{}
	days := q.Days
	if days == 0 {
		days = 30
	}
	params.Set("days", fmt.Sprintf("%d", days))
	if q.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", q.Limit))
	}
	if q.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", q.Offset))
	}
	if q.APIID != "" {
		params.Set("api_id", q.APIID)
	}
	return params.Encode()
}

type BatchIntervals struct {
	ClaimIntervalSecs  int `json:"claim_interval_secs"`
	SettleIntervalSecs int `json:"settle_interval_secs"`
	RefundIntervalSecs int `json:"refund_interval_secs"`
}

type BatchOverview struct {
	HasBatchEndpoints bool             `json:"has_batch_endpoints"`
	Settings          BatchIntervals   `json:"settings"`
	WithdrawDelaySecs int              `json:"withdraw_delay_secs"`
	Channels          []map[string]any `json:"channels"`
	BatchSettlements  []map[string]any `json:"batch_settlements"`
	Vouchers          []map[string]any `json:"vouchers"`
	Deposits          []map[string]any `json:"deposits"`
}

func (c *Client) BatchOverview(ctx context.Context, apiID string) (*BatchOverview, error) {
	var out BatchOverview
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/batch", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) UpdateBatchSettings(ctx context.Context, apiID string, settings BatchIntervals) (*BatchOverview, error) {
	var out BatchOverview
	if err := c.do(ctx, http.MethodPut, "/apis/"+apiID+"/batch/settings", settings, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
