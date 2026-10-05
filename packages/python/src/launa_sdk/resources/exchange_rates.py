from __future__ import annotations

from ..http import HttpTransport
from ..models import ExchangeRateLookup, ExchangeRatesAll, ExchangeRatesSupported


class ExchangeRatesResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def list(self, quote: str | None = None, date: str | None = None) -> ExchangeRatesAll:
        params: dict[str, str] = {}
        if quote:
            params["quote"] = quote
        if date:
            params["date"] = date
        return ExchangeRatesAll.model_validate(
            self._http.request("GET", "/exchange-rates", params=params or None)
        )

    def supported(self) -> ExchangeRatesSupported:
        return ExchangeRatesSupported.model_validate(self._http.request("GET", "/exchange-rates/supported"))

    def lookup(
        self,
        network: str,
        asset: str,
        quote: str | None = None,
        date: str | None = None,
    ) -> ExchangeRateLookup:
        params: dict[str, str] = {"network": network, "asset": asset}
        if quote:
            params["quote"] = quote
        if date:
            params["date"] = date
        q = "&".join(f"{k}={v}" for k, v in params.items())
        return ExchangeRateLookup.model_validate(self._http.request("GET", f"/exchange-rates/lookup?{q}"))
