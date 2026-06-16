package ax402

import (
	"encoding/json"
	"fmt"
)

type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string {
	return fmt.Sprintf("ax402: %d %s", e.Status, e.Message)
}

func parseError(status int, body []byte) error {
	var payload struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(body, &payload) == nil && payload.Error != "" {
		return &Error{Status: status, Message: payload.Error}
	}
	return &Error{Status: status, Message: string(body)}
}

const (
	ScopeAPIsRead        = "apis:read"
	ScopeAPIsWrite       = "apis:write"
	ScopeEndpointsRead   = "endpoints:read"
	ScopeEndpointsWrite  = "endpoints:write"
	ScopeDomainsRead     = "domains:read"
	ScopeDomainsWrite    = "domains:write"
	ScopeStatsRead       = "stats:read"
	ScopeSettlementsRead = "settlements:read"
	ScopeOpenAPIRead     = "openapi:read"
	ScopeBillingRead     = "billing:read"
	ScopeBillingWrite    = "billing:write"
	ScopeIncomeRead      = "income:read"
	ScopeIncomePayout    = "income:payout"
)

var ScopePresets = map[string][]string{
	"readonly": {
		ScopeAPIsRead, ScopeEndpointsRead, ScopeDomainsRead,
		ScopeStatsRead, ScopeSettlementsRead, ScopeOpenAPIRead,
		ScopeBillingRead, ScopeIncomeRead,
	},
	"apiManager": {
		ScopeAPIsRead, ScopeAPIsWrite, ScopeEndpointsRead, ScopeEndpointsWrite,
		ScopeDomainsRead, ScopeDomainsWrite, ScopeOpenAPIRead,
	},
	"analytics": {ScopeStatsRead, ScopeSettlementsRead, ScopeBillingRead, ScopeIncomeRead},
}
