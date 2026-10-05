from launa_sdk.models import usdc_to_atomic, build_usdc_accept


def test_usdc_to_atomic() -> None:
    assert usdc_to_atomic("0.10") == "100000"


def test_build_accept() -> None:
    a = build_usdc_accept("1000")
    assert a["amount"] == "1000"
    assert a["scheme"] == "exact"
