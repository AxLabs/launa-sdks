import type { ClientEvmSigner } from '@x402/evm'
import {
  createPublicClient,
  getAddress,
  getTypesForEIP712Domain,
  http,
  serializeTypedData,
  type Hex,
  type TypedDataDomain,
} from 'viem'
import { getEip712Domain } from 'viem/actions'
import { chainForNetwork, rpcUrlForNetwork } from './permit2.js'
import type { RpcConfig } from './types.js'

export type Eip712SignMessage = {
  domain: Record<string, unknown>
  types: Record<string, unknown>
  primaryType: string
  message: Record<string, unknown>
}

export type Eip712DomainSource = 'message' | 'erc5267'

export type SignTypedDataContext = Eip712SignMessage & {
  domainSource: Eip712DomainSource
  network: string
}

export type PaywallSignTypedDataOptions = {
  /** Called after ERC-5267 domain resolution, immediately before the wallet signs. */
  onBeforeSignTypedData?: (ctx: SignTypedDataContext) => void | Promise<void>
  /** Log domain resolution to console (`[x402-paywall:eip712]`). */
  debugEip712?: boolean
  rpc?: RpcConfig
  /** CAIP-2 network for RPC reads (e.g. `eip155:84532`). */
  getNetwork?: () => string | undefined
}

const ERC5267_FIELD_NAMES = [
  'name',
  'version',
  'chainId',
  'verifyingContract',
  'salt',
] as const

const ZERO_BYTES32 = `0x${'0'.repeat(64)}` as const

function erc5267PresentFields(fields: Hex): Set<(typeof ERC5267_FIELD_NAMES)[number]> {
  const byte = Number.parseInt(fields.slice(2).padStart(2, '0').slice(-2), 16)
  const present = new Set<(typeof ERC5267_FIELD_NAMES)[number]>()
  for (let i = 0; i < ERC5267_FIELD_NAMES.length; i++) {
    if (byte & (1 << i)) {
      present.add(ERC5267_FIELD_NAMES[i])
    }
  }
  return present
}

function normChainId(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

function normAddress(value: unknown): `0x${string}` | undefined {
  if (typeof value !== 'string' || !value.startsWith('0x')) {
    return undefined
  }
  try {
    return getAddress(value)
  } catch {
    return undefined
  }
}

function domainFieldMismatch(
  field: string,
  fromMessage: unknown,
  fromContract: unknown,
): string | undefined {
  if (fromMessage === undefined || fromMessage === null || fromMessage === '') {
    return undefined
  }
  if (field === 'chainId') {
    const a = normChainId(fromMessage)
    const b = normChainId(fromContract)
    if (a !== undefined && b !== undefined && a !== b) {
      return `chainId ${a} vs contract ${b}`
    }
    return undefined
  }
  if (field === 'verifyingContract') {
    const a = normAddress(fromMessage)
    const b = normAddress(fromContract)
    if (a && b && a !== b) {
      return `verifyingContract ${a} vs contract ${b}`
    }
    return undefined
  }
  if (String(fromMessage) !== String(fromContract)) {
    return `${field} "${fromMessage}" vs contract "${fromContract}"`
  }
  return undefined
}

function assertDomainCompatible(
  messageDomain: Record<string, unknown>,
  onChain: Awaited<ReturnType<typeof getEip712Domain>>,
): void {
  const present = erc5267PresentFields(onChain.fields)
  const contractDomain = onChain.domain
  for (const field of present) {
    const mismatch = domainFieldMismatch(
      field,
      messageDomain[field],
      contractDomain[field as keyof TypedDataDomain],
    )
    if (mismatch) {
      throw new Error(`EIP-712 domain mismatch (${mismatch}). Refusing to sign.`)
    }
  }
  if (onChain.extensions.length > 0) {
    throw new Error(
      `EIP-712 domain extensions [${onChain.extensions.join(', ')}] are not supported by the paywall signer.`,
    )
  }
}

/** Build EIP-712 domain from ERC-5267 `eip712Domain()` (only fields set in `fields` bitmap). */
export function domainFromErc5267(
  onChain: Awaited<ReturnType<typeof getEip712Domain>>,
): Record<string, unknown> {
  const present = erc5267PresentFields(onChain.fields)
  const d = onChain.domain
  const domain: Record<string, unknown> = {}
  if (present.has('name')) {
    domain.name = d.name
  }
  if (present.has('version')) {
    domain.version = d.version
  }
  if (present.has('chainId') && d.chainId !== undefined) {
    domain.chainId = Number(d.chainId)
  }
  if (present.has('verifyingContract') && d.verifyingContract) {
    domain.verifyingContract = getAddress(d.verifyingContract)
  }
  if (present.has('salt') && d.salt && d.salt !== ZERO_BYTES32) {
    domain.salt = d.salt
  }
  return domain
}

function typesForSigning(
  domain: Record<string, unknown>,
  messageTypes: Record<string, unknown>,
): Record<string, unknown> {
  const { EIP712Domain: _ignored, ...rest } = messageTypes as {
    EIP712Domain?: unknown
    [key: string]: unknown
  }
  return {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...rest,
  }
}

function networkFromDomain(domain: Record<string, unknown>): string | undefined {
  const chainId = normChainId(domain.chainId)
  if (chainId === undefined) {
    return undefined
  }
  return `eip155:${chainId}`
}

function isEip712DomainNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'Eip712DomainNotFoundError'
  )
}

/** Contract has no usable ERC-5267 domain (missing fn or call reverts — e.g. Base Sepolia USDC). */
function shouldUseMessageDomain(error: unknown): boolean {
  if (isEip712DomainNotFound(error)) {
    return true
  }
  let current: unknown = error
  for (let depth = 0; depth < 6 && current !== undefined && current !== null; depth++) {
    if (typeof current === 'object' && current !== null && 'name' in current) {
      const name = (current as { name: string }).name
      if (
        name === 'ContractFunctionRevertedError' ||
        name === 'ContractFunctionExecutionError' ||
        name === 'CallExecutionError'
      ) {
        return true
      }
    }
    if (typeof current === 'object' && current !== null && 'cause' in current) {
      current = (current as { cause?: unknown }).cause
      continue
    }
    break
  }
  if (error instanceof Error && /execution reverted/i.test(error.message)) {
    return true
  }
  return false
}

function logEip712(debug: boolean | undefined, ...args: unknown[]): void {
  if (!debug) {
    return
  }
  // Use info — Chrome hides console.debug unless Verbose is enabled.
  console.info('[x402-paywall:eip712]', ...args)
}

export async function contractSupportsEip712Domain(
  verifyingContract: `0x${string}`,
  network: string,
  rpc?: RpcConfig,
): Promise<boolean> {
  const publicClient = createPublicClient({
    chain: chainForNetwork(network, rpc),
    transport: http(rpcUrlForNetwork(network, rpc)),
  })
  try {
    await getEip712Domain(publicClient, { address: verifyingContract })
    return true
  } catch (error) {
    if (shouldUseMessageDomain(error)) {
      return false
    }
    throw error
  }
}

export async function resolveSigningDomain(
  message: Eip712SignMessage,
  options: PaywallSignTypedDataOptions = {},
): Promise<{ domain: Record<string, unknown>; domainSource: Eip712DomainSource }> {
  const verifyingContract = normAddress(message.domain.verifyingContract)
  if (!verifyingContract) {
    return { domain: message.domain, domainSource: 'message' }
  }

  const network =
    options.getNetwork?.() ?? networkFromDomain(message.domain) ?? 'eip155:84532'
  const publicClient = createPublicClient({
    chain: chainForNetwork(network, options.rpc),
    transport: http(rpcUrlForNetwork(network, options.rpc)),
  })

  try {
    const onChain = await getEip712Domain(publicClient, { address: verifyingContract })
    assertDomainCompatible(message.domain, onChain)
    const domain = domainFromErc5267(onChain)
    logEip712(options.debugEip712, 'ERC-5267', verifyingContract, domain)
    return { domain, domainSource: 'erc5267' }
  } catch (error) {
    if (shouldUseMessageDomain(error)) {
      logEip712(
        options.debugEip712,
        'no usable eip712Domain() on',
        verifyingContract,
        'using payload domain',
      )
      return { domain: message.domain, domainSource: 'message' }
    }
    throw error
  }
}

export async function signTypedDataWithEip712Domain(
  signer: Pick<ClientEvmSigner, 'signTypedData'>,
  message: Eip712SignMessage,
  options: PaywallSignTypedDataOptions = {},
): Promise<`0x${string}`> {
  const { domain, domainSource } = await resolveSigningDomain(message, options)
  const network =
    options.getNetwork?.() ?? networkFromDomain(domain) ?? 'eip155:84532'
  const types = typesForSigning(domain, message.types)

  const ctx: SignTypedDataContext = {
    domain,
    types,
    primaryType: message.primaryType,
    message: message.message,
    domainSource,
    network,
  }

  await options.onBeforeSignTypedData?.(ctx)

  if (options.debugEip712) {
    console.info('[x402-paywall:eip712] eth_signTypedData_v4 payload', {
      domainSource,
      domain,
      primaryType: message.primaryType,
      message: message.message,
      serialized: serializeTypedData({
        domain,
        types,
        primaryType: message.primaryType,
        message: message.message,
      }),
    })
  }

  return signer.signTypedData({
    domain,
    types,
    primaryType: message.primaryType,
    message: message.message,
  })
}
