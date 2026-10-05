import pytest

from launa_sdk.buyer import BuyerClient, BuyerDepsError, evm_signer_from_private_key


def test_evm_signer_from_private_key() -> None:
    signer = evm_signer_from_private_key(
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    assert signer is not None


def test_buyer_client_constructs() -> None:
    signer = evm_signer_from_private_key(
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    client = BuyerClient(signer)
    assert client is not None


def test_buyer_deps_error_message() -> None:
    err = BuyerDepsError("missing")
    assert "missing" in str(err)


def test_buyer_client_with_batch() -> None:
    from launa_sdk.buyer import BatchBuyerOptions

    signer = evm_signer_from_private_key(
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    client = BuyerClient(signer, batch=BatchBuyerOptions(deposit_multiplier=5))
    assert client is not None


def test_from_env_hedera_unsupported(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LAUNA_EVM_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("EVM_PRIVATE_KEY", raising=False)
    monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.1234")
    monkeypatch.setenv("HEDERA_PRIVATE_KEY", "deadbeef")
    with pytest.raises(BuyerDepsError, match="Hedera buyer signing is not supported"):
        BuyerClient.from_env()
