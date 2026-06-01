from __future__ import annotations

from urllib.parse import quote


def gateway_url(host: str, path: str, port: int = 443) -> str:
    if not path.startswith("/"):
        path = "/" + path
    if host.endswith(".localhost") or host == "localhost":
        if port not in (80, 443):
            return f"http://{host}:{port}{path}"
    return f"https://{host}{path}"


def wrap_openapi(client, api_id: str, spec: str, accepts: list[dict]) -> dict:
    parsed = client.openapi.parse_spec(spec)
    operations = [
        {
            "method": op.method,
            "path_pattern": op.path_pattern,
            "description": op.summary or op.description,
        }
        for op in parsed.operations
    ]
    result = client.openapi.import_operations(api_id, {"operations": operations, "accepts": accepts})
    return result.model_dump()
