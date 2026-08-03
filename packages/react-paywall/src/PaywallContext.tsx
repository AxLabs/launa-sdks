import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PaywallAppearance } from './appearance.js'
import { PaywallAppearanceProvider } from './appearanceContext.js'
import {
  discoverWallets,
  WalletSelectionRequiredError,
  type DiscoveredWallet,
} from './discoverWallets.js'
import { createSelectionResult } from './policy.js'
import {
  batchPayLabelForKind,
  createBatchSettlementScheme,
  DEFAULT_BATCH_WITHDRAW_DELAY_SECS,
  enrichBatchPaymentRequirements,
  isBatchSettlementScheme,
  prepareBatchChannelForPayment,
  resolveBatchChannelStorage,
  seedBatchChannelFromRequirements,
  getBatchChannelStatus,
  resolveBatchPaymentKind,
  withReadContractSigner,
  type BatchChannelStorage,
  type BatchChannelStatus,
  type BatchPaywallOptions,
} from './batch.js'
import { defaultPaywallLabels, type PaywallLabels } from './appearance.js'
import { ensurePaymentPrerequisites } from './permit2.js'
import {
  DEFAULT_BATCH_PAYWALL_NETWORK,
  isHederaNetwork,
  prefersHederaNetwork,
  resolveFallbackNetwork,
} from './networks.js'
import {
  wrapFetchWithPayment,
  x402Client,
  x402HTTPClient,
  type PaymentRequirements,
} from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { ExactHederaScheme } from '@x402/hedera/exact/client'
import type { ClientHederaSigner } from '@x402/hedera'
import type { InspectResult, PaywallPolicy, RpcConfig, UnlockResult } from './types.js'
import { privateKeyToAccount } from 'viem/accounts'
import {
  connectWalletAddress,
  createBrowserWalletSigner,
  createPrivateKeySigner,
  switchWalletToNetwork,
  type Eip1193Provider,
  type PaywallSignTypedDataOptions,
} from './wallet.js'
import {
  connectHederaWalletConnect,
  createPrivateKeyHederaSigner,
  type HederaWalletConnectConfig,
} from './hederaWallet.js'

export type PaywallProviderProps = {
  children: ReactNode
  policy?: PaywallPolicy
  /** Batch-settlement channel options (registers BatchSettlementEvmScheme on eip155; ignored for hedera). */
  batch?: BatchPaywallOptions
  /** EVM private key (agents / local dev). */
  privateKey?: string
  /** Hedera account id for private-key signing (agents / local dev). */
  hederaAccountId?: string
  /** Hedera private key paired with hederaAccountId. */
  hederaPrivateKey?: string
  /** Optional WalletConnect project config for human Hedera wallets. */
  hederaWalletConnect?: HederaWalletConnectConfig
  rpc?: RpcConfig
  fetch?: typeof fetch
  /** Global theme, class names, labels, and brand for all paywall UI. */
  appearance?: PaywallAppearance
  /** Log wallet discovery to the console (`[x402-paywall:wallets]`). */
  debugWallets?: boolean
  /**
   * EIP-712 signing: when verifyingContract implements ERC-5267, read `eip712Domain()`
   * and pass that domain + matching EIP712Domain types to `eth_signTypedData_v4`.
   */
  signTypedData?: PaywallSignTypedDataOptions
}

export type PaywallContextValue = {
  policy: PaywallPolicy
  /** Connected EVM address or Hedera account id. */
  walletAddress: string | null
  connectedWalletName: string | null
  /** True when the active payment path is Hedera. */
  hederaMode: boolean
  wallets: DiscoveredWallet[]
  walletsReady: boolean
  refreshWallets: (opts?: { timeoutMs?: number }) => Promise<DiscoveredWallet[]>
  connectWallet: (walletId?: string) => Promise<string>
  /** Connect Hedera via WalletConnect (when configured) or private-key props. */
  connectHederaWallet: () => Promise<string>
  disconnectWallet: () => void
  inspect: (url: string, init?: RequestInit) => Promise<InspectResult>
  unlock: (url: string, init?: RequestInit) => Promise<UnlockResult>
  /** Batch: label for pay button from on-chain escrow (deposit / top-up / voucher). */
  resolveBatchPayButtonLabel: (
    requirements: PaymentRequirements,
    labels?: Partial<PaywallLabels>,
  ) => Promise<string>
  /** Batch: on-chain escrow and cumulative voucher state for the selected requirements. */
  getBatchChannelStatus: (requirements: PaymentRequirements) => Promise<BatchChannelStatus | null>
}

const PaywallContext = createContext<PaywallContextValue | null>(null)

function policyAllowsBatch(policy: PaywallPolicy): boolean {
  const raw = policy.allowedSchemes ?? 'exact,batch-settlement'
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes('batch-settlement')
}

export function PaywallProvider({
  children,
  policy: policyProp = {},
  batch: batchOptions = {},
  privateKey: privateKeyInput,
  hederaAccountId: hederaAccountIdInput,
  hederaPrivateKey: hederaPrivateKeyInput,
  hederaWalletConnect,
  rpc,
  fetch: fetchOverride,
  appearance,
  debugWallets = false,
  signTypedData: signTypedDataOptions = {},
}: PaywallProviderProps) {
  const baseFetch = fetchOverride ?? globalThis.fetch.bind(globalThis)
  const policy = policyProp
  const privateKey = privateKeyInput?.trim()
    ? privateKeyInput.startsWith('0x')
      ? (privateKeyInput as `0x${string}`)
      : (`0x${privateKeyInput}` as `0x${string}`)
    : undefined
  const hederaAccountId = hederaAccountIdInput?.trim() || undefined
  const hederaPrivateKey = hederaPrivateKeyInput?.trim() || undefined
  const hederaMode = prefersHederaNetwork(policy.preferredNetworks)

  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null)
  const [provider, setProvider] = useState<Eip1193Provider | null>(null)
  const [hederaSigner, setHederaSigner] = useState<ClientHederaSigner | null>(null)
  const hederaDisconnectRef = useRef<(() => Promise<void>) | null>(null)
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [walletsReady, setWalletsReady] = useState(false)
  const selectedNetworkRef = useRef<string | undefined>(undefined)
  const batchStorageRef = useRef<BatchChannelStorage | undefined>(undefined)
  const batchSalt = (batchOptions.channelSalt ??
    '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`
  if (batchStorageRef.current === undefined && policyAllowsBatch(policy) && !hederaMode) {
    batchStorageRef.current = resolveBatchChannelStorage(batchOptions, true)
  }
  const batchWithdrawDelaySecs =
    batchOptions.withdrawDelaySecs ?? DEFAULT_BATCH_WITHDRAW_DELAY_SECS

  const parserClient = useMemo(() => new x402HTTPClient(new x402Client()), [])

  const refreshWallets = useCallback(
    async (opts?: { timeoutMs?: number }) => {
      if (privateKey || hederaMode) {
        setWallets([])
        setWalletsReady(true)
        return []
      }
      const found = await discoverWallets({ ...opts, debug: debugWallets })
      if (debugWallets) {
        console.log('[x402-paywall:wallets] refreshWallets', {
          count: found.length,
          wallets: found.map((w) => ({ name: w.name, id: w.id, rdns: w.rdns })),
        })
      }
      setWallets(found)
      setWalletsReady(true)
      return found
    },
    [privateKey, hederaMode, debugWallets],
  )

  useEffect(() => {
    void refreshWallets()
  }, [refreshWallets])

  const connectHederaWallet = useCallback(async () => {
    if (hederaAccountId && hederaPrivateKey) {
      const network = resolveFallbackNetwork(policy.preferredNetworks)
      const signer = createPrivateKeyHederaSigner(hederaAccountId, hederaPrivateKey, network)
      setHederaSigner(signer)
      setWalletAddress(signer.accountId)
      setConnectedWalletName('Hedera private key')
      setProvider(null)
      return signer.accountId
    }

    if (hederaWalletConnect?.projectId) {
      const network =
        hederaWalletConnect.network ?? resolveFallbackNetwork(policy.preferredNetworks)
      const connected = await connectHederaWalletConnect({
        ...hederaWalletConnect,
        network,
      })
      hederaDisconnectRef.current = connected.disconnect
      setHederaSigner(connected.signer)
      setWalletAddress(connected.accountId)
      setConnectedWalletName('Hedera WalletConnect')
      setProvider(null)
      return connected.accountId
    }

    throw new Error(
      'Connect a Hedera wallet: pass hederaWalletConnect.projectId, or hederaAccountId + hederaPrivateKey.',
    )
  }, [hederaAccountId, hederaPrivateKey, hederaWalletConnect, policy.preferredNetworks])

  const connectWallet = useCallback(
    async (walletId?: string) => {
      if (hederaMode) {
        return connectHederaWallet()
      }

      if (privateKey) {
        const address = privateKeyToAccount(privateKey).address
        setWalletAddress(address)
        setConnectedWalletName('Private key')
        setProvider(null)
        setHederaSigner(null)
        return address
      }

      const list = await refreshWallets()
      if (list.length === 0) {
        throw new Error('No browser wallet detected. Install an EIP-1193 wallet extension.')
      }

      let chosen: DiscoveredWallet | undefined
      if (walletId) {
        chosen = list.find((w) => w.id === walletId)
        if (!chosen) {
          throw new Error(`Unknown wallet id: ${walletId}`)
        }
      } else if (list.length === 1) {
        chosen = list[0]
      } else {
        throw new WalletSelectionRequiredError(list)
      }

      const address = await connectWalletAddress(chosen.provider)
      setProvider(chosen.provider)
      setWalletAddress(address)
      setConnectedWalletName(chosen.name)
      setHederaSigner(null)
      return address
    },
    [privateKey, refreshWallets, hederaMode, connectHederaWallet],
  )

  const disconnectWallet = useCallback(() => {
    void hederaDisconnectRef.current?.()
    hederaDisconnectRef.current = null
    setProvider(null)
    setHederaSigner(null)
    setWalletAddress(null)
    setConnectedWalletName(null)
  }, [])

  const signerEip712Options = useMemo(
    (): PaywallSignTypedDataOptions => ({
      ...signTypedDataOptions,
      rpc: signTypedDataOptions.rpc ?? rpc,
      getNetwork: signTypedDataOptions.getNetwork ?? (() => selectedNetworkRef.current),
    }),
    [rpc, signTypedDataOptions],
  )

  const buildEvmSigner = useCallback(() => {
    if (walletAddress && provider && walletAddress.startsWith('0x')) {
      return createBrowserWalletSigner(
        provider,
        walletAddress as `0x${string}`,
        () => selectedNetworkRef.current,
        rpc,
        signerEip712Options,
      )
    }
    if (privateKey) {
      return createPrivateKeySigner(privateKey, signerEip712Options)
    }
    throw new Error('Connect a wallet or provide privateKey to PaywallProvider.')
  }, [privateKey, provider, rpc, signerEip712Options, walletAddress])

  const buildHederaSignerForPayment = useCallback((): ClientHederaSigner => {
    if (hederaSigner) {
      return hederaSigner
    }
    if (hederaAccountId && hederaPrivateKey) {
      const network =
        selectedNetworkRef.current && isHederaNetwork(selectedNetworkRef.current)
          ? selectedNetworkRef.current
          : resolveFallbackNetwork(policy.preferredNetworks)
      return createPrivateKeyHederaSigner(hederaAccountId, hederaPrivateKey, network)
    }
    throw new Error(
      'Connect a Hedera wallet or provide hederaAccountId + hederaPrivateKey to PaywallProvider.',
    )
  }, [hederaAccountId, hederaPrivateKey, hederaSigner, policy.preferredNetworks])

  const inspect = useCallback(
    async (url: string, init?: RequestInit): Promise<InspectResult> => {
      const response = await baseFetch(url, init)
      const bodyText = await response.text()
      let parsedBody: unknown
      try {
        parsedBody = JSON.parse(bodyText)
      } catch {
        parsedBody = undefined
      }
      let paymentRequired
      let selection
      if (response.status === 402) {
        paymentRequired = parserClient.getPaymentRequiredResponse(
          (name) => response.headers.get(name),
          parsedBody,
        )
        selection = createSelectionResult(paymentRequired.accepts, policy)
      }
      return { status: response.status, paymentRequired, selection, bodyText }
    },
    [baseFetch, parserClient, policy],
  )

  const getBatchChannelStatusFn = useCallback(
    async (requirements: PaymentRequirements): Promise<BatchChannelStatus | null> => {
      if (
        isHederaNetwork(requirements.network) ||
        !isBatchSettlementScheme(requirements.scheme) ||
        !batchStorageRef.current
      ) {
        return null
      }
      try {
        const signer = withReadContractSigner(buildEvmSigner(), requirements.network, rpc)
        return await getBatchChannelStatus(
          signer,
          requirements,
          batchStorageRef.current,
          batchSalt,
          batchWithdrawDelaySecs,
          batchOptions.debugChannel,
        )
      } catch {
        return null
      }
    },
    [
      batchOptions.debugChannel,
      batchSalt,
      batchWithdrawDelaySecs,
      buildEvmSigner,
      rpc,
    ],
  )

  const resolveBatchPayButtonLabel = useCallback(
    async (requirements: PaymentRequirements, labels?: Partial<PaywallLabels>) => {
      const merged = { ...defaultPaywallLabels, ...labels }
      if (
        isHederaNetwork(requirements.network) ||
        !isBatchSettlementScheme(requirements.scheme) ||
        !batchStorageRef.current
      ) {
        return merged.payToRead
      }
      try {
        const signer = buildEvmSigner()
        const batchSigner = withReadContractSigner(signer, requirements.network, rpc)
        const kind = await resolveBatchPaymentKind(
          batchSigner,
          requirements,
          batchStorageRef.current,
          batchSalt,
          batchWithdrawDelaySecs,
          batchOptions.debugChannel,
        )
        return batchPayLabelForKind(kind, merged)
      } catch {
        return merged.payToReadDeposit ?? merged.payToRead
      }
    },
    [
      batchOptions.debugChannel,
      batchSalt,
      batchWithdrawDelaySecs,
      buildEvmSigner,
      rpc,
    ],
  )

  const unlock = useCallback(
    async (url: string, init?: RequestInit): Promise<UnlockResult> => {
      const selector = (_version: number, accepts: PaymentRequirements[]) => {
        const selection = createSelectionResult(accepts, policy)
        if (!selection.selected) {
          const reason =
            selection.rejected.length > 0
              ? selection.rejected.map((e) => `[${e.index}] ${e.reason}`).join(' | ')
              : 'No acceptable option.'
          throw new Error(`No acceptable payment option. ${reason}`)
        }
        selectedNetworkRef.current = selection.selected.network
        return selection.selected
      }

      const client = new x402Client(selector)
      const selectedHint = resolveFallbackNetwork(policy.preferredNetworks)
      const useHedera =
        (selectedNetworkRef.current && isHederaNetwork(selectedNetworkRef.current)) ||
        prefersHederaNetwork(policy.preferredNetworks)

      if (useHedera || isHederaNetwork(selectedHint)) {
        const hSigner = buildHederaSignerForPayment()
        client.register('hedera:*', new ExactHederaScheme(hSigner))
      }

      // Always register EVM when an EVM signer is available so mixed accepts work.
      let evmSigner: ReturnType<typeof buildEvmSigner> | null = null
      try {
        if (privateKey || (walletAddress && provider)) {
          evmSigner = buildEvmSigner()
          client.register('eip155:*', new ExactEvmScheme(evmSigner))
        }
      } catch {
        evmSigner = null
      }

      const batchDepositMultiplier = batchOptions.depositMultiplier ?? 5

      client.onBeforePaymentCreation(async (context) => {
        const req = context.selectedRequirements
        selectedNetworkRef.current = req.network

        if (isHederaNetwork(req.network)) {
          // Exact Hedera only — no permit2 / batch-settlement.
          return
        }

        if (isBatchSettlementScheme(req.scheme) && policyAllowsBatch(policy)) {
          enrichBatchPaymentRequirements(req, batchWithdrawDelaySecs)
          if (batchStorageRef.current && evmSigner) {
            seedBatchChannelFromRequirements(batchStorageRef.current, req)
            const batchSigner = withReadContractSigner(evmSigner, req.network, rpc)
            await prepareBatchChannelForPayment(
              batchSigner,
              req,
              batchStorageRef.current,
              batchSalt,
              batchWithdrawDelaySecs,
              batchOptions.debugChannel,
            )
          }
        }
        await ensurePaymentPrerequisites(req, {
          walletAddress:
            walletAddress && walletAddress.startsWith('0x')
              ? (walletAddress as `0x${string}`)
              : undefined,
          provider: provider ?? undefined,
          privateKey,
          rpc,
          batchDepositMultiplier,
          switchNetwork: provider
            ? (network) => switchWalletToNetwork(provider, network)
            : undefined,
        })
      })

      if (
        evmSigner &&
        policyAllowsBatch(policy) &&
        batchStorageRef.current &&
        !prefersHederaNetwork(policy.preferredNetworks)
      ) {
        const batchNetwork =
          selectedNetworkRef.current && !isHederaNetwork(selectedNetworkRef.current)
            ? selectedNetworkRef.current
            : (policy.preferredNetworks?.split(',').map((n) => n.trim()).find((n) => !isHederaNetwork(n)) ??
              DEFAULT_BATCH_PAYWALL_NETWORK)
        if (!isHederaNetwork(batchNetwork)) {
          const batchSigner = withReadContractSigner(evmSigner, batchNetwork, rpc)
          client.register(
            'eip155:*',
            createBatchSettlementScheme(batchSigner, {
              ...batchOptions,
              storage: batchOptions.storage ?? batchStorageRef.current,
              persistChannels: true,
            }),
          )
        }
      }

      const paymentHttpClient = new x402HTTPClient(client)
      const paymentFetch = wrapFetchWithPayment(baseFetch, paymentHttpClient)

      const response = await paymentFetch(url, init)
      const bodyText = await response.text()
      let selection
      let paymentRequired
      if (response.status === 402) {
        let parsedBody: unknown
        try {
          parsedBody = JSON.parse(bodyText)
        } catch {
          parsedBody = undefined
        }
        paymentRequired = parserClient.getPaymentRequiredResponse(
          (name) => response.headers.get(name),
          parsedBody,
        )
        selection = createSelectionResult(paymentRequired.accepts, policy)
        if (batchStorageRef.current) {
          for (const accept of paymentRequired.accepts) {
            if (isBatchSettlementScheme(accept.scheme) && !isHederaNetwork(accept.network)) {
              seedBatchChannelFromRequirements(batchStorageRef.current, accept)
            }
          }
        }
      }

      return {
        status: response.status,
        bodyText,
        headers: Array.from(response.headers.entries()),
        paymentRequired,
        selection,
      }
    },
    [
      baseFetch,
      buildEvmSigner,
      buildHederaSignerForPayment,
      parserClient,
      policy,
      privateKey,
      provider,
      rpc,
      walletAddress,
      batchOptions,
      batchSalt,
      batchWithdrawDelaySecs,
    ],
  )

  const value = useMemo(
    () => ({
      policy,
      walletAddress,
      connectedWalletName,
      hederaMode,
      wallets,
      walletsReady,
      refreshWallets,
      connectWallet,
      connectHederaWallet,
      disconnectWallet,
      inspect,
      unlock,
      getBatchChannelStatus: getBatchChannelStatusFn,
      resolveBatchPayButtonLabel,
    }),
    [
      policy,
      walletAddress,
      connectedWalletName,
      hederaMode,
      wallets,
      walletsReady,
      refreshWallets,
      connectWallet,
      connectHederaWallet,
      disconnectWallet,
      inspect,
      unlock,
      getBatchChannelStatusFn,
      resolveBatchPayButtonLabel,
    ],
  )

  return (
    <PaywallAppearanceProvider appearance={appearance}>
      <PaywallContext.Provider value={value}>{children}</PaywallContext.Provider>
    </PaywallAppearanceProvider>
  )
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext)
  if (!ctx) {
    throw new Error('usePaywall must be used within PaywallProvider')
  }
  return {
    ...ctx,
    wallets: ctx.wallets ?? [],
  }
}
