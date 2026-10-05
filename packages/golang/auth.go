package launa

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

func (c *Client) Signup(ctx context.Context, email, password string) (*AuthResponse, error) {
	var out AuthResponse
	if err := c.do(ctx, http.MethodPost, "/auth/signup", map[string]string{
		"email": email, "password": password,
	}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) Login(ctx context.Context, email, password string, totpCode ...string) (*AuthResponse, error) {
	var out AuthResponse
	body := map[string]string{"email": email, "password": password}
	if len(totpCode) > 0 && totpCode[0] != "" {
		body["totp_code"] = totpCode[0]
	}
	if err := c.do(ctx, http.MethodPost, "/auth/login", body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) Logout(ctx context.Context) error {
	return c.do(ctx, http.MethodPost, "/auth/logout", nil, nil)
}

func (c *Client) VerifyEmail(ctx context.Context, token string) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodPost, "/auth/verify-email", map[string]string{"token": token}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) Me(ctx context.Context) (*User, error) {
	var u User
	if err := c.do(ctx, http.MethodGet, "/auth/me", nil, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *Client) ResendVerification(ctx context.Context) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodPost, "/auth/resend-verification", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) ChangePassword(ctx context.Context, current, newPassword string) (map[string]string, error) {
	var out map[string]string
	body := map[string]string{"current_password": current, "new_password": newPassword}
	if err := c.do(ctx, http.MethodPut, "/auth/password", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) ForgotPassword(ctx context.Context, email string) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodPost, "/auth/forgot-password", map[string]string{"email": email}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) ResetPassword(ctx context.Context, token, newPassword string) (map[string]string, error) {
	var out map[string]string
	body := map[string]string{"token": token, "new_password": newPassword}
	if err := c.do(ctx, http.MethodPost, "/auth/reset-password", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) CompleteOnboarding(ctx context.Context, skipped ...bool) (*User, error) {
	var u User
	var body any
	if len(skipped) > 0 && skipped[0] {
		body = map[string]bool{"skipped": true}
	}
	if err := c.do(ctx, http.MethodPost, "/auth/onboarding/complete", body, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *Client) ListScopes(ctx context.Context) ([]string, error) {
	var out struct {
		Scopes []string `json:"scopes"`
	}
	if err := c.do(ctx, http.MethodGet, "/auth/scopes", nil, &out); err != nil {
		return nil, err
	}
	return out.Scopes, nil
}

func (c *Client) ListAPIKeys(ctx context.Context) ([]APIKey, error) {
	var out []APIKey
	if err := c.do(ctx, http.MethodGet, "/auth/api-keys", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) CreateAPIKey(ctx context.Context, name string, scopes []string) (*CreatedAPIKey, error) {
	var out CreatedAPIKey
	if err := c.do(ctx, http.MethodPost, "/auth/api-keys", map[string]any{"name": name, "scopes": scopes}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) RevokeAPIKey(ctx context.Context, keyID string) (map[string]string, error) {
	var out map[string]string
	if err := c.do(ctx, http.MethodDelete, "/auth/api-keys/"+keyID, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) VerifyMfa(ctx context.Context, mfaToken, code string) (*AuthResponse, error) {
	var out AuthResponse
	if err := c.do(ctx, http.MethodPost, "/auth/mfa/verify", map[string]string{
		"mfa_token": mfaToken, "code": code,
	}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) TotpSetup(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/totp/setup", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) TotpConfirm(ctx context.Context, code string) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/totp/confirm", map[string]string{"code": code}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) TotpDisable(ctx context.Context, password, code string) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodDelete, "/auth/totp", map[string]string{
		"password": password, "code": code,
	}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) TotpRegenerateBackup(ctx context.Context, password, code string) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/totp/backup-codes", map[string]string{
		"password": password, "code": code,
	}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) ListPasskeys(ctx context.Context) ([]map[string]any, error) {
	var out []map[string]any
	if err := c.do(ctx, http.MethodGet, "/auth/passkeys", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) PasskeyRegisterOptions(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/passkeys/register/options", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) PasskeyRegisterVerify(ctx context.Context, body map[string]any) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/passkeys/register/verify", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) PasskeyLoginOptions(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPost, "/auth/passkeys/login/options", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) PasskeyLoginVerify(ctx context.Context, sessionToken string, credential any) (*AuthResponse, error) {
	var out AuthResponse
	if err := c.do(ctx, http.MethodPost, "/auth/passkeys/login/verify", map[string]any{
		"session_token": sessionToken, "credential": credential,
	}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) DeletePasskey(ctx context.Context, passkeyID, password string) error {
	return c.do(ctx, http.MethodDelete, "/auth/passkeys/"+passkeyID, map[string]string{"password": password}, nil)
}

func (c *Client) PatchPreferences(ctx context.Context, displayCurrency string) (map[string]any, error) {
	var out map[string]any
	body := map[string]string{}
	if displayCurrency != "" {
		body["display_currency"] = displayCurrency
	}
	if err := c.do(ctx, http.MethodPatch, "/auth/me/preferences", body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) GetFacilitator(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/auth/facilitator", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) RefreshFacilitatorSupported(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, "/auth/facilitator/supported", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) FacilitatorStats(ctx context.Context, days int) (map[string]any, error) {
	var out map[string]any
	path := fmt.Sprintf("/auth/facilitator/stats?days=%d", days)
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type FacilitatorEventsQuery struct {
	Days   int
	Limit  int
	Offset int
}

func (c *Client) FacilitatorEvents(ctx context.Context, query FacilitatorEventsQuery) (map[string]any, error) {
	params := url.Values{}
	if query.Days > 0 {
		params.Set("days", fmt.Sprintf("%d", query.Days))
	}
	if query.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", query.Limit))
	}
	if query.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", query.Offset))
	}
	path := "/auth/facilitator/events"
	if enc := params.Encode(); enc != "" {
		path += "?" + enc
	}
	var out map[string]any
	if err := c.do(ctx, http.MethodGet, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) UpdatePreferredEnvironment(ctx context.Context, environment string) (map[string]any, error) {
	var out map[string]any
	if err := c.do(ctx, http.MethodPatch, "/auth/me/environment", map[string]string{
		"environment": environment,
	}, &out); err != nil {
		return nil, err
	}
	return out, nil
}
