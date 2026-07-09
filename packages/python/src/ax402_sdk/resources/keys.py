from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import APIKey, CreatedAPIKey


class KeysResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def list_scopes(self) -> list[str]:
        data = self._http.request("GET", "/auth/scopes")
        return list(data["scopes"])

    def list(self) -> list[APIKey]:
        return [APIKey.model_validate(x) for x in self._http.request("GET", "/auth/api-keys")]

    def create(self, name: str, scopes: list[str]) -> CreatedAPIKey:
        return CreatedAPIKey.model_validate(
            self._http.request("POST", "/auth/api-keys", json_body={"name": name, "scopes": scopes})
        )

    def revoke(self, key_id: str) -> dict[str, str]:
        return self._http.request("DELETE", f"/auth/api-keys/{key_id}")
