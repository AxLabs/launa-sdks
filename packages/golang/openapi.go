package ax402

import (
	"context"
	"net/http"
)

func (c *Client) ParseOpenAPI(ctx context.Context, spec string) (*ParsedOpenAPI, error) {
	var out ParsedOpenAPI
	if err := c.do(ctx, http.MethodPost, "/openapi/parse", map[string]string{"spec": spec}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ParseOpenAPIFile(ctx context.Context, filename string, content []byte) (*ParsedOpenAPI, error) {
	var out ParsedOpenAPI
	if err := c.doMultipart(ctx, "/openapi/parse", filename, content, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ImportOpenAPI(ctx context.Context, apiID string, operations []OpenAPIImportOperation, accepts []AcceptOption) (map[string]any, error) {
	var out map[string]any
	body := map[string]any{"operations": operations, "accepts": accepts}
	if err := c.do(ctx, http.MethodPost, "/apis/"+apiID+"/openapi/import", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}
