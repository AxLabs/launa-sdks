import { BatchSettlementEvmScheme, toClientEvmSigner, type ClientEvmSigner } from '@x402/evm'
import {
  buildChannelConfig,
  computeChannelId,
  readChannelBalanceAndTotalClaimed,
  recoverChannel,
  type BatchSettlementClientDeps,
} from '@x402/evm/batch-settlement/client'
import type { PaymentRequirements } from '@x402/fetch'
import type { PaywallLabels } from './appearance.js'
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
  /**
   * Must match the API batch withdraw delay used when the channel was opened.
   * Defaults to 3 days (x402 default for new batch endpoints).
   */
  withdrawDelaySecs?: number
  storage?: BatchChannelStorage
  /** Persist channel balances in localStorage (browser only). */
  persistChannels?: boolean
  /** Log channel id / on-chain balance to console (`[x402-paywall:batch]`). */
  debugChannel?: boolean
}

const DEFAULT_SALT =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const

/** Align with @axlabs/launa-sdk DEFAULT_BATCH_WITHDRAW_DELAY (3 days). */
export const DEFAULT_BATCH_WITHDRAW_DELAY_SECS = 259_200

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

function hasBatchSessionMetadata(ctx: Record<string, unknown> | undefined): boolean {
  if (!ctx) return false
  return (
    ctx.chargedCumulativeAmount !== undefined ||
    ctx.signedMaxClaimable !== undefined ||
    ctx.totalClaimed !== undefined
  )
}

/** Charged amount used for voucher cumulative signing (not signedMax ceiling). */
function storedChargedAmount(ctx: Record<string, unknown> | undefined): bigint {
  const charged = parseStoredBigInt(ctx?.chargedCumulativeAmount)
  if (charged !== undefined) return charged
  const totalClaimed = parseStoredBigInt(ctx?.totalClaimed)
  if (totalClaimed !== undefined) return totalClaimed
  return 0n
}

/** Treat empty/zero cached balance as a miss so @x402/evm recoverChannel reads on-chain escrow. */
export function createRecoveringChannelStorage(inner: BatchChannelStorage): BatchChannelStorage {
  return {
    async get(key) {
      const ctx = await inner.get(key)
      if (!ctx) return undefined
      if (hasUsableChannelBalance(ctx) || hasBatchSessionMetadata(ctx)) {
        return ctx
      }
      await inner.delete(key)
      return undefined
    },
    async set(key, value) {
      let next = value
      if (!hasUsableChannelBalance(next)) {
        const prev = await inner.get(key)
        if (prev) {
          next = { ...prev, ...value }
        }
      }
      if (!hasUsableChannelBalance(next) && !hasBatchSessionMetadata(next)) {
        await inner.delete(key)
        return
      }
      return inner.set(key, next)
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

/**
 * Ensure `extra.withdrawDelay` is set on the same object x402 passes to
 * BatchSettlementEvmScheme (hooks must not replace selectedRequirements).
 */
export function enrichBatchPaymentRequirements(
  requirements: PaymentRequirements,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
): PaymentRequirements {
  if (!isBatchSettlementScheme(requirements.scheme)) {
    return requirements
  }
  const extra = (requirements.extra ?? {}) as Record<string, unknown>
  if (typeof extra.withdrawDelay !== 'number') {
    requirements.extra = { ...extra, withdrawDelay: withdrawDelaySecs }
  }
  return requirements
}

function batchDebug(enabled: boolean | undefined, message: string, data?: unknown): void {
  if (!enabled) return
  if (data !== undefined) {
    console.info(`[x402-paywall:batch] ${message}`, data)
  } else {
    console.info(`[x402-paywall:batch] ${message}`)
  }
}

/** Sync client channel storage from batch accept extra (402 channelState / voucherState). */
export function seedBatchChannelFromRequirements(
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
  const extra2 = requirements.extra as Record<string, unknown> | undefined
  const voucherState = extra2?.voucherState
  const voucherRow =
    voucherState && typeof voucherState === 'object'
      ? (voucherState as Record<string, unknown>)
      : undefined
  const signedMax = voucherRow?.signedMaxClaimable
  void storage.set(channelId.toLowerCase(), {
    balance: String(balance),
    totalClaimed: String(row.totalClaimed ?? '0'),
    chargedCumulativeAmount: String(row.chargedCumulativeAmount ?? row.totalClaimed ?? '0'),
    ...(signedMax !== undefined ? { signedMaxClaimable: String(signedMax) } : {}),
  })
}

export class BatchEscrowHeadroomError extends Error {
  readonly shortfallAtomic: string
  readonly balanceAtomic: string
  readonly maxClaimableAtomic: string

  constructor(shortfall: bigint, balance: bigint, maxClaimable: bigint) {
    const shortfallUsdc = Number(shortfall) / 1_000_000
    super(
      `Escrow has ${Number(balance) / 1_000_000} USDC left but this payment needs a signed ceiling of ${Number(maxClaimable) / 1_000_000} USDC. Top up the channel by at least ${shortfallUsdc} USDC (wallet will ask for a USDC authorization, then a voucher).`,
    )
    this.name = 'BatchEscrowHeadroomError'
    this.shortfallAtomic = shortfall.toString()
    this.balanceAtomic = balance.toString()
    this.maxClaimableAtomic = maxClaimable.toString()
  }
}

/**
 * Refresh on-chain escrow + session charges before @x402/evm builds the payment payload.
 * Throws when voucher-only is impossible (prevents voucher-then-failed-top-up double sign).
 */
export async function prepareBatchChannelForPayment(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  storage: BatchChannelStorage,
  salt: `0x${string}`,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
  debug?: boolean,
): Promise<BatchPaymentKind> {
  const balance = await primeBatchChannelFromChain(
    signer,
    requirements,
    storage,
    salt,
    withdrawDelaySecs,
    debug,
  )
  const kind = await resolveBatchPaymentKind(
    signer,
    requirements,
    storage,
    salt,
    withdrawDelaySecs,
    debug,
  )
  if (kind === 'topup' || kind === 'deposit') {
    return kind
  }
  const channelId = computeBatchChannelId(signer, requirements, salt, withdrawDelaySecs)
  const ctx = await storage.get(channelId.toLowerCase())
  const charged = storedChargedAmount(ctx)
  const requestAmount = BigInt(requirements.amount)
  const maxClaimable = charged + requestAmount
  if (maxClaimable > balance) {
    throw new BatchEscrowHeadroomError(maxClaimable - balance, balance, maxClaimable)
  }
  return kind
}

export function computeBatchChannelId(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  salt: `0x${string}`,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
): `0x${string}` {
  enrichBatchPaymentRequirements(requirements, withdrawDelaySecs)
  const deps: BatchSettlementClientDeps = { signer, storage: createNoopChannelStorage(), salt }
  const config = buildChannelConfig(deps, requirements)
  return computeChannelId(config, requirements.network)
}

function createNoopChannelStorage(): BatchChannelStorage {
  return {
    async get() {
      return undefined
    },
    async set() {},
    async delete() {},
  }
}

function parseStoredBigInt(value: unknown): bigint | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  try {
    return BigInt(String(value))
  } catch {
    return undefined
  }
}

/** Session charged total for voucher signing — never conflate with signedMax ceiling. */
function effectiveChargedCumulative(
  prev: Record<string, unknown> | undefined,
  totalClaimedOnChain: bigint,
): bigint {
  const charged = parseStoredBigInt(prev?.chargedCumulativeAmount) ?? 0n
  return totalClaimedOnChain > charged ? totalClaimedOnChain : charged
}

async function syncChannelBalanceById(
  signer: ClientEvmSigner,
  channelId: string,
  storage: BatchChannelStorage,
): Promise<bigint> {
  if (!signer.readContract) {
    return 0n
  }
  const key = channelId.toLowerCase()
  try {
    const raw = await readChannelBalanceAndTotalClaimed(signer, channelId as `0x${string}`)
    const [balance, totalClaimed] = normalizeChannelsReadResult(raw)
    if (balance <= 0n) {
      await storage.delete(key)
      return 0n
    }
    const prev = await storage.get(key)
    const charged = effectiveChargedCumulative(prev, totalClaimed)
    const signedMax = parseStoredBigInt(prev?.signedMaxClaimable) ?? charged
    await storage.set(key, {
      ...prev,
      balance: balance.toString(),
      totalClaimed: totalClaimed.toString(),
      chargedCumulativeAmount: charged.toString(),
      signedMaxClaimable: signedMax.toString(),
    })
    return balance
  } catch {
    await storage.delete(key)
    return 0n
  }
}

/** Load escrow balance from chain (and 402 channelState when present) before paying. */
export async function primeBatchChannelFromChain(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  storage: BatchChannelStorage,
  salt: `0x${string}`,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
  debug?: boolean,
): Promise<bigint> {
  enrichBatchPaymentRequirements(requirements, withdrawDelaySecs)
  seedBatchChannelFromRequirements(storage, requirements)

  const channelId = computeBatchChannelId(signer, requirements, salt, withdrawDelaySecs)
  batchDebug(debug, 'channel id', { channelId, withdrawDelay: (requirements.extra as Record<string, unknown>)?.withdrawDelay })
  if (!signer.readContract) {
    batchDebug(debug, 'signer has no readContract — cannot load on-chain escrow')
    return 0n
  }

  const fromChain = await syncChannelBalanceById(signer, channelId, storage)
  batchDebug(debug, 'on-chain escrow (atomic)', { channelId, balance: fromChain.toString() })
  if (fromChain > 0n) {
    return fromChain
  }

  const extra = requirements.extra as Record<string, unknown> | undefined
  const channelState = extra?.channelState
  if (channelState && typeof channelState === 'object') {
    const row = channelState as Record<string, unknown>
    const stateId = row.channelId
    if (typeof stateId === 'string' && stateId.length > 0 && stateId.toLowerCase() !== channelId.toLowerCase()) {
      const byState = await syncChannelBalanceById(signer, stateId, storage)
      batchDebug(debug, 'on-chain escrow via 402 channelState', { stateId, balance: byState.toString() })
      if (byState > 0n) {
        return byState
      }
    }
  }

  const deps: BatchSettlementClientDeps = { signer, storage, salt }
  try {
    const ctx = await recoverChannel(deps, requirements)
    const bal = BigInt(ctx.balance ?? '0')
    batchDebug(debug, 'recoverChannel balance (atomic)', bal.toString())
    return bal
  } catch (err) {
    batchDebug(debug, 'recoverChannel failed', err)
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
    depositStrategy: async (ctx) => {
      const max = BigInt(ctx.maxClaimableAmount)
      const balance = BigInt(ctx.currentBalance)
      if (max > balance && balance > 0n) {
        return ctx.minimumDepositAmount
      }
      return ctx.depositAmount
    },
  })
}

export function isBatchSettlementScheme(scheme: string): boolean {
  return scheme.toLowerCase() === 'batch-settlement'
}

export type BatchPaymentKind = 'deposit' | 'topup' | 'voucher'

export type BatchChannelStatus = {
  channelId: `0x${string}`
  balance: string
  totalClaimed: string
  chargedCumulative: string
  signedMaxClaimable: string
  unclaimedEscrow: string
  /** Balance not yet covered by signed voucher ceiling. */
  voucherHeadroom: string
  paymentKind: BatchPaymentKind
}

function atomicSubNonNeg(a: string, b: string): string {
  try {
    const x = BigInt(a)
    const y = BigInt(b)
    const z = x - y
    return (z < 0n ? 0n : z).toString()
  } catch {
    return '0'
  }
}

/** On-chain escrow + session charges for batch UI (demo/dashboard-style). */
export async function getBatchChannelStatus(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  storage: BatchChannelStorage,
  salt: `0x${string}`,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
  debug?: boolean,
): Promise<BatchChannelStatus> {
  enrichBatchPaymentRequirements(requirements, withdrawDelaySecs)
  const channelId = computeBatchChannelId(signer, requirements, salt, withdrawDelaySecs)
  await primeBatchChannelFromChain(signer, requirements, storage, salt, withdrawDelaySecs, debug)

  let balance = 0n
  let totalClaimed = 0n
  if (signer.readContract) {
    const raw = await readChannelBalanceAndTotalClaimed(signer, channelId)
    ;[balance, totalClaimed] = normalizeChannelsReadResult(raw)
  }

  const ctx = await storage.get(channelId.toLowerCase())
  const charged = storedChargedAmount(ctx)
  const signedMax = parseStoredBigInt(ctx?.signedMaxClaimable) ?? charged
  const paymentKind = await resolveBatchPaymentKind(
    signer,
    requirements,
    storage,
    salt,
    withdrawDelaySecs,
    debug,
  )

  return {
    channelId,
    balance: balance.toString(),
    totalClaimed: totalClaimed.toString(),
    chargedCumulative: charged.toString(),
    signedMaxClaimable: signedMax.toString(),
    unclaimedEscrow: atomicSubNonNeg(balance.toString(), totalClaimed.toString()),
    voucherHeadroom: atomicSubNonNeg(balance.toString(), signedMax.toString()),
    paymentKind,
  }
}

/** Mirrors @x402/evm batch deposit vs voucher decision for UI copy. */
export async function resolveBatchPaymentKind(
  signer: ClientEvmSigner,
  requirements: PaymentRequirements,
  storage: BatchChannelStorage,
  salt: `0x${string}`,
  withdrawDelaySecs: number = DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
  debug?: boolean,
): Promise<BatchPaymentKind> {
  const balance = await primeBatchChannelFromChain(
    signer,
    requirements,
    storage,
    salt,
    withdrawDelaySecs,
    debug,
  )
  if (balance <= 0n) {
    batchDebug(debug, 'payment kind', 'deposit (no escrow)')
    return 'deposit'
  }
  enrichBatchPaymentRequirements(requirements, withdrawDelaySecs)
  const channelId = computeBatchChannelId(signer, requirements, salt, withdrawDelaySecs)
  const ctx = await storage.get(channelId.toLowerCase())
  const charged = storedChargedAmount(ctx)
  const requestAmount = BigInt(requirements.amount)
  const maxClaimable = charged + requestAmount
  if (maxClaimable > balance) {
    batchDebug(debug, 'payment kind', {
      kind: 'topup',
      balance: balance.toString(),
      charged: charged.toString(),
      maxClaimable: maxClaimable.toString(),
    })
    return 'topup'
  }
  batchDebug(debug, 'payment kind', 'voucher')
  return 'voucher'
}

export function batchPayLabelForKind(
  kind: BatchPaymentKind,
  labels: Partial<PaywallLabels> = {},
): string {
  switch (kind) {
    case 'deposit':
      return labels.payToReadDeposit ?? labels.payToRead ?? 'Deposit & unlock'
    case 'topup':
      return labels.payToReadTopUp ?? 'Top up & unlock'
    case 'voucher':
      return labels.payToReadVoucher ?? labels.payToRead ?? 'Unlock'
  }
}

export function batchDepositAmount(amount: string, depositMultiplier: number): bigint {
  const mult = BigInt(depositMultiplier)
  if (mult < 3n) {
    throw new Error('batch depositMultiplier must be an integer >= 3')
  }
  return mult * BigInt(amount)
}
