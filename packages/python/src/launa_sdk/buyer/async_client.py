from __future__ import annotations

from typing import Any

from .types import BatchBuyerOptions, BuyerDepsError, PayResult
from .client import DEFAULT_BATCH_SALT


def _load_x402_async():
    try:
        from x402 import x402Client
        from x402.http import x402HTTPClient
        from x402.http.clients import x402HttpxClient
        from x402.mechanisms.evm.exact.register import register_exact_evm_client
    except ImportError as exc:
        raise BuyerDepsError(
            'Buyer helpers require: pip install "ax402-sdk[buyer]" '
            '(installs x402[httpx,evm] and eth-account)'
        ) from exc
    return {
        "x402Client": x402Client,
        "x402HTTPClient": x402HTTPClient,
        "x402HttpxClient": x402HttpxClient,
        "register_exact_evm_client": register_exact_evm_client,
    }


def _register_batch_async(client: Any, signer: Any, batch: BatchBuyerOptions | None) -> None:
    if batch is None:
        return
    from x402.mechanisms.evm.batch_settlement.client import (
        BatchSettlementDepositPolicy,
        BatchSettlementEvmScheme,
        BatchSettlementEvmSchemeOptions,
    )

    salt = batch.channel_salt or DEFAULT_BATCH_SALT
    scheme = BatchSettlementEvmScheme(
        signer,
        BatchSettlementEvmSchemeOptions(
            salt=salt,
            deposit_policy=BatchSettlementDepositPolicy(deposit_multiplier=batch.deposit_multiplier),
        ),
    )
    client.register("eip155:*", scheme)


class AsyncBuyerClient:
    """Async HTTP client that pays x402 gateway URLs automatically."""

    def __init__(self, signer: Any, *, batch: BatchBuyerOptions | None = None) -> None:
        mods = _load_x402_async()
        client = mods["x402Client"]()
        mods["register_exact_evm_client"](client, signer)
        _register_batch_async(client, signer, batch)
        self._client = client
        self._http = mods["x402HttpxClient"](client)
        self._x402_http = mods["x402HTTPClient"](client)

    async def __aenter__(self) -> AsyncBuyerClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        content: bytes | None = None,
        json: Any | None = None,
        timeout: float = 120.0,
    ) -> PayResult:
        resp = await self._http.request(
            method,
            url,
            headers=headers,
            content=content,
            json=json,
            timeout=timeout,
        )
        settlement = None
        try:
            settle = self._x402_http.get_payment_settle_response(lambda name: resp.headers.get(name))
            if settle is not None:
                settlement = settle.model_dump() if hasattr(settle, "model_dump") else dict(settle)
        except Exception:
            settlement = None
        return PayResult(
            status_code=resp.status_code,
            body=resp.content,
            headers=dict(resp.headers),
            settlement=settlement,
        )

    async def get(self, url: str, **kwargs: Any) -> PayResult:
        return await self.request("GET", url, **kwargs)
