import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RPC_BY_NETWORK,
  HASHSCAN_BASE_BY_NETWORK,
  NETWORK_HEDERA_MAINNET,
  NETWORK_HEDERA_TESTNET,
  NETWORK_SANDBOX_FORK,
  SUPPORTED_PAYWALL_NETWORKS,
  hashscanAccountUrl,
  hashscanTransactionUrl,
  isHederaNetwork,
  prefersHederaNetwork,
  resolveFallbackNetwork,
} from './networks.js'

describe('sandbox fork', () => {
  it('is a supported paywall network with a hosted RPC', () => {
    expect(SUPPORTED_PAYWALL_NETWORKS).toContain(NETWORK_SANDBOX_FORK)
    expect(DEFAULT_RPC_BY_NETWORK[NETWORK_SANDBOX_FORK]).toBe('https://rpc-dev.launa.io')
  })
})

describe('hedera networks', () => {
  it('detects hedera CAIP-2 ids', () => {
    expect(isHederaNetwork(NETWORK_HEDERA_TESTNET)).toBe(true)
    expect(isHederaNetwork('Hedera:Mainnet')).toBe(true)
    expect(isHederaNetwork('eip155:84532')).toBe(false)
  })

  it('resolves preferred hedera network', () => {
    expect(resolveFallbackNetwork(`${NETWORK_HEDERA_TESTNET},eip155:84532`)).toBe(
      NETWORK_HEDERA_TESTNET,
    )
    expect(prefersHederaNetwork(NETWORK_HEDERA_MAINNET)).toBe(true)
    expect(prefersHederaNetwork('eip155:84532')).toBe(false)
  })

  it('builds HashScan URLs', () => {
    expect(HASHSCAN_BASE_BY_NETWORK[NETWORK_HEDERA_TESTNET]).toBe('https://hashscan.io/testnet')
    expect(hashscanAccountUrl(NETWORK_HEDERA_TESTNET, '0.0.1234')).toBe(
      'https://hashscan.io/testnet/account/0.0.1234',
    )
    expect(hashscanTransactionUrl(NETWORK_HEDERA_MAINNET, '0.0.1@2.3')).toBe(
      'https://hashscan.io/mainnet/transaction/0.0.1%402.3',
    )
    expect(hashscanAccountUrl('eip155:84532', '0xabc')).toBeNull()
  })
})
