/** Base mainnet (CAIP-2). */
export const NETWORK_BASE = 'eip155:8453'
/** Base Sepolia testnet (CAIP-2). */
export const NETWORK_BASE_SEPOLIA = 'eip155:84532'
export const NETWORK_NEOX_MAINNET = 'eip155:47763'
/** Neo X testnet (CAIP-2). */
export const NETWORK_NEOX_TESTNET = 'eip155:12227332'

/** Default when policy does not set preferredNetworks. */
export const DEFAULT_PAYWALL_NETWORK = NETWORK_BASE

/** Batch-settlement fallback when no network is selected. */
export const DEFAULT_BATCH_PAYWALL_NETWORK = NETWORK_BASE

export const SUPPORTED_PAYWALL_NETWORKS = [
  NETWORK_BASE,
  NETWORK_BASE_SEPOLIA,
  NETWORK_NEOX_MAINNET,
  NETWORK_NEOX_TESTNET,
] as const

export const DEFAULT_RPC_BY_NETWORK: Record<string, string> = {
  [NETWORK_BASE]: 'https://mainnet.base.org',
  [NETWORK_BASE_SEPOLIA]: 'https://sepolia.base.org',
  [NETWORK_NEOX_MAINNET]: 'https://mainnet-1.rpc.banelabs.org',
  [NETWORK_NEOX_TESTNET]: 'https://testnet.rpc.banelabs.org',
}

export function resolveFallbackNetwork(preferredNetworks?: string): string {
  const first = preferredNetworks?.split(',')[0]?.trim()
  return first || DEFAULT_PAYWALL_NETWORK
}
