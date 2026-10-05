#!/usr/bin/env python3
"""Create an API with default subdomain and one paid endpoint.

Usage:
  export LAUNA_API_KEY=launa_live_...
  python examples/python/setup_api.py [slug] [upstream-url] [price-usdc]
"""

from __future__ import annotations

import json
import os
import sys

from launa_sdk import LaunaClient, build_usdc_accept, setup_api_with_default_domain, usdc_to_atomic
from launa_sdk.platform.helpers import gateway_url


def main() -> None:
    slug = sys.argv[1] if len(sys.argv) > 1 else "demo-api"
    upstream = sys.argv[2] if len(sys.argv) > 2 else "https://httpbin.org"
    price = sys.argv[3] if len(sys.argv) > 3 else "0.01"

    client = LaunaClient.from_env()
    setup = setup_api_with_default_domain(
        client,
        {
            "name": slug.replace("-", " ").title(),
            "slug": slug,
            "upstream_base_url": upstream,
        },
    )
    api = setup["api"]
    platform = setup["platform"]

    endpoint = client.endpoints.create(
        api.id,
        {
            "method": "GET",
            "path_pattern": "/get",
            "description": "Paid echo via httpbin",
            "accepts": [build_usdc_accept(usdc_to_atomic(price))],
        },
    )

    out = {
        "apiId": api.id,
        "slug": api.slug,
        "endpointId": endpoint.id,
        "gatewayUrl": gateway_url(setup["gateway_host"], "/get", platform.gateway_port),
        "priceUsdc": price,
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    if not os.environ.get("LAUNA_API_KEY") and not os.environ.get("LAUNA_JWT"):
        raise SystemExit("LAUNA_API_KEY or LAUNA_JWT is required")
    main()
