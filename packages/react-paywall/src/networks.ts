/** Base mainnet (CAIP-2). */
export const NETWORK_BASE = 'eip155:8453'
/** Base Sepolia testnet (CAIP-2). */
export const NETWORK_BASE_SEPOLIA = 'eip155:84532'
/** Anvil Base mainnet fork (seller Sandbox / development). */
export const NETWORK_SANDBOX_FORK = 'eip155:845320402'
export const NETWORK_NEOX_MAINNET = 'eip155:47763'
/** Neo X testnet (CAIP-2). */
export const NETWORK_NEOX_TESTNET = 'eip155:12227332'
export const NETWORK_HEDERA_MAINNET = 'hedera:mainnet'
export const NETWORK_HEDERA_TESTNET = 'hedera:testnet'

/** Default when policy does not set preferredNetworks. */
export const DEFAULT_PAYWALL_NETWORK = NETWORK_BASE

/** Batch-settlement fallback when no network is selected. */
export const DEFAULT_BATCH_PAYWALL_NETWORK = NETWORK_BASE

export const SUPPORTED_PAYWALL_NETWORKS = [
  NETWORK_BASE,
  NETWORK_BASE_SEPOLIA,
  NETWORK_SANDBOX_FORK,
  NETWORK_NEOX_MAINNET,
  NETWORK_NEOX_TESTNET,
  NETWORK_HEDERA_MAINNET,
  NETWORK_HEDERA_TESTNET,
] as const

/** Public RPC / mirror node URLs. Hedera uses Mirror Node REST (not JSON-RPC). */
export const DEFAULT_RPC_BY_NETWORK: Record<string, string> = {
  [NETWORK_BASE]: 'https://mainnet.base.org',
  [NETWORK_BASE_SEPOLIA]: 'https://sepolia.base.org',
  [NETWORK_SANDBOX_FORK]: 'https://rpc-dev.launa.io',
  [NETWORK_NEOX_MAINNET]: 'https://mainnet-1.rpc.banelabs.org',
  [NETWORK_NEOX_TESTNET]: 'https://testnet.rpc.banelabs.org',
  [NETWORK_HEDERA_MAINNET]: 'https://mainnet-public.mirrornode.hedera.com',
  [NETWORK_HEDERA_TESTNET]: 'https://testnet.mirrornode.hedera.com',
}

export const HASHSCAN_BASE_BY_NETWORK: Record<string, string> = {
  [NETWORK_HEDERA_MAINNET]: 'https://hashscan.io/mainnet',
  [NETWORK_HEDERA_TESTNET]: 'https://hashscan.io/testnet',
}

export function isHederaNetwork(network: string): boolean {
  return network.trim().toLowerCase().startsWith('hedera:')
}

export function hashscanAccountUrl(network: string, accountId: string): string | null {
  const base = HASHSCAN_BASE_BY_NETWORK[network.trim()]
  if (!base) return null
  return `${base}/account/${accountId}`
}

export function hashscanTransactionUrl(network: string, transactionId: string): string | null {
  const base = HASHSCAN_BASE_BY_NETWORK[network.trim()]
  if (!base) return null
  return `${base}/transaction/${encodeURIComponent(transactionId)}`
}

export function resolveFallbackNetwork(preferredNetworks?: string): string {
  const first = preferredNetworks?.split(',')[0]?.trim()
  return first || DEFAULT_PAYWALL_NETWORK
}

/** True when the first preferred network (or default) is Hedera. */
export function prefersHederaNetwork(preferredNetworks?: string): boolean {
  return isHederaNetwork(resolveFallbackNetwork(preferredNetworks))
}
