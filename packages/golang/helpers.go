package ax402

import (
	"fmt"
	"strings"
)

const (
	USDCNetworkMainnet = "eip155:8453"
	USDCNetworkSepolia = "eip155:84532"
	USDCAssetMainnet   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
	USDCAssetSepolia   = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
)

func GatewayURL(host, path string, port int) string {
	if strings.HasSuffix(host, ".localhost") || host == "localhost" {
		if port != 80 && port != 443 {
			return fmt.Sprintf("http://%s:%d%s", host, port, path)
		}
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return "https://" + host + path
}

func BuildUsdcAccept(scheme, amountAtomic string) AcceptOption {
	network := USDCNetworkMainnet
	asset := USDCAssetMainnet
	if scheme == "batch-settlement" {
		network = USDCNetworkMainnet
		asset = USDCAssetMainnet
	}
	base := AcceptOption{
		Scheme:            "exact",
		Network:           network,
		Asset:             asset,
		Amount:            amountAtomic,
		MaxTimeoutSeconds: 300,
		Extra: map[string]any{
			"name": "USDC", "version": "2", "assetTransferMethod": "eip3009",
		},
	}
	if scheme == "batch-settlement" {
		base.Scheme = "batch-settlement"
		base.Extra["withdrawDelay"] = 900
	}
	return base
}
