from __future__ import annotations

from ..http import HttpTransport


class SandboxWalletResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def get(self) -> dict:
        return self._http.request("GET", "/sandbox-wallet")

    def reset(self) -> dict:
        return self._http.request("POST", "/sandbox-wallet/reset")
