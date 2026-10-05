from __future__ import annotations

from typing import Any

from ..http import HttpTransport


class IncomeResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def summary(self) -> dict[str, Any]:
        return self._http.request("GET", "/income/summary")

    def ledger(
        self,
        *,
        limit: int | None = None,
        offset: int | None = None,
        api_id: str | None = None,
        network: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)
        if api_id:
            params["api_id"] = api_id
        if network:
            params["network"] = network
        q = "&".join(f"{k}={v}" for k, v in params.items())
        path = f"/income/ledger?{q}" if q else "/income/ledger"
        return self._http.request("GET", path)

    def ledger_entry(self, entry_id: str) -> dict[str, Any]:
        return self._http.request("GET", f"/income/ledger/{entry_id}")

    def payout_requests(self) -> list[dict[str, Any]]:
        return self._http.request("GET", "/income/payout-requests")
