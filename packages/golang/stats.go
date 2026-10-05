package launa

import (
	"context"
	"fmt"
	"net/http"
)

func (c *Client) StatsOverview(ctx context.Context, days int) (StatsOverview, error) {
	var out StatsOverview
	path := fmt.Sprintf("/stats/overview?days=%d", days)
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) APIStats(ctx context.Context, apiID string, days int) (StatsOverview, error) {
	var out StatsOverview
	path := fmt.Sprintf("/apis/%s/stats?days=%d", apiID, days)
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
