from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import OpenAPIImportResult, ParsedOpenAPI


class OpenAPIResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def parse_spec(self, spec: str) -> ParsedOpenAPI:
        return ParsedOpenAPI.model_validate(
            self._http.request("POST", "/openapi/parse", json_body={"spec": spec})
        )

    def parse_file(self, filename: str, content: bytes) -> ParsedOpenAPI:
        return ParsedOpenAPI.model_validate(
            self._http.request(
                "POST",
                "/openapi/parse",
                files={"file": (filename, content)},
            )
        )

    def import_operations(self, api_id: str, body: dict[str, Any]) -> OpenAPIImportResult:
        return OpenAPIImportResult.model_validate(
            self._http.request("POST", f"/apis/{api_id}/openapi/import", json_body=body)
        )
