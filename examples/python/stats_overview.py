#!/usr/bin/env python3
"""List APIs and print platform stats.

Usage:
  export AX402_API_KEY=ax402_live_...
  python examples/python/stats_overview.py [days]
"""

from __future__ import annotations

import json
import sys

from ax402_sdk import Ax402Client


def main() -> None:
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    client = Ax402Client.from_env()

    apis = client.apis.list()
    overview = client.stats.overview(days)
    rates = client.exchange_rates.supported()

    print(
        json.dumps(
            {
                "days": days,
                "apiCount": len(apis),
                "apis": [{"id": a.id, "slug": a.slug, "name": a.name} for a in apis],
                "stats": overview.model_dump(),
                "exchangeRates": rates.model_dump(),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
