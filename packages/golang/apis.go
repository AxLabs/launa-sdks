package launa

import (
	"context"
	"net/http"
)

func (c *Client) ListAPIs(ctx context.Context) ([]API, error) {
	var out []API
	if err := c.do(ctx, http.MethodGet, "/apis", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) CreateAPI(ctx context.Context, in CreateAPIInput) (*API, error) {
	var out API
	if err := c.do(ctx, http.MethodPost, "/apis", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetAPI(ctx context.Context, id string) (*API, error) {
	var out API
	if err := c.do(ctx, http.MethodGet, "/apis/"+id, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) UpdateAPI(ctx context.Context, id string, in CreateAPIInput) (*API, error) {
	var out API
	if err := c.do(ctx, http.MethodPut, "/apis/"+id, in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) DeleteAPI(ctx context.Context, id string) error {
	return c.do(ctx, http.MethodDelete, "/apis/"+id, nil, nil)
}
