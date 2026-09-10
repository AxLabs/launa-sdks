package ax402

import (
	"context"
	"fmt"
	"strings"
)

const (
	USDCDecimals = 6

	NetworkBase           = "eip155:8453"
	NetworkBaseSepolia    = "eip155:84532"
	NetworkSandboxFork    = "eip155:845320402" // Anvil Base mainnet fork (seller Sandbox)
	NetworkNeoXMainnet    = "eip155:47763"
	NetworkNeoXTestnet    = "eip155:12227332"
	NetworkHederaMainnet  = "hedera:mainnet"
	NetworkHederaTestnet  = "hedera:testnet"
	USDCBaseMainnet       = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
	USDCBaseSepolia       = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
	ZCHFBaseMainnet       = "0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553"
	XGASNeoXMainnet       = "0x9a50C8804dC885F118835cD96d3Ea4D4A5131A01"
	HBAR                  = "0.0.0"
	USDCHederaTestnet     = "0.0.429274"
	USDCHederaMainnet     = "0.0.456858"
	USDCNetworkMainnet  = NetworkBase
	USDCNetworkSepolia  = NetworkBaseSepolia
	USDCAssetMainnet    = USDCBaseMainnet
	USDCAssetSepolia    = USDCBaseSepolia

	MinBatchWithdrawDelay    = 900
	MaxBatchWithdrawDelay    = 2_592_000
	DefaultBatchWithdrawDelay = 259_200
)

func GatewayBaseURL(host string, port int) string {
	if host == "" {
		return ""
	}
	if strings.HasSuffix(host, ".localhost") || host == "localhost" {
		if port != 80 && port != 443 {
			return fmt.Sprintf("http://%s:%d", host, port)
		}
	}
	return "https://" + host
}

func GatewayURL(host, path string, port int) string {
	base := GatewayBaseURL(host, port)
	if base == "" {
		return ""
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return base + path
}

func UsdcToAtomic(amount string) (string, error) {
	return AmountToAtomic(amount, USDCDecimals)
}

func AtomicToUsdc(atomic string) string {
	return AtomicToDisplay(atomic, USDCDecimals)
}

func AmountToAtomic(amount string, decimals int) (string, error) {
	trimmed := strings.TrimSpace(amount)
	if trimmed == "" {
		return "", fmt.Errorf("price is required")
	}
	parts := strings.SplitN(trimmed, ".", 2)
	whole := parts[0]
	frac := ""
	if len(parts) == 2 {
		frac = parts[1]
	}
	if len(frac) > decimals {
		return "", fmt.Errorf("supports at most %d decimal places", decimals)
	}
	for len(frac) < decimals {
		frac += "0"
	}
	combined := strings.TrimLeft(whole+frac, "0")
	if combined == "" {
		return "", fmt.Errorf("price must be greater than 0")
	}
	return combined, nil
}

func AtomicToDisplay(atomic string, decimals int) string {
	if atomic == "" || !isDigits(atomic) {
		return "0"
	}
	s := strings.TrimLeft(atomic, "0")
	if s == "" {
		s = "0"
	}
	for len(s) <= decimals {
		s = "0" + s
	}
	whole := strings.TrimLeft(s[:len(s)-decimals], "0")
	if whole == "" {
		whole = "0"
	}
	frac := strings.TrimRight(s[len(s)-decimals:], "0")
	if frac == "" {
		return whole
	}
	return whole + "." + frac
}

func FormatWithdrawDelay(seconds int) string {
	if seconds < 60 {
		return fmt.Sprintf("%d seconds", seconds)
	}
	if seconds < 3600 {
		m := (seconds + 30) / 60
		if m == 1 {
			return "1 minute"
		}
		return fmt.Sprintf("%d minutes", m)
	}
	if seconds < 86_400 {
		h := (seconds + 1800) / 3600
		if h == 1 {
			return "1 hour"
		}
		return fmt.Sprintf("%d hours", h)
	}
	d := (seconds + 43_200) / 86_400
	if d == 1 {
		return "1 day"
	}
	return fmt.Sprintf("%d days", d)
}

func BuildUsdcAccept(scheme, amountAtomic string, withdrawDelay ...int) AcceptOption {
	network := NetworkBase
	asset := USDCBaseMainnet
    extra := map[string]any{
		"name": "USD Coin", "version": "2", "assetTransferMethod": "eip3009",
	}
	out := AcceptOption{
		Scheme:            "exact",
		Network:           network,
		Asset:             asset,
		Amount:            amountAtomic,
		MaxTimeoutSeconds: 300,
		Extra:             extra,
	}
	if scheme == "batch-settlement" {
		delay := DefaultBatchWithdrawDelay
		if len(withdrawDelay) > 0 {
			delay = withdrawDelay[0]
		}
		out.Scheme = "batch-settlement"
		out.Extra["withdrawDelay"] = delay
	}
	return out
}

// BuildSandboxUsdcAccept builds an exact USDC accept for the seller Sandbox fork.
func BuildSandboxUsdcAccept(scheme, amountAtomic string) (AcceptOption, error) {
	if scheme == "batch-settlement" {
		return AcceptOption{}, fmt.Errorf("sandbox fork supports exact scheme only")
	}
	if scheme == "" {
		scheme = "exact"
	}
	if scheme != "exact" {
		return AcceptOption{}, fmt.Errorf("sandbox fork supports exact scheme only")
	}
	return AcceptOption{
		Scheme:            "exact",
		Network:           NetworkSandboxFork,
		Asset:             USDCBaseMainnet,
		Amount:            amountAtomic,
		MaxTimeoutSeconds: 300,
		Extra: map[string]any{
			"name": "USD Coin", "version": "2", "assetTransferMethod": "eip3009",
		},
	}, nil
}

type SetupAPIResult struct {
	API         *API
	Platform    *PlatformConfig
	GatewayHost string
	GatewayURL  string
}

// GatewayHostFromAPI prefers the primary assigned hostname.
// Sandbox APIs use a different platform domain than PlatformConfig.PlatformDomain.
func GatewayHostFromAPI(api *API, fallbackDomain string) string {
	if api == nil {
		return ""
	}
	var first string
	for _, d := range api.Domains {
		host := strings.TrimSpace(d.Hostname)
		if host == "" {
			continue
		}
		if first == "" {
			first = host
		}
		if d.IsPrimary {
			return host
		}
	}
	if first != "" {
		return first
	}
	if fallbackDomain != "" && api.Slug != "" {
		return api.Slug + "." + fallbackDomain
	}
	return ""
}

func SetupAPIWithDefaultDomain(ctx context.Context, client *Client, in CreateAPIInput) (*SetupAPIResult, error) {
	platform, err := client.PlatformConfig(ctx)
	if err != nil {
		return nil, err
	}
	api, err := client.CreateAPI(ctx, in)
	if err != nil {
		return nil, err
	}
	host := GatewayHostFromAPI(api, platform.PlatformDomain)
	return &SetupAPIResult{
		API:         api,
		Platform:    platform,
		GatewayHost: host,
		GatewayURL:  GatewayBaseURL(host, platform.GatewayPort),
	}, nil
}

func WrapOpenAPI(
	ctx context.Context,
	client *Client,
	apiID, spec string,
	accepts []AcceptOption,
	filter func(ParsedOpenAPIOperation) bool,
) (map[string]any, error) {
	parsed, err := client.ParseOpenAPI(ctx, spec)
	if err != nil {
		return nil, err
	}
	ops := make([]OpenAPIImportOperation, 0, len(parsed.Operations))
	for _, op := range parsed.Operations {
		if filter != nil && !filter(op) {
			continue
		}
		desc := op.Summary
		if desc == "" {
			desc = op.Description
		}
		ops = append(ops, OpenAPIImportOperation{
			Method:         op.Method,
			PathPattern:    op.PathPattern,
			Description:    desc,
			RequestSchema:  op.RequestSchema,
			ResponseSchema: op.ResponseSchema,
		})
	}
	return client.ImportOpenAPI(ctx, apiID, ops, accepts)
}

func isDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return s != ""
}