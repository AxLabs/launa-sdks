import json
import re
from pathlib import Path

import httpx
import pytest

from launa_sdk.client import LaunaClient
from launa_sdk.models import LaunaError, StatsOverview, User

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
    ("POST", "/openapi/parse", 200, "parsedOpenAPI", True),
    ("GET", "/apis", 200, "api", True),
    ("POST", "/apis", 201, "api", True),
    ("GET", "/apis/api1", 200, "api", True),
    ("PUT", "/apis/api1", 200, "api", True),
    ("DELETE", "/apis/api1", 204, None, True),
    ("GET", "/apis/api1/endpoints", 200, "endpoint", True),
    ("POST", "/apis/api1/endpoints", 201, "endpoint", True),
    ("PUT", "/apis/api1/endpoints/ep1", 200, "endpoint", True),
    ("DELETE", "/apis/api1/endpoints/ep1", 204, None, True),
    ("POST", "/apis/api1/openapi/import", 200, "importResult", True),
    ("GET", "/apis/api1/domains", 200, "domainSetup", True),
    ("POST", "/apis/api1/domains", 201, "domainSetup", True),
    ("POST", "/apis/api1/domains/dom1/verify", 200, None, True),
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
def client() -> LaunaClient:
    transport = httpx.MockTransport(_mock_handler)
    http = httpx.Client(transport=transport, base_url="http://test")
    return LaunaClient("http://test", api_key="launa_live_test", http_client=http)


def test_all_routes(client: LaunaClient) -> None:
    client.auth.signup("a@b.com", "password1")
    client.auth.login("a@b.com", "password1")
    client.auth.logout()
    client.auth.verify_email("tok")
    assert isinstance(client.auth.me(), User)
    client.auth.resend_verification()
    client.auth.change_password("old", "newpass12")
    client.auth.complete_onboarding()
    assert client.keys.list_scopes()
    assert client.keys.list()
    client.keys.create("ci", ["apis:read"])
    client.keys.revoke("key1")
    client.config.platform()
    client.domains.suggest("example.com")
    client.auth.supported_networks()
    assert isinstance(client.stats.overview(30), StatsOverview)
    client.openapi.parse_spec("openapi: 3")
    assert client.apis.list()
    client.apis.create({"name": "n", "slug": "s", "upstream_base_url": "https://x.com"})
    client.apis.get("api1")
    client.apis.update("api1", {"name": "n"})
    client.apis.delete("api1")
    assert client.endpoints.list("api1")
    body = {"method": "GET", "path_pattern": "/v1/*", "accepts": []}
    client.endpoints.create("api1", body)
    client.endpoints.update("api1", "ep1", {"enabled": True})
    client.endpoints.delete("api1", "ep1")
    client.openapi.import_operations("api1", {"operations": [], "accepts": []})
    client.domains.list("api1")
    client.domains.add("api1", "api.example.com")
    client.domains.verify("api1", "dom1")
    client.stats.for_api("api1")
    client.settlements.list("api1")
    client.settlements.list_batch("api1")


def test_error_parsing() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": "insufficient scope"})

    transport = httpx.MockTransport(handler)
    http = httpx.Client(transport=transport, base_url="http://test")
    client = LaunaClient("http://test", api_key="k", http_client=http)
    with pytest.raises(LaunaError) as exc:
        client.apis.list()
    assert exc.value.status == 403
