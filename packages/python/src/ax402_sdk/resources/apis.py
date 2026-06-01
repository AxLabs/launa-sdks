from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import API


class APIsResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def list(self) -> list[API]:
        return [API.model_validate(x) for x in self._http.request("GET", "/apis")]

    def create(self, body: dict[str, Any]) -> API:
        return API.model_validate(self._http.request("POST", "/apis", json_body=body))

    def get(self, api_id: str) -> API:
        return API.model_validate(self._http.request("GET", f"/apis/{api_id}"))

    def update(self, api_id: str, body: dict[str, Any]) -> API:
        return API.model_validate(self._http.request("PUT", f"/apis/{api_id}", json_body=body))

    def delete(self, api_id: str) -> None:
        self._http.request("DELETE", f"/apis/{api_id}")
