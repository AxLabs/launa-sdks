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

    def list_history(
        self,
        *,
        days: int = 30,
        limit: int | None = None,
        offset: int | None = None,
        api_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str] = {"days": str(days)}
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)
        if api_id:
            params["api_id"] = api_id
        q = "&".join(f"{k}={v}" for k, v in params.items())
        return self._http.request("GET", f"/settlements?{q}")

    def export_history_url(
        self,
        *,
        days: int = 30,
        api_id: str | None = None,
        fmt: str = "csv",
    ) -> str:
        params: dict[str, str] = {"days": str(days), "format": fmt}
        if api_id:
            params["api_id"] = api_id
        if fmt == "json":
            params["download"] = "1"
        q = "&".join(f"{k}={v}" for k, v in params.items())
        return f"/settlements?{q}"
