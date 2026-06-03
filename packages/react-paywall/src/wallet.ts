import { toClientEvmSigner, type ClientEvmSigner } from '@x402/evm'
import { createWalletClient, custom } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { chainForNetwork, type Eip1193Provider } from './permit2.js'

export type { Eip1193Provider }
import type { RpcConfig } from './types.js'

function caip2ToHexChainId(network: string): `0x${string}` | null {
  const match = /^eip155:(\d+)$/.exec(network.trim().toLowerCase())
  if (!match) {
    return null
  }
  const decimalId = Number.parseInt(match[1], 10)
  if (Number.isNaN(decimalId)) {
    return null
  }
  return `0x${decimalId.toString(16)}` as `0x${string}`
}

export async function switchWalletToNetwork(
  provider: Eip1193Provider,
  network: string,
): Promise<void> {
  const targetChainId = caip2ToHexChainId(network)
  if (!targetChainId) {
    throw new Error(`Wallet switching only supports eip155 networks, got "${network}".`)
  }
  const current = await provider.request({ method: 'eth_chainId' })
  if (
    typeof current === 'string' &&
    current.toLowerCase() === targetChainId.toLowerCase()
  ) {
    return
  }
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 4902
    ) {
      throw new Error(
        `Chain ${network} is not configured in your wallet. Add it, then retry.`,
        { cause: error },
      )
    }
    throw new Error('Wallet network switch failed.', { cause: error })
  }
}

/** @deprecated Prefer discoverWallets() when multiple extensions may be installed. */
export function getBrowserProvider(): Eip1193Provider {
  const w = globalThis as { ethereum?: Eip1193Provider }
  if (!w.ethereum) {
    throw new Error('No browser wallet detected. Install MetaMask or another EIP-1193 wallet.')
  }
  return w.ethereum
}

export function createBrowserWalletSigner(
  provider: Eip1193Provider,
  address: `0x${string}`,
  getSelectedNetwork: () => string | undefined,
  rpc?: RpcConfig,
): ClientEvmSigner {
  return toClientEvmSigner({
    address,
    async signTypedData(message) {
      const network = getSelectedNetwork() ?? 'eip155:84532'
      await switchWalletToNetwork(provider, network)
      const walletClient = createWalletClient({
        account: address,
        chain: chainForNetwork(network, rpc),
        transport: custom(provider),
      })
      return walletClient.signTypedData({
        account: address,
        domain: message.domain as Parameters<typeof walletClient.signTypedData>[0]['domain'],
        types: message.types as Parameters<typeof walletClient.signTypedData>[0]['types'],
        primaryType: message.primaryType,
        message: message.message as Parameters<typeof walletClient.signTypedData>[0]['message'],
      })
    },
  })
}

export function normalizePrivateKey(input: string): `0x${string}` {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    throw new Error('Private key is required.')
  }
  const prefixed = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  return prefixed as `0x${string}`
}

export function createPrivateKeySigner(privateKey: `0x${string}`): ClientEvmSigner {
  const account = privateKeyToAccount(privateKey)
  return toClientEvmSigner(account)
}

export async function connectWalletAddress(provider: Eip1193Provider): Promise<`0x${string}`> {
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== 'string') {
    throw new Error('Wallet did not return an account.')
  }
  return accounts[0] as `0x${string}`
}
