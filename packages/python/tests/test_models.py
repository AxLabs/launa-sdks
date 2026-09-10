import json
from pathlib import Path

from ax402_sdk.models import API, DiscoveryURLs, Endpoint, StatsOverview, User


FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "test" / "fixtures" / "responses.json").read_text()
)


def test_user_model() -> None:
    User.model_validate(FIXTURES["user"])


def test_api_model() -> None:
    api = API.model_validate(FIXTURES["api"])
    assert api.discovery_guidance == "Use GET /v1/*."
    assert api.pay_to_addresses == {"hedera:testnet": "0.0.1234"}


def test_api_model_defaults_empty_pay_to_addresses() -> None:
    raw = {k: v for k, v in FIXTURES["api"].items() if k != "pay_to_addresses"}
    api = API.model_validate(raw)
    assert api.pay_to_addresses == {}


def test_api_model_null_pay_to_addresses_and_cors() -> None:
    raw = {**FIXTURES["api"], "pay_to_addresses": None, "cors_allowed_origins": None}
    api = API.model_validate(raw)
    assert api.pay_to_addresses == {}
    assert api.cors_allowed_origins == []


def test_discovery_urls_model() -> None:
    disc = DiscoveryURLs.model_validate(FIXTURES["discoveryURLs"])
    assert disc.openapi_url.endswith("/openapi.json")
    assert disc.well_known_url.endswith("/.well-known/x402.json")


def test_endpoint_model() -> None:
    ep = Endpoint.model_validate(FIXTURES["endpoint"])
    assert ep.schema_source == "inferred"


def test_ephemeral_endpoint_model() -> None:
    ep = Endpoint.model_validate(FIXTURES["endpointEphemeral"])
    assert ep.ttl == 1800
    assert ep.expires_at == "2026-07-24T13:30:00Z"


def test_stats_overview_model() -> None:
    StatsOverview.model_validate(FIXTURES["statsOverview"])
