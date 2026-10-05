from launa_sdk import (
    HBAR,
    NETWORK_HEDERA_MAINNET,
    NETWORK_HEDERA_TESTNET,
    USDC_HEDERA_MAINNET,
    USDC_HEDERA_TESTNET,
    atomic_to_usdc,
    build_usdc_accept,
    gateway_base_url,
    gateway_url,
    usdc_to_atomic,
)
from launa_sdk.platform.helpers import (
    DEFAULT_BATCH_WITHDRAW_DELAY,
    amount_to_atomic,
    atomic_to_display,
    format_withdraw_delay,
)


def test_usdc_to_atomic() -> None:
    assert usdc_to_atomic("0.10") == "100000"


def test_atomic_to_usdc() -> None:
    assert atomic_to_usdc("100000") == "0.1"


def test_build_accept() -> None:
    a = build_usdc_accept("1000")
    assert a["amount"] == "1000"
    assert a["scheme"] == "exact"


def test_build_batch_accept() -> None:
    a = build_usdc_accept("1000", "batch-settlement")
    assert a["scheme"] == "batch-settlement"
    assert a["extra"]["withdrawDelay"] == DEFAULT_BATCH_WITHDRAW_DELAY


def test_build_sandbox_accept() -> None:
    from launa_sdk import NETWORK_SANDBOX_FORK, USDC_BASE_MAINNET, build_sandbox_usdc_accept

    a = build_sandbox_usdc_accept("1000")
    assert a["amount"] == "1000"
    assert a["scheme"] == "exact"
    assert a["network"] == NETWORK_SANDBOX_FORK
    assert a["asset"] == USDC_BASE_MAINNET
    try:
        build_sandbox_usdc_accept("1000", "batch-settlement")
        raise AssertionError("expected ValueError")
    except ValueError:
        pass


def test_gateway_urls() -> None:
    assert gateway_base_url("myapi.localhost", 8090) == "http://myapi.localhost:8090"
    assert gateway_url("myapi.localhost", "/v1/data", 8090) == "http://myapi.localhost:8090/v1/data"


def test_amount_helpers() -> None:
    assert amount_to_atomic("1.5", 6) == "1500000"
    assert atomic_to_display("1500000", 6) == "1.5"


def test_format_withdraw_delay() -> None:
    assert format_withdraw_delay(900) == "15 minutes"


def test_hedera_constants() -> None:
    assert NETWORK_HEDERA_MAINNET == "hedera:mainnet"
    assert NETWORK_HEDERA_TESTNET == "hedera:testnet"
    assert HBAR == "0.0.0"
    assert USDC_HEDERA_TESTNET == "0.0.429274"
    assert USDC_HEDERA_MAINNET == "0.0.456858"
