import json
from pathlib import Path

import pytest

from ax402_sdk.models import API, Endpoint, StatsOverview, User

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "test" / "fixtures" / "responses.json").read_text()
)


def test_user_model() -> None:
    User.model_validate(FIXTURES["user"])


def test_api_model() -> None:
    API.model_validate(FIXTURES["api"])


def test_endpoint_model() -> None:
    Endpoint.model_validate(FIXTURES["endpoint"])


def test_stats_overview_model() -> None:
    StatsOverview.model_validate(FIXTURES["statsOverview"])
