from __future__ import annotations

from ..http import HttpTransport
from ..models import StatsOverview


class StatsResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def overview(self, days: int = 30) -> StatsOverview:
        return StatsOverview.model_validate(
            self._http.request("GET", "/stats/overview", params={"days": str(days)})
        )

    def for_api(self, api_id: str, days: int = 30) -> StatsOverview:
        return StatsOverview.model_validate(
            self._http.request("GET", f"/apis/{api_id}/stats", params={"days": str(days)})
        )
