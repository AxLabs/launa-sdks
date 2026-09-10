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
from .resources.exchange_rates import ExchangeRatesResource
from .resources.income import IncomeResource
from .resources.keys import KeysResource
from .resources.openapi import OpenAPIResource
from .resources.sandbox_wallet import SandboxWalletResource
from .resources.stats import StatsResource
from .resources.settlements import SettlementsResource


class Ax402Client:
    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        token: str | None = None,
        environment: str | None = None,
        timeout: float = 120.0,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._http = HttpTransport(
            base_url,
            api_key=api_key,
            token=token,
            environment=environment,
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
        self.exchange_rates = ExchangeRatesResource(self._http)
        self.config = ConfigResource(self._http)
        self.sandbox_wallet = SandboxWalletResource(self._http)

    def set_api_key(self, api_key: str) -> None:
        self._http.api_key = api_key
        self._http.token = None

    def set_token(self, token: str) -> None:
        self._http.token = token
        self._http.api_key = None

    def set_environment(self, environment: str | None) -> None:
        self._http.set_environment(environment)

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
    def from_env(cls) -> Ax402Client:
        base = os.environ.get("AX402_BASE_URL", "https://api.ax402.io")
        raw_env = (os.environ.get("AX402_ENVIRONMENT") or "").strip()
        sandbox_flag = os.environ.get("AX402_SANDBOX", "").strip().lower()
        api_key = os.environ.get("AX402_API_KEY")
        sandbox = (
            raw_env.lower() == "development"
            or sandbox_flag in ("1", "true", "yes")
            or _api_key_implies_sandbox(api_key)
        )
        environment = "development" if sandbox else (raw_env or None)
        if sandbox and api_key and api_key.startswith("ax402_live_"):
            raise ValueError(
                "sandbox mode requires an ax402_sandbox_… API key (or AX402_JWT); "
                "ax402_live_… keys are production-only"
            )
        return cls(
            base,
            api_key=api_key,
            token=os.environ.get("AX402_JWT"),
            environment=environment,
        )


def _api_key_implies_sandbox(api_key: str | None) -> bool:
    if not api_key:
        return False
    return api_key.startswith("ax402_sandbox_")
