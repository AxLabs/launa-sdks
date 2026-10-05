package launa

import (
	"context"
	"net/http"
)

func (c *Client) ConfigBilling(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/config/billing", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type WaitlistJoinInput struct {
	Email   string `json:"email"`
	Name    string `json:"name,omitempty"`
	Company string `json:"company,omitempty"`
	Source  string `json:"source,omitempty"`
}

func (c *Client) JoinWaitlist(ctx context.Context, in WaitlistJoinInput) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodPost, "/waitlist", in, &out); err != nil {
		return nil, err
	}
	return out, nil
}
