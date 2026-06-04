import { BatchSettlementEvmScheme, toClientEvmSigner, type ClientEvmSigner } from '@x402/evm'
import { recoverChannel, type BatchSettlementClientDeps } from '@x402/evm/batch-settlement/client'
import type { PaymentRequirements } from '@x402/fetch'
import { createPublicClient, http } from 'viem'
import { chainForNetwork, rpcUrlForNetwork } from './permit2.js'
import type { RpcConfig } from './types.js'

export type BatchChannelStorage = {
  get(key: string): Promise<Record<string, unknown> | undefined>
  set(key: string, value: Record<string, unknown>): Promise<void>
  delete(key: string): Promise<void>
}

export type BatchPaywallOptions = {
  channelSalt?: `0x${string}`
  depositMultiplier?: number
  storage?: BatchChannelStorage
  /** Persist channel balances in localStorage (browser only). */
  persistChannels?: boolean
}

const DEFAULT_SALT =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const

function hasUsableChannelBalance(ctx: Record<string, unknown> | undefined): boolean {
  if (!ctx) return false
  const balance = ctx.balance
  if (balance === undefined || balance === null) return false
  try {
    return BigInt(String(balance)) > 0n
  } catch {
    return false
  }
}

/** Treat empty/zero cached balance as a miss so @x402/evm recoverChannel reads on-chain escrow. */
export function createRecoveringChannelStorage(inner: BatchChannelStorage): BatchChannelStorage {
  return {
    async get(key) {
      const ctx = await inner.get(key)
      if (!hasUsableChannelBalance(ctx)) return undefined
      return ctx
    },
    set(key, value) {
      return inner.set(key, value)
    },
    delete(key) {
      return inner.delete(key)
    },
  }
}

export function createLocalStorageChannelStorage(namespace = 'x402-paywall'): BatchChannelStorage {
  const prefix = `${namespace}:`
  return {
    async get(key) {
      if (typeof localStorage === 'undefined') return undefined
      const raw = localStorage.getItem(`${prefix}${key}`)
      if (!raw) return undefined
      try {
        return JSON.parse(raw) as Record<string, unknown>
      } catch {
        return undefined
      }
    },
    async set(key, value) {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(`${prefix}${key}`, JSON.stringify(value))
    },
    async delete(key) {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(`${prefix}${key}`)
    },
  }
}

function normalizeChannelsReadResult(result: unknown): readonly [bigint, bigint] {
  if (Array.isArray(result)) {
    const balance = result[0] ?? 0n
    const totalClaimed = result[1] ?? 0n
    return [BigInt(balance), BigInt(totalClaimed)]
  }
  if (result && typeof result === 'object') {
    const row = result as { balance?: bigint | number | string; totalClaimed?: bigint | number | string }
    return [BigInt(row.balance ?? 0), BigInt(row.totalClaimed ?? 0)]
  }
  return [0n, 0n]
}

export function withReadContractSigner(
  signer: ClientEvmSigner,
  network: string,
  rpc?: RpcConfig,
): ClientEvmSigner {
  const publicClient = createPublicClient({
    chain: chainForNetwork(network, rpc),
    transport: http(rpcUrlForNetwork(network, rpc)),
  })
  const base = toClientEvmSigner(signer, publicClient)
  const readContract = base.readContract
  if (!readContract) {
    return base
  }
  return {
    ...base,
    readContract: async (params) => {
      const out = await readContract(params)
      if (
        params &&
        typeof params === 'object' &&
        'functionName' in params &&
        params.functionName === 'channels'
      ) {
        const [balance, totalClaimed] = normalizeChannelsReadResult(out)
        return [balance, totalClaimed]
      }
      return out
    },
  }
}

function seedChannelFromRequirementExtra(
  storage: BatchChannelStorage,
  requirements: PaymentRequirements,
): void {
  const extra = requirements.extra as Record<string, unknown> | undefined
  const channelState = extra?.channelState
  if (!channelState || typeof channelState !== 'object') return
  const row = channelState as Record<string, unknown>
  const channelId = row.channelId
  if (typeof channelId !== 'string' || channelId.length === 0) return
  const balance = row.balance
  if (balance === undefined) return
  try {
    if (BigInt(String(balance)) <= 0n) return
  } catch {
    return
  }
  void storage.set(channelId.toLowerCase(), {
    balance: String(balance),
    totalClaimed: String(row.totalClaimed ?? '0'),
    chargedCumulativeAmount: String(row.chargedCumulativeAmount ?? row.totalClaimed ?? '0'),
  })
}

/** Load escrow balance from chain (and 402 channelState when present) before paying. */
export async function primeBatchChannelFromChain(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  storage: BatchChannelStorage,
  salt: `0x${string}`,
): Promise<bigint> {
  seedChannelFromRequirementExtra(storage, requirements)
  if (!signer.readContract) {
    return 0n
  }
  const deps: BatchSettlementClientDeps = { signer, storage, salt }
  try {
    const ctx = await recoverChannel(deps, requirements)
    return BigInt(ctx.balance ?? '0')
  } catch {
    return 0n
  }
}

export function resolveBatchChannelStorage(
  options: BatchPaywallOptions = {},
  persistByDefault = true,
): BatchChannelStorage | undefined {
  if (options.storage) {
    return options.storage
  }
  const persist = options.persistChannels ?? persistByDefault
  if (!persist) {
    return undefined
  }
  return createRecoveringChannelStorage(createLocalStorageChannelStorage())
}

export function createBatchSettlementScheme(
  signer: ClientEvmSigner,
  options: BatchPaywallOptions = {},
): BatchSettlementEvmScheme {
  const storage = resolveBatchChannelStorage(options)
  const salt = (options.channelSalt ?? DEFAULT_SALT) as `0x${string}`
  const depositMultiplier = options.depositMultiplier ?? 5
  return new BatchSettlementEvmScheme(signer, {
    salt,
    depositPolicy: { depositMultiplier },
    ...(storage ? { storage } : {}),
  })
}

export function isBatchSettlementScheme(scheme: string): boolean {
  return scheme.toLowerCase() === 'batch-settlement'
}

export function batchDepositAmount(amount: string, depositMultiplier: number): bigint {
  const mult = BigInt(depositMultiplier)
  if (mult < 3n) {
    throw new Error('batch depositMultiplier must be an integer >= 3')
  }
  return mult * BigInt(amount)
}
