from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import Endpoint


class EndpointsResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def list(self, api_id: str) -> list[Endpoint]:
        data = self._http.request("GET", f"/apis/{api_id}/endpoints")
        return [Endpoint.model_validate(x) for x in data]

    def create(self, api_id: str, body: dict[str, Any]) -> Endpoint:
        return Endpoint.model_validate(
            self._http.request("POST", f"/apis/{api_id}/endpoints", json_body=body)
        )

    def update(self, api_id: str, endpoint_id: str, body: dict[str, Any]) -> Endpoint:
        return Endpoint.model_validate(
            self._http.request("PUT", f"/apis/{api_id}/endpoints/{endpoint_id}", json_body=body)
        )

    def delete(self, api_id: str, endpoint_id: str) -> None:
        self._http.request("DELETE", f"/apis/{api_id}/endpoints/{endpoint_id}")
