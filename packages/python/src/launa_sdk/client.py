from __future__ import annotations

import os

import httpx

from .http import HttpTransport
from .resources.apis import APIsResource
from .resources.auth import AuthResource
from .resources.billing import BillingResource
from .resources.config import ConfigResource
from .resources.domains import DomainsResource
from .resources.endpoints import EndpointsResource
from .resources.income import IncomeResource
from .resources.keys import KeysResource
from .resources.openapi import OpenAPIResource
from .resources.settlements import SettlementsResource
from .resources.stats import StatsResource


class LaunaClient:
    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        token: str | None = None,
        timeout: float = 120.0,
        http_client: httpx.Client | None = None,
    ) -> None:
        import httpx

        self._http = HttpTransport(
            base_url,
            api_key=api_key,
            token=token,
            timeout=timeout,
            client=http_client,
        )
        self.auth = AuthResource(self._http)
        self.keys = KeysResource(self._http)
        self.apis = APIsResource(self._http)
        self.endpoints = EndpointsResource(self._http)
        self.domains = DomainsResource(self._http)
        self.openapi = OpenAPIResource(self._http)
        self.stats = StatsResource(self._http)
        self.settlements = SettlementsResource(self._http)
        self.billing = BillingResource(self._http)
        self.income = IncomeResource(self._http)
        self.config = ConfigResource(self._http)

    def set_api_key(self, api_key: str) -> None:
        self._http.api_key = api_key
        self._http.token = None

    def set_token(self, token: str) -> None:
        self._http.token = token
        self._http.api_key = None

    # Back-compat flat methods
    def me(self):
        return self.auth.me()

    def platform_config(self):
        return self.config.platform()

    def list_apis(self):
        return self.apis.list()

    def create_api(self, **kwargs):
        return self.apis.create(kwargs)

    def get_api(self, api_id: str):
        return self.apis.get(api_id)

    def delete_api(self, api_id: str):
        return self.apis.delete(api_id)

    def list_endpoints(self, api_id: str):
        return self.endpoints.list(api_id)

    def create_endpoint(self, api_id: str, body: dict):
        return self.endpoints.create(api_id, body)

    def parse_openapi(self, spec: str):
        return self.openapi.parse_spec(spec)

    def stats_overview(self, days: int = 30):
        return self.stats.overview(days)

    def supported_networks(self):
        return self.auth.supported_networks()

    @classmethod
    def from_env(cls) -> LaunaClient:
        base = os.environ.get("LAUNA_BASE_URL", "http://api.localhost:8090")
        return cls(base, api_key=os.environ.get("LAUNA_API_KEY"), token=os.environ.get("LAUNA_JWT"))
