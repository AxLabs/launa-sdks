import pytest

from ax402_sdk.buyer import BuyerClient, BuyerDepsError, evm_signer_from_private_key


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
