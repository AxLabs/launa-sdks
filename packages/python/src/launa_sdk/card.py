"""Hosted card checkout. Keep the token across retries; no cryptocurrency key is needed."""
from __future__ import annotations

import re
import secrets
from urllib.parse import urlsplit
import httpx


class CardCheckout:
    def __init__(self, url: str, *, token: str | None = None, headers: dict[str, str] | None = None, client: httpx.Client | None = None):
        target = urlsplit(url)
        if target.scheme != "https" or not target.hostname or target.username or target.password or target.fragment:
            raise ValueError("HTTPS gateway URL required")
        self.url = url
        self.token = token or secrets.token_urlsafe(32)
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", self.token):
            raise ValueError("Invalid card payment token")
        self.headers = dict(headers or {})
        if ({k.lower() for k in self.headers} & {"payment-signature", "x-payment", "payment-authorization"}
                or any(k.lower() == "authorization" and v.lower().startswith("payment ") for k, v in self.headers.items())):
            raise ValueError("Choose one payment mechanism")
        self._client = client or httpx.Client(timeout=90)
        self._owns_client = client is None

    def _request(self, action: str) -> httpx.Response:
        headers = httpx.Headers(self.headers)
        headers["Launa-Payment"] = action
        headers["Launa-Payment-Token"] = self.token
        return self._client.get(self.url, headers=headers, follow_redirects=False)

    def _state(self, action: str) -> dict:
        response = self._request(action)
        if response.status_code not in (200, 202, 402, 409, 410):
            raise RuntimeError("Card payment unavailable; retry with the same token")
        data = response.json()
        if not isinstance(data.get("status"), str):
            raise ValueError("Invalid payment response")
        if data.get("checkout_url"):
            target = urlsplit(data["checkout_url"])
            if target.scheme != "https" or target.netloc != "checkout.stripe.com" or target.username:
                raise ValueError("Invalid Stripe Checkout URL")
        return data

    def start(self) -> dict:
        """Call after the buyer chooses cards. Persist token before calling."""
        return self._state("checkout")

    def status(self) -> dict:
        return self._state("status")

    def resume(self) -> httpx.Response:
        """Check HTTP status and Launa-Payment-Receipt before treating the response as paid content."""
        return self._request("resume")

    def close(self) -> None:
        if self._owns_client:
            self._client.close()
