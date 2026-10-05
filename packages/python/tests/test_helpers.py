from launa_sdk import (
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


def test_gateway_urls() -> None:
    assert gateway_base_url("myapi.localhost", 8090) == "http://myapi.localhost:8090"
    assert gateway_url("myapi.localhost", "/v1/data", 8090) == "http://myapi.localhost:8090/v1/data"


def test_amount_helpers() -> None:
    assert amount_to_atomic("1.5", 6) == "1500000"
    assert atomic_to_display("1500000", 6) == "1.5"


def test_format_withdraw_delay() -> None:
    assert format_withdraw_delay(900) == "15 minutes"
