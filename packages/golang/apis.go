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

func (c *Client) ListWebhookDeliveries(ctx context.Context, apiID string) ([]WebhookDelivery, error) {
	var out []WebhookDelivery
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/webhook-deliveries", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) GetAPICORS(ctx context.Context, apiID string) (*APICorsOrigins, error) {
	var out APICorsOrigins
	if err := c.do(ctx, http.MethodGet, "/apis/"+apiID+"/cors", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) PutAPICORS(ctx context.Context, apiID string, origins []string) (*APICorsOrigins, error) {
	if origins == nil {
		origins = []string{}
	}
	var out APICorsOrigins
	if err := c.do(ctx, http.MethodPut, "/apis/"+apiID+"/cors", map[string]any{"origins": origins}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) AddAPICORSOrigin(ctx context.Context, apiID, origin string) (*APICorsOrigins, error) {
	var out APICorsOrigins
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/cors", map[string]any{"origin": origin}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) RemoveAPICORSOrigin(ctx context.Context, apiID, origin string) (*APICorsOrigins, error) {
	q := url.Values{"origin": {origin}}
	var out APICorsOrigins
	if err := c.do(ctx, http.MethodDelete, "/apis/"+apiID+"/cors?"+q.Encode(), nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
