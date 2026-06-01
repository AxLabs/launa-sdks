from __future__ import annotations

from ..http import HttpTransport
from ..models import PlatformConfig


class ConfigResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def platform(self) -> PlatformConfig:
        return PlatformConfig.model_validate(self._http.request("GET", "/config/platform"))
