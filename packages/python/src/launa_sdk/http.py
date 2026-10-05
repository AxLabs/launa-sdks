from __future__ import annotations

import json
from typing import Any

import httpx

from .models import LaunaError


class HttpTransport:
    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        token: str | None = None,
        environment: str | None = None,
        timeout: float = 120.0,
        client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.token = token
        self.environment = environment
        self.timeout = timeout
        self._client = client

    def set_environment(self, environment: str | None) -> None:
        self.environment = environment

    def _headers(self, *, multipart: bool = False) -> dict[str, str]:
        h: dict[str, str] = {}
        if not multipart:
            h["Content-Type"] = "application/json"
        if self.api_key:
            h["X-API-Key"] = self.api_key
        elif self.token:
            h["Authorization"] = f"Bearer {self.token}"
        if self.environment:
            h["X-Launa-Environment"] = self.environment
        return h

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any | None = None,
        params: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes]] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = self._headers(multipart=files is not None)
        if self._client is not None:
            resp = self._client.request(
                method, url, headers=headers, json=json_body, params=params, files=files
            )
        else:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.request(
                    method, url, headers=headers, json=json_body, params=params, files=files
                )
        if resp.status_code >= 400:
            raise _parse_error(resp.status_code, resp.text)
        if resp.status_code == 204:
            return None
        return resp.json()


def _parse_error(status: int, body: str) -> LaunaError:
    try:
        data = json.loads(body)
        return LaunaError(status, data.get("error", body))
    except json.JSONDecodeError:
        return LaunaError(status, body)
