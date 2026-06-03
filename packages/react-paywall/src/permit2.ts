import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams,
} from '@x402/evm'
import type { PaymentRequirements } from '@x402/fetch'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Chain,
  type Hex,
  type Transport,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { RpcConfig } from './types.js'

export type Eip1193Provider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

export function rpcUrlForNetwork(network: string, rpc?: RpcConfig): string {
  const key = network.toUpperCase().replace(':', '_')
  if (rpc?.byNetwork?.[network]?.trim()) {
    return rpc.byNetwork[network].trim()
  }
  if (rpc?.byNetwork?.[key]?.trim()) {
    return rpc.byNetwork[key].trim()
  }
  if (rpc?.defaultUrl?.trim()) {
    return rpc.defaultUrl.trim()
  }
  if (network === 'eip155:84532') {
    return 'https://sepolia.base.org'
  }
  if (network === 'eip155:12227332') {
    return 'https://testnet.rpc.banelabs.org'
  }
  throw new Error(`No RPC URL for network ${network}. Pass rpc.defaultUrl or rpc.byNetwork`)
}

export function chainForNetwork(network: string, rpc?: RpcConfig): Chain {
  const match = /^eip155:(\d+)$/i.exec(network.trim())
  if (!match) {
    throw new Error(`Permit2 auto-approve only supports eip155 networks, got "${network}"`)
  }
  const id = Number.parseInt(match[1], 10)
  return defineChain({
    id,
    name: network,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrlForNetwork(network, rpc)] } },
  })
}

function inferTransferMethod(extra?: Record<string, unknown>): string {
  const raw = extra?.assetTransferMethod
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.toLowerCase()
  }
  return 'eip3009'
}

export function requiresPermit2(extra?: Record<string, unknown> | undefined): boolean {
  return inferTransferMethod(extra) === 'permit2'
}

async function readPermit2Allowance(
  token: `0x${string}`,
  owner: `0x${string}`,
  network: string,
  rpc?: RpcConfig,
): Promise<bigint> {
  const chain = chainForNetwork(network, rpc)
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrlForNetwork(network, rpc)),
  })
  const readParams = getPermit2AllowanceReadParams({
    tokenAddress: token,
    ownerAddress: owner,
  })
  return (await publicClient.readContract(readParams)) as bigint
}

async function sendPermit2Approval(
  token: `0x${string}`,
  network: string,
  sendTx: (tx: { to: `0x${string}`; data: `0x${string}` }) => Promise<Hex>,
  rpc?: RpcConfig,
): Promise<void> {
  const chain = chainForNetwork(network, rpc)
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrlForNetwork(network, rpc)),
  })
  const approvalTx = createPermit2ApprovalTx(token)
  const hash = await sendTx(approvalTx)
  await publicClient.waitForTransactionReceipt({ hash })
}

export async function ensurePermit2Allowance(
  provider: Eip1193Provider,
  owner: `0x${string}`,
  token: `0x${string}`,
  requiredAmount: bigint,
  network: string,
  rpc?: RpcConfig,
): Promise<void> {
  const allowance = await readPermit2Allowance(token, owner, network, rpc)
  if (allowance >= requiredAmount) {
    return
  }
  await sendPermit2Approval(
    token,
    network,
    async (tx) => {
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: owner, to: tx.to, data: tx.data }],
      })
      if (typeof hash !== 'string') {
        throw new Error('Permit2 approval transaction was not broadcast')
      }
      return hash as Hex
    },
    rpc,
  )
}

export async function ensurePermit2AllowanceWithPrivateKey(
  privateKey: Hex,
  token: `0x${string}`,
  requiredAmount: bigint,
  network: string,
  rpc?: RpcConfig,
): Promise<void> {
  const account = privateKeyToAccount(privateKey)
  const allowance = await readPermit2Allowance(token, account.address, network, rpc)
  if (allowance >= requiredAmount) {
    return
  }
  const chain = chainForNetwork(network, rpc)
  const transport = http(rpcUrlForNetwork(network, rpc)) as Transport
  const walletClient = createWalletClient({ account, chain, transport })
  await sendPermit2Approval(
    token,
    network,
    async (tx) => walletClient.sendTransaction({ to: tx.to, data: tx.data }),
    rpc,
  )
}

export interface Permit2SignerOptions {
  walletAddress?: `0x${string}`
  provider?: Eip1193Provider
  privateKey?: Hex
  rpc?: RpcConfig
  switchNetwork?: (network: string) => Promise<void>
}

export async function ensurePermit2ForRequirements(
  requirements: PaymentRequirements,
  options: Permit2SignerOptions,
): Promise<void> {
  if (!requiresPermit2(requirements.extra as Record<string, unknown> | undefined)) {
    return
  }
  const token = requirements.asset as `0x${string}`
  const amount = BigInt(requirements.amount)

  if (options.walletAddress && options.provider) {
    if (options.switchNetwork) {
      await options.switchNetwork(requirements.network)
    }
    await ensurePermit2Allowance(
      options.provider,
      options.walletAddress,
      token,
      amount,
      requirements.network,
      options.rpc,
    )
    return
  }

  if (options.privateKey) {
    await ensurePermit2AllowanceWithPrivateKey(
      options.privateKey,
      token,
      amount,
      requirements.network,
      options.rpc,
    )
    return
  }

  throw new Error('Permit2 approval requires a connected wallet or privateKey')
}
