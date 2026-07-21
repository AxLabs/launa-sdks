package ax402

import (
	"context"
	_ "embed"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

//go:embed testdata/responses.json
var fixtureJSON []byte

type mockRoute struct {
	Method      string          `json:"-"`
	Path        string          `json:"-"`
	Status      int             `json:"-"`
	Body        json.RawMessage `json:"-"`
	Empty       bool            `json:"-"`
	RequireAuth bool            `json:"-"`
}

func loadMockRoutes() []mockRoute {
	var fixtures map[string]json.RawMessage
	if err := json.Unmarshal(fixtureJSON, &fixtures); err != nil {
		panic(err)
	}
	defs := []struct {
		method, path string
		status       int
		key          string
		empty        bool
		requireAuth  bool
	}{
		{"POST", "/auth/signup", 201, "authResponse", false, false},
		{"POST", "/auth/login", 200, "authResponse", false, false},
		{"POST", "/auth/logout", 200, "statusOk", false, false},
		{"POST", "/auth/verify-email", 200, `{"status":"verified"}`, false, false},
		{"GET", "/auth/me", 200, "user", false, true},
		{"POST", "/auth/resend-verification", 200, `{"status":"sent"}`, false, true},
		{"POST", "/auth/forgot-password", 200, `{"status":"sent"}`, false, false},
		{"POST", "/auth/reset-password", 200, `{"status":"ok"}`, false, false},
		{"PUT", "/auth/password", 200, "statusOk", false, true},
		{"POST", "/auth/onboarding/complete", 200, "user", false, true},
		{"GET", "/auth/scopes", 200, "scopes", false, true},
		{"GET", "/auth/api-keys", 200, `[` + string(fixtures["apiKey"]) + `]`, false, true},
		{"POST", "/auth/api-keys", 201, "createdApiKey", false, true},
		{"DELETE", "/auth/api-keys/key1", 200, `{"status":"revoked"}`, false, true},
		{"GET", "/config/platform", 200, "platformConfig", false, false},
		{"GET", "/domains/suggest", 200, "domainPlan", false, true},
		{"GET", "/supported-networks", 200, "supportedNetworks", false, true},
		{"GET", "/stats/overview", 200, "statsOverview", false, true},
		{"GET", "/exchange-rates", 200, "exchangeRatesAll", false, true},
		{"GET", "/exchange-rates/supported", 200, "exchangeRatesSupported", false, true},
		{"POST", "/openapi/parse", 200, "parsedOpenAPI", false, true},
		{"GET", "/apis", 200, `[` + string(fixtures["api"]) + `]`, false, true},
		{"POST", "/apis", 201, "api", false, true},
		{"GET", "/apis/api1", 200, "api", false, true},
		{"PUT", "/apis/api1", 200, "api", false, true},
		{"DELETE", "/apis/api1", 204, "", true, true},
		{"GET", "/apis/api1/cors", 200, "apiCors", false, true},
		{"PUT", "/apis/api1/cors", 200, "apiCors", false, true},
		{"POST", "/apis/api1/cors", 200, "apiCors", false, true},
		{"DELETE", "/apis/api1/cors", 200, "apiCors", false, true},
		{"GET", "/apis/api1/endpoints", 200, `[` + string(fixtures["endpoint"]) + `]`, false, true},
		{"POST", "/apis/api1/endpoints", 201, "endpoint", false, true},
		{"PUT", "/apis/api1/endpoints/ep1", 200, "endpoint", false, true},
		{"DELETE", "/apis/api1/endpoints/ep1", 204, "", true, true},
		{"POST", "/apis/api1/openapi/import", 200, "importResult", false, true},
		{"GET", "/apis/api1/domains", 200, `[` + string(fixtures["domainSetup"]) + `]`, false, true},
		{"POST", "/apis/api1/domains", 201, "domainSetup", false, true},
		{"POST", "/apis/api1/domains/dom1/verify", 200, `{"status":"verified"}`, false, true},
		{"DELETE", "/apis/api1/domains/dom1", 204, "", true, true},
		{"GET", "/apis/api1/stats", 200, "statsOverview", false, true},
		{"GET", "/apis/api1/settlements", 200, "settlements", false, true},
		{"GET", "/apis/api1/webhook-deliveries", 200, "[]", false, true},
		{"GET", "/apis/api1/batch-settlements", 200, "batchSettlements", false, true},
	}
	var routes []mockRoute
	for _, d := range defs {
		var body json.RawMessage
		if !d.empty {
			if strings.HasPrefix(d.key, "{") || strings.HasPrefix(d.key, "[") {
				body = json.RawMessage(d.key)
			} else {
				body = fixtures[d.key]
			}
		}
		routes = append(routes, mockRoute{
			Method: d.method, Path: d.path, Status: d.status, Body: body,
			Empty: d.empty, RequireAuth: d.requireAuth,
		})
	}
	return routes
}

func matchPath(pattern, actual string) bool {
	re := regexp.MustCompile("^" + regexp.MustCompile(`\{[^/]+\}`).ReplaceAllString(pattern, `[^/]+`) + "$")
	return re.MatchString(strings.Split(actual, "?")[0])
}

func newMockServer(t *testing.T) *httptest.Server {
	t.Helper()
	routes := loadMockRoutes()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.Split(r.URL.Path, "?")[0]
		for _, route := range routes {
			if route.Method != r.Method || !matchPath(route.Path, path) {
				continue
			}
			if route.RequireAuth {
				if r.Header.Get("X-API-Key") == "" && r.Header.Get("Authorization") == "" {
					w.WriteHeader(http.StatusUnauthorized)
					_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
					return
				}
			}
			if route.Status == 0 {
				w.WriteHeader(http.StatusOK)
			} else {
				w.WriteHeader(route.Status)
			}
			if route.Empty {
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(route.Body)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"not found"}`))
	}))
}

func TestAllRoutes(t *testing.T) {
	srv := newMockServer(t)
	defer srv.Close()
	cl := NewClient(srv.URL, Credentials{APIKey: "ax402_live_test"})
	ctx := context.Background()

	if _, err := cl.Signup(ctx, "a@b.com", "password1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.Login(ctx, "a@b.com", "password1"); err != nil {
		t.Fatal(err)
	}
	if err := cl.Logout(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.VerifyEmail(ctx, "tok"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.Me(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ResendVerification(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ForgotPassword(ctx, "a@b.com"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ResetPassword(ctx, "tok", "password2"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ChangePassword(ctx, "old", "newpass12"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.CompleteOnboarding(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListScopes(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListAPIKeys(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.CreateAPIKey(ctx, "ci", []string{"apis:read"}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.RevokeAPIKey(ctx, "key1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.PlatformConfig(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.DomainSuggest(ctx, "example.com", "x402", "/api"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.SupportedNetworks(ctx); err != nil {
		t.Fatal(err)
	}
	overview, err := cl.StatsOverview(ctx, 30)
	if err != nil {
		t.Fatal(err)
	}
	if overview["total_requests"] != float64(10) {
		t.Fatalf("total_requests: %v", overview["total_requests"])
	}
	if overview["display_currency"] != "usd" {
		t.Fatalf("display_currency: %v", overview["display_currency"])
	}
	if _, err := cl.ExchangeRatesSupported(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ExchangeRatesAll(ctx, "usd", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ParseOpenAPI(ctx, "openapi: 3"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListAPIs(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.CreateAPI(ctx, CreateAPIInput{Name: "n", Slug: "s", UpstreamBaseURL: "https://x.com"}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.GetAPI(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.UpdateAPI(ctx, "api1", CreateAPIInput{Name: "n", Slug: "s", UpstreamBaseURL: "https://x.com"}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.GetAPICORS(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.PutAPICORS(ctx, "api1", []string{"http://localhost:5173"}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.AddAPICORSOrigin(ctx, "api1", "http://localhost:3000"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.RemoveAPICORSOrigin(ctx, "api1", "http://localhost:3000"); err != nil {
		t.Fatal(err)
	}
	if err := cl.DeleteAPI(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListEndpoints(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	accept := BuildUsdcAccept("exact", "100000")
	if _, err := cl.CreateEndpoint(ctx, "api1", CreateEndpointInput{Method: "GET", PathPattern: "/v1/*", Accepts: []AcceptOption{accept}}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.UpdateEndpoint(ctx, "api1", "ep1", UpdateEndpointInput{Enabled: boolPtr(true)}); err != nil {
		t.Fatal(err)
	}
	if err := cl.DeleteEndpoint(ctx, "api1", "ep1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ImportOpenAPI(ctx, "api1", []map[string]string{{"method": "GET", "path_pattern": "/v1/foo"}}, []AcceptOption{accept}); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListDomains(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.AddDomain(ctx, "api1", "api.example.com"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.VerifyDomain(ctx, "api1", "dom1"); err != nil {
		t.Fatal(err)
	}
	if err := cl.DeleteDomain(ctx, "api1", "dom1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.APIStats(ctx, "api1", 30); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ExchangeRatesSupported(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListSettlements(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListWebhookDeliveries(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ListBatchSettlements(ctx, "api1"); err != nil {
		t.Fatal(err)
	}
}

func boolPtr(v bool) *bool { return &v }

func TestUnauthenticatedMe(t *testing.T) {
	srv := newMockServer(t)
	defer srv.Close()
	cl := NewClient(srv.URL, Credentials{})
	_, err := cl.Me(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	axErr, ok := err.(*Error)
	if !ok || axErr.Status != 401 {
		t.Fatalf("got %v", err)
	}
}

func TestErrorParsing(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":"insufficient scope"}`))
	}))
	defer srv.Close()

	cl := NewClient(srv.URL, Credentials{APIKey: "ax402_live_test"})
	_, err := cl.ListAPIs(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	axErr, ok := err.(*Error)
	if !ok || axErr.Status != 403 {
		t.Fatalf("got %v", err)
	}
}

func TestGatewayURL(t *testing.T) {
	got := GatewayURL("myapi.localhost", "/v1/data", 8090)
	if got != "http://myapi.localhost:8090/v1/data" {
		t.Fatalf("got %s", got)
	}
}
