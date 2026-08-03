import type { PaymentRequirements } from '@x402/fetch'
import type { ClientHederaSigner } from '@x402/hedera'
import {
  AccountId,
  Hbar,
  TokenId,
  TransactionId,
  TransferTransaction,
  createHederaClient,
  createClientHederaSigner,
  PrivateKey,
} from '@x402/hedera'
import { isHederaNetwork, NETWORK_HEDERA_TESTNET } from './networks.js'

export type HederaWalletConnectConfig = {
  projectId: string
  metadata?: {
    name?: string
    description?: string
    url?: string
    icons?: string[]
  }
  /** CAIP-2 network for the connector; defaults to hedera:testnet. */
  network?: string
}

/** Minimal WalletConnect DApp signer surface used by the adapter. */
export type HederaDAppTransactionSigner = {
  getAccountId(): { toString(): string }
  getLedgerId?(): { equals?(other: unknown): boolean; toString(): string }
  signTransaction<T>(transaction: T): Promise<T>
}

type HederaClientLike = {
  setMaxNodesPerTransaction?: (n: number) => unknown
  close: () => void
}

/**
 * Stable consensus node present in both JS and Go SDK mainnet/testnet maps.
 * Object.values(client.network)[0] is unsafe: JS may pick a stale id (e.g. 0.0.31)
 * that the facilitator's Go ClientForMainnet() cannot resolve.
 */
const WALLETCONNECT_NODE_ACCOUNT_ID = '0.0.3'

/**
 * WalletConnect `hedera_signTransaction` signs a single TransactionBody. DAppSigner then
 * attaches that signature to every node variant in the frozen TransactionList. Go
 * PublicKey.VerifyTransaction requires the sig to verify against *every* variant — so a
 * multi-node freeze makes HashPack approvals fail facilitator verify. Keep one node.
 */
function freezeTransferForWalletConnect(
  tx: TransferTransaction,
  client: HederaClientLike,
  feePayer: string,
): void {
  client.setMaxNodesPerTransaction?.(1)
  tx.setNodeAccountIds([AccountId.fromString(WALLETCONNECT_NODE_ACCOUNT_ID)])
  tx.setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)))
  tx.freezeWith(client as Parameters<TransferTransaction['freezeWith']>[0])
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export function parseHederaPrivateKey(raw: string): PrivateKey {
  const trimmed = raw.trim()
  const hex = trimmed.replace(/^0x/i, '')
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return PrivateKey.fromStringECDSA(hex)
  }
  return PrivateKey.fromString(trimmed)
}

export function createPrivateKeyHederaSigner(
  accountId: string,
  privateKey: string,
  network: string = NETWORK_HEDERA_TESTNET,
  nodeUrl?: string,
): ClientHederaSigner {
  return createClientHederaSigner(accountId, parseHederaPrivateKey(privateKey), {
    network,
    nodeUrl,
  })
}

/**
 * Builds a ClientHederaSigner that signs TransferTransactions via a
 * WalletConnect / DAppConnector signer (`signTransaction`).
 */
export function createWalletConnectHederaSigner(
  dappSigner: HederaDAppTransactionSigner,
  network: string = NETWORK_HEDERA_TESTNET,
  nodeUrl?: string,
): ClientHederaSigner {
  const accountId = dappSigner.getAccountId().toString()
  const parsedAccountId = AccountId.fromString(accountId)

  return {
    accountId,
    async createPartiallySignedTransferTransaction(requirements: PaymentRequirements) {
      if (!isHederaNetwork(requirements.network)) {
        throw new Error(`Expected hedera network, got "${requirements.network}"`)
      }
      const feePayer = requirements.extra?.feePayer
      if (typeof feePayer !== 'string') {
        throw new Error('feePayer is required in paymentRequirements.extra')
      }
      const amount = BigInt(requirements.amount)
      if (amount <= 0n) {
        throw new Error('amount must be greater than zero')
      }
      const payTo = AccountId.fromString(requirements.payTo)
      const tx = new TransferTransaction()
      if (requirements.asset === '0.0.0') {
        tx.addHbarTransfer(parsedAccountId, Hbar.fromTinybars((-amount).toString()))
        tx.addHbarTransfer(payTo, Hbar.fromTinybars(amount.toString()))
      } else {
        const tokenId = TokenId.fromString(requirements.asset)
        tx.addTokenTransfer(tokenId, parsedAccountId, -amount)
        tx.addTokenTransfer(tokenId, payTo, amount)
      }
      // Do not freezeWithSigner: DAppSigner.populateTransaction overwrites feePayer TransactionId.
      const client = createHederaClient(network, nodeUrl) as HederaClientLike
      try {
        freezeTransferForWalletConnect(tx, client, feePayer)
        const signed = await dappSigner.signTransaction(tx)
        const bytes =
          typeof (signed as { toBytes?: () => Uint8Array }).toBytes === 'function'
            ? (signed as { toBytes: () => Uint8Array }).toBytes()
            : (() => {
                throw new Error('WalletConnect signer returned a transaction without toBytes()')
              })()
        return toBase64(bytes)
      } finally {
        client.close()
      }
    },
  }
}

type DAppConnectorLike = {
  init: (opts?: { logger?: string }) => Promise<void>
  openModal: (pairingTopic?: string, throwErrorOnReject?: boolean) => Promise<unknown>
  signers: HederaDAppTransactionSigner[]
  disconnectAll?: () => Promise<void>
}

type LedgerIdEnum = { MAINNET: unknown; TESTNET: unknown }

function signerMatchesLedger(signer: HederaDAppTransactionSigner, ledgerId: unknown): boolean {
  const lid = signer.getLedgerId?.()
  if (!lid) return false
  if (typeof lid.equals === 'function') return Boolean(lid.equals(ledgerId))
  return String(lid).toLowerCase() === String(ledgerId).toLowerCase()
}

/** Prefer the most recently connected signer on the requested ledger. */
function pickSignerForLedger(
  signers: HederaDAppTransactionSigner[],
  ledgerId: unknown,
): HederaDAppTransactionSigner | undefined {
  const matching = signers.filter((s) => signerMatchesLedger(s, ledgerId))
  return matching[matching.length - 1]
}

/**
 * Connect via @hashgraph/hedera-wallet-connect DAppConnector and return a
 * ClientHederaSigner. Requires the optional peer package to be installed.
 *
 * DAppConnector.init() restores *all* prior WC sessions into `signers` (any
 * ledger). Always selecting signers[0] therefore sticks to an old testnet
 * account after the user approves mainnet — pick by LedgerId instead.
 */
export async function connectHederaWalletConnect(
  config: HederaWalletConnectConfig,
): Promise<{ signer: ClientHederaSigner; accountId: string; disconnect: () => Promise<void> }> {
  let DAppConnector: new (
    metadata: unknown,
    network: unknown,
    projectId: string,
  ) => DAppConnectorLike
  let LedgerId: LedgerIdEnum
  try {
    ;({ DAppConnector } = (await import('@hashgraph/hedera-wallet-connect')) as {
      DAppConnector: typeof DAppConnector
    })
  } catch {
    throw new Error(
      'Hedera WalletConnect requires optional peer @hashgraph/hedera-wallet-connect (and its peers).',
    )
  }
  try {
    ;({ LedgerId } = (await import('@hiero-ledger/sdk')) as { LedgerId: LedgerIdEnum })
  } catch {
    throw new Error(
      'Hedera WalletConnect requires @hiero-ledger/sdk (installed with @x402/hedera).',
    )
  }

  const network = (config.network ?? NETWORK_HEDERA_TESTNET).trim().toLowerCase()
  const ledgerId = network.includes('mainnet') ? LedgerId.MAINNET : LedgerId.TESTNET
  const metadata = {
    name: config.metadata?.name ?? 'x402 Paywall',
    description: config.metadata?.description ?? 'Pay with Hedera via x402',
    url:
      config.metadata?.url ??
      (typeof window !== 'undefined' ? window.location.origin : 'https://localhost'),
    icons: config.metadata?.icons ?? [],
  }

  const connector = new DAppConnector(metadata, ledgerId, config.projectId)
  await connector.init()

  let dappSigner = pickSignerForLedger(connector.signers, ledgerId)
  if (!dappSigner) {
    // Drop stale sessions on the wrong ledger so HashPack cannot keep
    // resurrecting a previous testnet/mainnet pairing as signers[0].
    if (connector.signers.length > 0) {
      await connector.disconnectAll?.()
    }
    await connector.openModal(undefined, true)
    dappSigner = pickSignerForLedger(connector.signers, ledgerId)
  }

  if (!dappSigner) {
    const seen = connector.signers
      .map((s) => {
        const account = s.getAccountId().toString()
        const chain = s.getLedgerId?.()?.toString() ?? 'unknown'
        return `${account} (${chain})`
      })
      .join(', ')
    throw new Error(
      seen
        ? `Hedera WalletConnect returned no ${network} account (got: ${seen}). In HashPack, select a ${network} wallet and reconnect.`
        : `Hedera WalletConnect session returned no signer for ${network}`,
    )
  }

  const signer = createWalletConnectHederaSigner(dappSigner, network)
  return {
    signer,
    accountId: signer.accountId,
    disconnect: async () => {
      await connector.disconnectAll?.()
    },
  }
}
