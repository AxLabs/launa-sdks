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

    def login(self, email: str, password: str, totp_code: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"email": email, "password": password}
        if totp_code:
            body["totp_code"] = totp_code
        return self._http.request("POST", "/auth/login", json_body=body)

    def verify_mfa(self, mfa_token: str, code: str) -> AuthResponse:
        return AuthResponse.model_validate(
            self._http.request("POST", "/auth/mfa/verify", json_body={"mfa_token": mfa_token, "code": code})
        )

    def totp_setup(self) -> dict[str, Any]:
        return self._http.request("POST", "/auth/totp/setup")

    def totp_confirm(self, code: str) -> dict[str, Any]:
        return self._http.request("POST", "/auth/totp/confirm", json_body={"code": code})

    def totp_disable(self, password: str, code: str) -> dict[str, Any]:
        return self._http.request("DELETE", "/auth/totp", json_body={"password": password, "code": code})

    def totp_regenerate_backup(self, password: str, code: str) -> dict[str, Any]:
        return self._http.request("POST", "/auth/totp/backup-codes", json_body={"password": password, "code": code})

    def list_passkeys(self) -> list[dict[str, Any]]:
        return self._http.request("GET", "/auth/passkeys")

    def passkey_register_options(self) -> dict[str, Any]:
        return self._http.request("POST", "/auth/passkeys/register/options")

    def passkey_register_verify(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._http.request("POST", "/auth/passkeys/register/verify", json_body=body)

    def passkey_login_options(self) -> dict[str, Any]:
        return self._http.request("POST", "/auth/passkeys/login/options")

    def passkey_login_verify(self, session_token: str, credential: Any) -> AuthResponse:
        return AuthResponse.model_validate(
            self._http.request(
                "POST",
                "/auth/passkeys/login/verify",
                json_body={"session_token": session_token, "credential": credential},
            )
        )

    def delete_passkey(self, passkey_id: str, password: str) -> None:
        self._http.request("DELETE", f"/auth/passkeys/{passkey_id}", json_body={"password": password})

    def logout(self) -> None:
        self._http.request("POST", "/auth/logout")

    def verify_email(self, token: str) -> dict[str, str]:
        return self._http.request("POST", "/auth/verify-email", json_body={"token": token})

    def me(self) -> User:
        return User.model_validate(self._http.request("GET", "/auth/me"))

    def resend_verification(self) -> dict[str, str]:
        return self._http.request("POST", "/auth/resend-verification")

    def forgot_password(self, email: str) -> dict[str, str]:
        return self._http.request("POST", "/auth/forgot-password", json_body={"email": email})

    def reset_password(self, token: str, new_password: str) -> dict[str, str]:
        return self._http.request(
            "POST",
            "/auth/reset-password",
            json_body={"token": token, "new_password": new_password},
        )

    def change_password(self, current_password: str, new_password: str) -> dict[str, str]:
        return self._http.request(
            "PUT",
            "/auth/password",
            json_body={"current_password": current_password, "new_password": new_password},
        )

    def patch_preferences(self, *, display_currency: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if display_currency is not None:
            body["display_currency"] = display_currency
        return self._http.request("PATCH", "/auth/me/preferences", json_body=body)

    def complete_onboarding(self, skipped: bool = False) -> User:
        body = {"skipped": True} if skipped else None
        return User.model_validate(self._http.request("POST", "/auth/onboarding/complete", json_body=body))

    def get_facilitator(self) -> dict[str, Any]:
        return self._http.request("GET", "/auth/facilitator")

    def refresh_facilitator_supported(self) -> dict[str, Any]:
        return self._http.request("GET", "/auth/facilitator/supported")

    def facilitator_stats(self, days: int = 30) -> dict[str, Any]:
        return self._http.request("GET", "/auth/facilitator/stats", params={"days": str(days)})

    def facilitator_events(
        self,
        *,
        days: int | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str] = {}
        if days is not None:
            params["days"] = str(days)
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)
        return self._http.request("GET", "/auth/facilitator/events", params=params or None)

    def update_preferred_environment(self, environment: str) -> dict[str, Any]:
        return self._http.request(
            "PATCH",
            "/auth/me/environment",
            json_body={"environment": environment},
        )

    def supported_networks(self) -> Any:
        return self._http.request("GET", "/supported-networks")
