from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class BuyerDepsError(ImportError):
    """Raised when optional x402 buyer dependencies are missing."""


@dataclass
class PayResult:
    status_code: int
    body: bytes
    headers: dict[str, str]
    settlement: dict[str, Any] | None = None
