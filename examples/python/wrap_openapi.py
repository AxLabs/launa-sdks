#!/usr/bin/env python3
"""Import OpenAPI operations as paid gateway endpoints.

Usage:
  export AX402_API_KEY=ax402_live_...
  python examples/python/wrap_openapi.py path/to/openapi.yaml YOUR_API_ID [price-usdc]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from ax402_sdk import Ax402Client, build_usdc_accept, usdc_to_atomic
from ax402_sdk.platform.helpers import wrap_openapi


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("Usage: wrap_openapi.py <spec.yaml> <apiId> [price-usdc]")

    spec_path = Path(sys.argv[1])
    api_id = sys.argv[2]
    price = sys.argv[3] if len(sys.argv) > 3 else "0.10"

    client = Ax402Client.from_env()
    spec = spec_path.read_text(encoding="utf-8")
    accepts = [build_usdc_accept(usdc_to_atomic(price))]
    result = wrap_openapi(client, api_id, spec, accepts)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
