from __future__ import annotations

from typing import Any

from ..http import HttpTransport


class SettlementsResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def list(self, api_id: str) -> list[dict[str, Any]]:
        return self._http.request("GET", f"/apis/{api_id}/settlements")

    def list_batch(self, api_id: str) -> list[dict[str, Any]]:
        return self._http.request("GET", f"/apis/{api_id}/batch-settlements")
