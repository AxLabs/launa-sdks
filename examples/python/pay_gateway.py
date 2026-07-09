#!/usr/bin/env python3
"""Pay a gateway URL with an EVM wallet.

Usage:
  export AX402_EVM_PRIVATE_KEY=0x...
  python examples/python/pay_gateway.py [gateway-url]

Batch-settlement gateway:
  python examples/python/pay_gateway.py --batch [gateway-url]
"""

from __future__ import annotations

import json
import sys

from ax402_sdk.buyer import BatchBuyerOptions, BuyerClient


def main() -> None:
    args = sys.argv[1:]
    batch = False
    if args and args[0] == "--batch":
        batch = True
        args = args[1:]

    url = args[0] if args else "https://my-api.ax402.io/v1/echo?test=1"
    client = BuyerClient.from_env(batch=BatchBuyerOptions(deposit_multiplier=5) if batch else None)
    result = client.get(url)

    body = result.body[:500].decode("utf-8", errors="replace")
    print(
        json.dumps(
            {
                "status": result.status_code,
                "url": url,
                "batch": batch,
                "settlement": result.settlement,
                "body": body,
            },
            indent=2,
        )
    )
    if result.status_code >= 400:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
