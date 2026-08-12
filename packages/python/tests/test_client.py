import json
import re
from pathlib import Path

import httpx
import pytest

from ax402_sdk.client import Ax402Client
from ax402_sdk.models import Ax402Error, ExchangeRatesSupported, StatsOverview, User

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "test" / "fixtures" / "responses.json").read_text()
)

ROUTES = [
    ("POST", "/auth/signup", 201, "authResponse", False),
    ("POST", "/auth/login", 200, "authResponse", False),
    ("POST", "/auth/logout", 200, "statusOk", False),
    ("POST", "/auth/verify-email", 200, None, False),
    ("GET", "/auth/me", 200, "user", True),
    ("POST", "/auth/resend-verification", 200, None, True),
    ("POST", "/auth/forgot-password", 200, None, False),
    ("POST", "/auth/reset-password", 200, None, False),
    ("PUT", "/auth/password", 200, "statusOk", True),
    ("POST", "/auth/onboarding/complete", 200, "user", True),
    ("GET", "/auth/scopes", 200, "scopes", True),
    ("GET", "/auth/api-keys", 200, "apiKey", True),
    ("POST", "/auth/api-keys", 201, "createdApiKey", True),
    ("DELETE", "/auth/api-keys/key1", 200, None, True),
    ("GET", "/config/platform", 200, "platformConfig", False),
    ("GET", "/domains/suggest", 200, "domainPlan", True),
    ("GET", "/supported-networks", 200, "supportedNetworks", True),
    ("GET", "/stats/overview", 200, "statsOverview", True),
    ("GET", "/exchange-rates", 200, "exchangeRatesAll", True),
    ("GET", "/exchange-rates/supported", 200, "exchangeRatesSupported", True),
    ("POST", "/openapi/parse", 200, "parsedOpenAPI", True),
    ("GET", "/apis", 200, "api", True),
    ("POST", "/apis", 201, "api", True),
    ("GET", "/apis/api1", 200, "api", True),
    ("GET", "/apis/api1/discovery", 200, "discoveryURLs", True),
    ("PUT", "/apis/api1", 200, "api", True),
    ("DELETE", "/apis/api1", 204, None, True),
    ("GET", "/apis/api1/cors", 200, "apiCors", True),
    ("PUT", "/apis/api1/cors", 200, "apiCors", True),
    ("POST", "/apis/api1/cors", 200, "apiCors", True),
    ("DELETE", "/apis/api1/cors", 200, "apiCors", True),
    ("GET", "/apis/api1/endpoints", 200, "endpoint", True),
    ("POST", "/apis/api1/endpoints", 201, "endpoint", True),
    ("PUT", "/apis/api1/endpoints/ep1", 200, "endpoint", True),
    ("DELETE", "/apis/api1/endpoints/ep1", 204, None, True),
    ("POST", "/apis/api1/openapi/import", 200, "importResult", True),
    ("GET", "/apis/api1/domains", 200, "domainSetup", True),
    ("POST", "/apis/api1/domains", 201, "domainSetup", True),
    ("POST", "/apis/api1/domains/dom1/verify", 200, None, True),
    ("DELETE", "/apis/api1/domains/dom1", 204, None, True),
    ("GET", "/apis/api1/stats", 200, "statsOverview", True),
    ("GET", "/apis/api1/settlements", 200, "settlements", True),
    ("GET", "/apis/api1/batch-settlements", 200, "batchSettlements", True),
]


def _match_path(pattern: str, actual: str) -> bool:
    regex = "^" + re.sub(r"\{[^/]+\}", r"[^/]+", pattern) + "$"
    return re.match(regex, actual.split("?")[0]) is not None


def _mock_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    for method, pattern, status, key, require_auth in ROUTES:
        if request.method != method or not _match_path(pattern, path):
            continue
        if require_auth and not request.headers.get("X-API-Key") and not request.headers.get("Authorization"):
            return httpx.Response(401, json={"error": "unauthorized"})
        if status == 204:
            return httpx.Response(204)
        if key is None:
            body = {"status": "ok"}
        elif key in FIXTURES and isinstance(FIXTURES[key], list):
            body = FIXTURES[key]
        elif key in FIXTURES:
            body = FIXTURES[key] if method != "GET" or "api-keys" not in path or key != "apiKey" else [FIXTURES[key]]
            if path.endswith("/endpoints") and method == "GET":
                body = [FIXTURES[key]]
            elif path.endswith("/domains") and method == "GET":
                body = [FIXTURES[key]]
            elif path == "/apis" and method == "GET":
                body = [FIXTURES[key]]
        else:
            body = {"status": "verified"}
        return httpx.Response(status, json=body)
    return httpx.Response(404, json={"error": "not found"})


@pytest.fixture
def client() -> Ax402Client:
    transport = httpx.MockTransport(_mock_handler)
    http = httpx.Client(transport=transport, base_url="http://test")
    return Ax402Client("http://test", api_key="ax402_live_test", http_client=http)


def test_all_routes(client: Ax402Client) -> None:
    client.auth.signup("a@b.com", "password1")
    client.auth.login("a@b.com", "password1")
    client.auth.logout()
    client.auth.verify_email("tok")
    assert client.auth.me().email == "test@example.com"
    client.auth.resend_verification()
    client.auth.forgot_password("a@b.com")
    client.auth.reset_password("tok", "password2")
    client.auth.change_password("old", "newpass12")
    client.auth.complete_onboarding()
    assert client.keys.list_scopes()
    assert len(client.keys.list()) == 1
    client.keys.create("ci", ["apis:read"])
    client.keys.revoke("key1")
    assert client.config.platform().platform_domain
    assert client.domains.suggest("example.com").gateway_hostname
    client.auth.supported_networks()
    overview = client.stats.overview(30)
    assert overview.total_requests == 10
    assert overview.display_currency == "usd"
    assert overview.total_earnings_fiat == "2.50"
    assert client.exchange_rates.supported().default == "usd"
    assert client.exchange_rates.list().quote == "usd"
    client.openapi.parse_spec("openapi: 3")
    assert len(client.apis.list()) == 1
    client.apis.create({"name": "n", "slug": "s", "upstream_base_url": "https://x.com"})
    client.apis.create(
        {
            "name": "n2",
            "slug": "s2",
            "upstream_base_url": "https://x.com",
            "discovery_guidance": "Use GET /v1/*.",
            "discovery_contact_email": "seller@example.com",
            "openapi_version": "1.0.0",
        }
    )
    client.apis.get("api1")
    disc = client.apis.discovery("api1")
    assert disc.openapi_url.endswith("/openapi.json")
    assert disc.well_known_url.endswith("/.well-known/x402.json")
    client.apis.update("api1", {"name": "n"})
    assert client.apis.get_cors("api1").origins == ["http://localhost:5173"]
    client.apis.put_cors("api1", ["http://localhost:5173"])
    client.apis.add_cors_origin("api1", "http://localhost:3000")
    client.apis.remove_cors_origin("api1", "http://localhost:3000")
    client.apis.delete("api1")
    assert len(client.endpoints.list("api1")) == 1
    body = {"method": "GET", "path_pattern": "/v1/*", "accepts": []}
    client.endpoints.create("api1", body)
    client.endpoints.update("api1", "ep1", {"enabled": True})
    client.endpoints.delete("api1", "ep1")
    client.openapi.import_operations("api1", {"operations": [], "accepts": []})
    client.domains.list("api1")
    client.domains.add("api1", "api.example.com")
    client.domains.verify("api1", "dom1")
    client.domains.delete("api1", "dom1")
    assert isinstance(client.stats.for_api("api1"), StatsOverview)
    client.exchange_rates.supported()
    client.settlements.list("api1")
    client.settlements.list_batch("api1")


def test_unauthenticated_me_raises() -> None:
    transport = httpx.MockTransport(_mock_handler)
    http = httpx.Client(transport=transport, base_url="http://test")
    client = Ax402Client("http://test", http_client=http)
    with pytest.raises(Ax402Error) as exc:
        client.auth.me()
    assert exc.value.status == 401


def test_error_parsing() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": "insufficient scope"})

    transport = httpx.MockTransport(handler)
    http = httpx.Client(transport=transport, base_url="http://test")
    client = Ax402Client("http://test", api_key="k", http_client=http)
    with pytest.raises(Ax402Error) as exc:
        client.apis.list()
    assert exc.value.status == 403


def test_from_env_rejects_live_key_in_sandbox(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AX402_BASE_URL", "http://test")
    monkeypatch.setenv("AX402_API_KEY", "ax402_live_secret")
    monkeypatch.setenv("AX402_ENVIRONMENT", "Development")
    monkeypatch.delenv("AX402_JWT", raising=False)
    with pytest.raises(ValueError, match="ax402_test_"):
        Ax402Client.from_env()


def test_from_env_sandbox_normalizes_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AX402_BASE_URL", "http://test")
    monkeypatch.setenv("AX402_API_KEY", "ax402_test_secret")
    monkeypatch.setenv("AX402_ENVIRONMENT", "Development")
    monkeypatch.delenv("AX402_JWT", raising=False)
    client = Ax402Client.from_env()
    assert client._http.environment == "development"
