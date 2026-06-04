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
  createBatchSettlementScheme,
  isBatchSettlementScheme,
  primeBatchChannelFromChain,
  resolveBatchChannelStorage,
  withReadContractSigner,
  type BatchChannelStorage,
  type BatchPaywallOptions,
} from './batch.js'
import { ensurePaymentPrerequisites } from './permit2.js'
import {
  wrapFetchWithPayment,
  x402Client,
  x402HTTPClient,
  type PaymentRequirements,
} from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import type { InspectResult, PaywallPolicy, RpcConfig, UnlockResult } from './types.js'
import { privateKeyToAccount } from 'viem/accounts'
import {
  connectWalletAddress,
  createBrowserWalletSigner,
  createPrivateKeySigner,
  switchWalletToNetwork,
  type Eip1193Provider,
} from './wallet.js'

export type PaywallProviderProps = {
  children: ReactNode
  policy?: PaywallPolicy
  /** Batch-settlement channel options (registers BatchSettlementEvmScheme on eip155). */
  batch?: BatchPaywallOptions
  privateKey?: string
  rpc?: RpcConfig
  fetch?: typeof fetch
  /** Global theme, class names, labels, and brand for all paywall UI. */
  appearance?: PaywallAppearance
  /** Log wallet discovery to the console (`[x402-paywall:wallets]`). */
  debugWallets?: boolean
}

export type PaywallContextValue = {
  policy: PaywallPolicy
  walletAddress: `0x${string}` | null
  connectedWalletName: string | null
  wallets: DiscoveredWallet[]
  walletsReady: boolean
  refreshWallets: (opts?: { timeoutMs?: number }) => Promise<DiscoveredWallet[]>
  connectWallet: (walletId?: string) => Promise<`0x${string}`>
  disconnectWallet: () => void
  inspect: (url: string, init?: RequestInit) => Promise<InspectResult>
  unlock: (url: string, init?: RequestInit) => Promise<UnlockResult>
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
  rpc,
  fetch: fetchOverride,
  appearance,
  debugWallets = false,
}: PaywallProviderProps) {
  const baseFetch = fetchOverride ?? globalThis.fetch.bind(globalThis)
  const policy = policyProp
  const privateKey = privateKeyInput?.trim()
    ? privateKeyInput.startsWith('0x')
      ? (privateKeyInput as `0x${string}`)
      : (`0x${privateKeyInput}` as `0x${string}`)
    : undefined

  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null)
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null)
  const [provider, setProvider] = useState<Eip1193Provider | null>(null)
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [walletsReady, setWalletsReady] = useState(false)
  const selectedNetworkRef = useRef<string | undefined>(undefined)
  const batchStorageRef = useRef<BatchChannelStorage | undefined>(undefined)
  const batchSalt = (batchOptions.channelSalt ??
    '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`
  if (batchStorageRef.current === undefined && policyAllowsBatch(policy)) {
    batchStorageRef.current = resolveBatchChannelStorage(batchOptions, true)
  }
  const batchSchemeRef = useRef<ReturnType<typeof createBatchSettlementScheme> | null>(null)
  const batchSchemeWalletRef = useRef<string | null>(null)

  const parserClient = useMemo(() => new x402HTTPClient(new x402Client()), [])

  const refreshWallets = useCallback(
    async (opts?: { timeoutMs?: number }) => {
      if (privateKey) {
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
    [privateKey, debugWallets],
  )

  useEffect(() => {
    void refreshWallets()
  }, [refreshWallets])

  const connectWallet = useCallback(
    async (walletId?: string) => {
      if (privateKey) {
        const address = privateKeyToAccount(privateKey).address
        setWalletAddress(address)
        setConnectedWalletName('Private key')
        setProvider(null)
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
      return address
    },
    [privateKey, refreshWallets, wallets],
  )

  const disconnectWallet = useCallback(() => {
    setProvider(null)
    setWalletAddress(null)
    setConnectedWalletName(null)
  }, [])

  const buildSigner = useCallback(() => {
    if (walletAddress && provider) {
      return createBrowserWalletSigner(
        provider,
        walletAddress,
        () => selectedNetworkRef.current,
        rpc,
      )
    }
    if (privateKey) {
      return createPrivateKeySigner(privateKey)
    }
    throw new Error('Connect a wallet or provide privateKey to PaywallProvider.')
  }, [privateKey, provider, rpc, walletAddress])

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
      const signer = buildSigner()

      const batchDepositMultiplier = batchOptions.depositMultiplier ?? 5

      client.onBeforePaymentCreation(async (context) => {
        const req = context.selectedRequirements
        if (
          isBatchSettlementScheme(req.scheme) &&
          batchStorageRef.current &&
          policyAllowsBatch(policy)
        ) {
          const batchNetwork = req.network
          const batchSigner = withReadContractSigner(signer, batchNetwork, rpc)
          await primeBatchChannelFromChain(batchSigner, req, batchStorageRef.current, batchSalt)
        }
        await ensurePaymentPrerequisites(req, {
          walletAddress: walletAddress ?? undefined,
          provider: provider ?? undefined,
          privateKey,
          rpc,
          batchDepositMultiplier,
          switchNetwork: provider
            ? (network) => switchWalletToNetwork(provider, network)
            : undefined,
        })
      })

      client.register('eip155:*', new ExactEvmScheme(signer))
      if (policyAllowsBatch(policy) && batchStorageRef.current) {
        const batchNetwork =
          selectedNetworkRef.current ??
          policy.preferredNetworks?.split(',')[0]?.trim() ??
          'eip155:84532'
        const batchSigner = withReadContractSigner(signer, batchNetwork, rpc)
        const walletKey = walletAddress ?? privateKey ?? ''
        if (batchSchemeRef.current === null || batchSchemeWalletRef.current !== walletKey) {
          batchSchemeRef.current = createBatchSettlementScheme(batchSigner, {
            ...batchOptions,
            storage: batchOptions.storage ?? batchStorageRef.current,
            persistChannels: true,
          })
          batchSchemeWalletRef.current = walletKey
        }
        client.register('eip155:*', batchSchemeRef.current)
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
      buildSigner,
      parserClient,
      policy,
      privateKey,
      provider,
      rpc,
      walletAddress,
      selectedNetworkRef,
      batchOptions,
    ],
  )

  const value = useMemo(
    () => ({
      policy,
      walletAddress,
      connectedWalletName,
      wallets,
      walletsReady,
      refreshWallets,
      connectWallet,
      disconnectWallet,
      inspect,
      unlock,
    }),
    [
      policy,
      walletAddress,
      connectedWalletName,
      wallets,
      walletsReady,
      refreshWallets,
      connectWallet,
      disconnectWallet,
      inspect,
      unlock,
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
