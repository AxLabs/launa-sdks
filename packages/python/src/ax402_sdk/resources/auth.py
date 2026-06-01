from __future__ import annotations

from typing import Any

from ..http import HttpTransport
from ..models import AuthResponse, User


class AuthResource:
    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def signup(self, email: str, password: str) -> AuthResponse:
        return AuthResponse.model_validate(
            self._http.request("POST", "/auth/signup", json_body={"email": email, "password": password})
        )

    def login(self, email: str, password: str) -> AuthResponse:
        return AuthResponse.model_validate(
            self._http.request("POST", "/auth/login", json_body={"email": email, "password": password})
        )

    def logout(self) -> None:
        self._http.request("POST", "/auth/logout")

    def verify_email(self, token: str) -> dict[str, str]:
        return self._http.request("POST", "/auth/verify-email", json_body={"token": token})

    def me(self) -> User:
        return User.model_validate(self._http.request("GET", "/auth/me"))

    def resend_verification(self) -> dict[str, str]:
        return self._http.request("POST", "/auth/resend-verification")

    def change_password(self, current_password: str, new_password: str) -> dict[str, str]:
        return self._http.request(
            "PUT",
            "/auth/password",
            json_body={"current_password": current_password, "new_password": new_password},
        )

    def complete_onboarding(self) -> User:
        return User.model_validate(self._http.request("POST", "/auth/onboarding/complete"))

    def supported_networks(self) -> Any:
        return self._http.request("GET", "/supported-networks")
