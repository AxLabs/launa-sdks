package launa

import (
	"context"
	"net/http"
)

type MPPConfig struct {
	Enabled   bool   `json:"enabled"`
	BuyerAuth string `json:"buyer_auth"`
}
type MPPReadiness struct {
	Ready          bool   `json:"ready"`
	ProfileID      string `json:"profile_id,omitempty"`
	DisabledReason string `json:"disabled_reason,omitempty"`
	CheckedAt      string `json:"checked_at,omitempty"`
}
type CardPaymentConfig struct {
	MPP         *MPPConfig `json:"mpp,omitempty"`
	Enabled     bool       `json:"enabled"`
	Currency    string     `json:"currency"`
	AmountMinor string     `json:"amount_minor"`
}
type StripeConnection struct {
	MPP               *MPPReadiness `json:"mpp,omitempty"`
	StripeEnvironment string        `json:"stripe_environment,omitempty"`
	Requirements      []string      `json:"requirements,omitempty"`
	DisabledReason    string        `json:"disabled_reason,omitempty"`
	ID                string        `json:"id,omitempty"`
	Available         *bool         `json:"available,omitempty"`
	Connected         bool          `json:"connected"`
	Ready             bool          `json:"ready"`
	AccountID         string        `json:"account_id,omitempty"`
	Environment       string        `json:"environment,omitempty"`
}
type CardPayment struct {
	AuthenticationExpiresAt string `json:"authentication_expires_at,omitempty"`
	EntryPoint              string `json:"entry_point,omitempty"`
	SettledAt               string `json:"settled_at,omitempty"`
	PaymentIntentID         string `json:"payment_intent_id,omitempty"`
	CreatedAt               string `json:"created_at,omitempty"`
	StripeEnvironment       string `json:"stripe_environment,omitempty"`
	RefundedAmountMinor     int64  `json:"refunded_amount_minor"`
	ID                      string `json:"id"`
	APIID                   string `json:"api_id"`
	EndpointID              string `json:"endpoint_id"`
	AccountID               string `json:"account_id"`
	Currency                string `json:"currency"`
	AmountMinor             int64  `json:"amount_minor"`
	Status                  string `json:"status"`
	Delivery                string `json:"delivery"`
}

func (c *Client) StripeConnection(ctx context.Context) (*StripeConnection, error) {
	var out StripeConnection
	err := c.do(ctx, http.MethodGet, "/payment-accounts/stripe", nil, &out)
	return &out, err
}
func (c *Client) ConnectStripe(ctx context.Context) (string, error) {
	var out struct {
		URL string `json:"url"`
	}
	err := c.do(ctx, http.MethodPost, "/payment-accounts/stripe/connect", nil, &out)
	return out.URL, err
}
func (c *Client) CompleteStripeConnection(ctx context.Context, code, state string) (*StripeConnection, error) {
	var out StripeConnection
	err := c.do(ctx, http.MethodPost, "/payment-accounts/stripe/complete", map[string]string{"code": code, "state": state}, &out)
	return &out, err
}
func (c *Client) DisconnectStripe(ctx context.Context, connectionID string) error {
	return c.do(ctx, http.MethodDelete, "/payment-accounts/stripe", map[string]string{"connection_id": connectionID}, nil)
}
func (c *Client) ListCardPayments(ctx context.Context) ([]CardPayment, error) {
	var out []CardPayment
	err := c.do(ctx, http.MethodGet, "/card-payments", nil, &out)
	return out, err
}
