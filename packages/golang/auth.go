package launa

import (
	"context"
	"net/http"
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

func (c *Client) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	var out AuthResponse
	if err := c.do(ctx, http.MethodPost, "/auth/login", map[string]string{
		"email": email, "password": password,
	}, &out); err != nil {
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

func (c *Client) CompleteOnboarding(ctx context.Context) (*User, error) {
	var u User
	if err := c.do(ctx, http.MethodPost, "/auth/onboarding/complete", nil, &u); err != nil {
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
