from __future__ import annotations

from typing import Any

from ..http import HttpTransport


class BillingResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def overview(self) -> dict[str, Any]:
        return self._http.request("GET", "/billing")

    def packages(self) -> dict[str, Any]:
        return self._http.request("GET", "/billing/packages")

    def invoices(self) -> dict[str, Any]:
        return self._http.request("GET", "/billing/invoices")
