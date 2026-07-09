package ax402

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
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

func (c *Client) CheckSlugAvailability(ctx context.Context, slug, excludeAPIID string) (map[string]any, error) {
	q := url.Values{"slug": {slug}}
	if excludeAPIID != "" {
		q.Set("exclude_api_id", excludeAPIID)
	}
	var out map[string]any
	path := fmt.Sprintf("/apis/slug-availability?%s", q.Encode())
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type UpstreamProbe struct {
	EndpointID string `json:"endpoint_id"`
	Path       string `json:"path,omitempty"`
}

func (c *Client) ProbeUpstream(ctx context.Context, apiID string, probes []UpstreamProbe) (map[string]any, error) {
	body := map[string]any{}
	if len(probes) > 0 {
		body["probes"] = probes
	}
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/readiness/upstream", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}
