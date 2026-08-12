from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import PlatformConfig


class ConfigResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def platform(self) -> PlatformConfig:
        return PlatformConfig.model_validate(self._http.request("GET", "/config/platform"))

    def billing(self) -> dict:
        return self._http.request("GET", "/config/billing")

    def join_waitlist(self, body: dict[str, str]) -> dict[str, str]:
        return self._http.request("POST", "/waitlist", json_body=body)

    def local_dev(self) -> dict[str, Any]:
        return self._http.request("GET", "/config/local-dev")

    def dev_balances(self, address: str) -> dict[str, str]:
        return self._http.request("POST", "/dev/balances", json_body={"address": address})

    def dev_faucet(self, address: str, asset: str = "all") -> dict[str, Any]:
        return self._http.request(
            "POST", "/dev/faucet", json_body={"address": address, "asset": asset}
        )
