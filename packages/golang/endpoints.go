package ax402

import (
	"context"
	"net/http"
)

func (c *Client) ListEndpoints(ctx context.Context, apiID string) ([]Endpoint, error) {
	var out []Endpoint
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/endpoints", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) CreateEndpoint(ctx context.Context, apiID string, in CreateEndpointInput) (*Endpoint, error) {
	var out Endpoint
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/endpoints", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) UpdateEndpoint(ctx context.Context, apiID, endpointID string, in UpdateEndpointInput) (*Endpoint, error) {
	var out Endpoint
	if err := c.do(ctx, http.MethodPut, "/apis/"+apiID+"/endpoints/"+endpointID, in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) DeleteEndpoint(ctx context.Context, apiID, endpointID string) error {
	return c.do(ctx, http.MethodDelete, "/apis/"+apiID+"/endpoints/"+endpointID, nil, nil)
}
