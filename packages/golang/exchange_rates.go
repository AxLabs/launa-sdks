package launa

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

type ExchangeRatesSupported struct {
	Currencies []string `json:"currencies"`
	Default    string   `json:"default"`
}

type ExchangeRateLookup struct {
	PriceTokenID string `json:"price_token_id"`
	Rate         string `json:"rate"`
	RateDate     string `json:"rate_date"`
	Source       string `json:"source"`
	Quote        string `json:"quote"`
}

type TokenExchangeRate struct {
	TokenID      string `json:"token_id"`
	Symbol       string `json:"symbol"`
	Network      string `json:"network"`
	Asset        string `json:"asset"`
	PriceTokenID string `json:"price_token_id"`
	Rate         string `json:"rate"`
	Source       string `json:"source"`
}

type ExchangeRatesAll struct {
	Quote    string              `json:"quote"`
	RateDate string              `json:"rate_date"`
	Rates    []TokenExchangeRate `json:"rates"`
}

func (c *Client) ExchangeRatesAll(ctx context.Context, quote, date string) (*ExchangeRatesAll, error) {
	params := url.Values{}
	if quote != "" {
		params.Set("quote", quote)
	}
	if date != "" {
		params.Set("date", date)
	}
	path := "/exchange-rates"
	if enc := params.Encode(); enc != "" {
		path += "?" + enc
	}
	var out ExchangeRatesAll
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ExchangeRatesSupported(ctx context.Context) (*ExchangeRatesSupported, error) {
	var out ExchangeRatesSupported
	if err := c.do(ctx, http.MethodGet, "/exchange-rates/supported", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ExchangeRatesLookup(ctx context.Context, network, asset, quote, date string) (*ExchangeRateLookup, error) {
	params := url.Values{}
	params.Set("network", network)
	params.Set("asset", asset)
	if quote != "" {
		params.Set("quote", quote)
	}
	if date != "" {
		params.Set("date", date)
	}
	var out ExchangeRateLookup
	if err := c.do(ctx, http.MethodGet, "/exchange-rates/lookup?"+params.Encode(), nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func ExportPaymentHistoryURL(query PaymentHistoryQuery, format string) string {
	params := url.Values{}
	days := query.Days
	if days == 0 {
		days = 30
	}
	params.Set("days", fmt.Sprintf("%d", days))
	if query.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", query.Limit))
	}
	if query.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", query.Offset))
	}
	if query.APIID != "" {
		params.Set("api_id", query.APIID)
	}
	params.Set("format", format)
	if format == "json" {
		params.Set("download", "1")
	}
	return "/settlements?" + params.Encode()
}
