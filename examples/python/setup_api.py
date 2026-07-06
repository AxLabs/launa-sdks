#!/usr/bin/env python3
"""Create an API with default subdomain and one paid endpoint.

Usage:
  export AX402_API_KEY=ax402_live_...
  python examples/python/setup_api.py [slug] [upstream-url] [price-usdc]
"""

from __future__ import annotations

import json
import os
import sys

from ax402_sdk import Ax402Client, build_usdc_accept, usdc_to_atomic
from ax402_sdk.platform.helpers import gateway_url


def main() -> None:
    slug = sys.argv[1] if len(sys.argv) > 1 else "demo-api"
    upstream = sys.argv[2] if len(sys.argv) > 2 else "https://httpbin.org"
    price = sys.argv[3] if len(sys.argv) > 3 else "0.01"

    client = Ax402Client.from_env()
    platform = client.config.platform()
    api = client.apis.create(
        {
            "name": slug.replace("-", " ").title(),
            "slug": slug,
            "upstream_base_url": upstream,
        }
    )

    endpoint = client.endpoints.create(
        api.id,
        {
            "method": "GET",
            "path_pattern": "/get",
            "description": "Paid echo via httpbin",
            "accepts": [build_usdc_accept(usdc_to_atomic(price))],
        },
    )

    host = f"{slug}.{platform.platform_domain}"
    out = {
        "apiId": api.id,
        "slug": api.slug,
        "endpointId": endpoint.id,
        "gatewayUrl": gateway_url(host, "/get", platform.gateway_port),
        "priceUsdc": price,
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    if not os.environ.get("AX402_API_KEY") and not os.environ.get("AX402_JWT"):
        raise SystemExit("AX402_API_KEY or AX402_JWT is required")
    main()
