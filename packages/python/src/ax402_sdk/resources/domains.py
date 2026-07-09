from __future__ import annotations

from ..http import HttpTransport
from ..models import DomainPlan, DomainSetup


class DomainsResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def suggest(self, apex: str, prefix: str = "x402", upstream_path: str = "/api") -> DomainPlan:
        return DomainPlan.model_validate(
            self._http.request(
                "GET",
                "/domains/suggest",
                params={"apex": apex, "prefix": prefix, "upstream_path": upstream_path},
            )
        )

    def list(self, api_id: str) -> list[DomainSetup]:
        return [DomainSetup.model_validate(x) for x in self._http.request("GET", f"/apis/{api_id}/domains")]

    def add(self, api_id: str, hostname: str) -> DomainSetup:
        return DomainSetup.model_validate(
            self._http.request("POST", f"/apis/{api_id}/domains", json_body={"hostname": hostname})
        )

    def verify(self, api_id: str, domain_id: str) -> dict[str, str]:
        return self._http.request("POST", f"/apis/{api_id}/domains/{domain_id}/verify")

    def delete(self, api_id: str, domain_id: str) -> None:
        self._http.request("DELETE", f"/apis/{api_id}/domains/{domain_id}")
