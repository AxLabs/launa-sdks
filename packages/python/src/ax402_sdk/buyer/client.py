from __future__ import annotations

from typing import Any

from .types import BatchBuyerOptions, BuyerDepsError, PayResult

DEFAULT_BATCH_SALT = "0x0000000000000000000000000000000000000000000000000000000000000000"


def _load_x402_sync():
    try:
        from eth_account import Account
        from x402 import x402ClientSync
        from x402.http import x402HTTPClientSync
        from x402.http.clients import x402_requests
        from x402.mechanisms.evm import EthAccountSigner
        from x402.mechanisms.evm.exact.register import register_exact_evm_client
    except ImportError as exc:
        raise BuyerDepsError(
            'Buyer helpers require: pip install "ax402-sdk[buyer]" '
            '(installs x402[httpx,evm] and eth-account)'
        ) from exc
    return {
        "Account": Account,
        "x402ClientSync": x402ClientSync,
        "x402HTTPClientSync": x402HTTPClientSync,
        "x402_requests": x402_requests,
        "EthAccountSigner": EthAccountSigner,
        "register_exact_evm_client": register_exact_evm_client,
    }


def _register_batch_sync(client: Any, signer: Any, batch: BatchBuyerOptions | None) -> None:
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


def evm_signer_from_private_key(private_key: str) -> Any:
    mods = _load_x402_sync()
    key = private_key.strip()
    if key.startswith("0x"):
        key = key[2:]
    account = mods["Account"].from_key(key)
    return mods["EthAccountSigner"](account)


class BuyerClient:
    """Sync HTTP client that pays x402 gateway URLs automatically."""

    def __init__(self, signer: Any, *, batch: BatchBuyerOptions | None = None) -> None:
        mods = _load_x402_sync()
        client = mods["x402ClientSync"]()
        mods["register_exact_evm_client"](client, signer)
        _register_batch_sync(client, signer, batch)
        self._http = mods["x402_requests"](client)
        self._x402_http = mods["x402HTTPClientSync"](client)

    def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        content: bytes | None = None,
        json: Any | None = None,
        timeout: float = 120.0,
    ) -> PayResult:
        resp = self._http.request(
            method,
            url,
            headers=headers,
            data=content,
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

    def get(self, url: str, **kwargs: Any) -> PayResult:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> PayResult:
        return self.request("POST", url, **kwargs)

    @classmethod
    def from_private_key(cls, private_key: str, *, batch: BatchBuyerOptions | None = None) -> BuyerClient:
        return cls(evm_signer_from_private_key(private_key), batch=batch)

    @classmethod
    def from_env(cls, *, batch: BatchBuyerOptions | None = None) -> BuyerClient:
        import os

        key = os.environ.get("AX402_EVM_PRIVATE_KEY") or os.environ.get("EVM_PRIVATE_KEY")
        if key:
            return cls.from_private_key(key, batch=batch)
        if os.environ.get("HEDERA_ACCOUNT_ID") or os.environ.get("HEDERA_PRIVATE_KEY"):
            raise BuyerDepsError(
                "Hedera buyer signing is not supported in the Python SDK; "
                "use TypeScript @ax402/sdk/buyer with HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY"
            )
        raise BuyerDepsError("AX402_EVM_PRIVATE_KEY or EVM_PRIVATE_KEY required")
