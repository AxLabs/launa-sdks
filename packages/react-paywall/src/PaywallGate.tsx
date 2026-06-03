import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { formatRequirementPrice } from './formatPrice.js'
import { usePaywall } from './PaywallContext.js'
import type { UnlockResult } from './types.js'
import { PaywallAgentDiscovery } from './PaywallAgentDiscovery.js'
import type { InspectResult } from './types.js'
import type { PaywallAppearance } from './appearance.js'
import { PaywallLockedOverlay, type PaywallLockedOverlayState } from './PaywallLockedOverlay.js'
import { usePaywallAppearance } from './appearanceContext.js'

export type PaywallGateProps = {
  resourceUrl: string
  requestInit?: RequestInit
  priceLabel?: string
  title?: string
  description?: string
  agentInstructions?: string
  agentDiscovery?: boolean
  /** Theme, class names, labels, and brand (merged with PaywallProvider `appearance`). */
  appearance?: Partial<PaywallAppearance>
  className?: string
  teaserClassName?: string
  overlayClassName?: string
  cardClassName?: string
  unlockedClassName?: string
  onUnlocked?: (result: UnlockResult, parsed: unknown) => void
  children?: ReactNode
  inspectOnMount?: boolean
  /** Fully custom locked-state UI; receives wallet/pay handlers and inspect state. */
  renderLockedOverlay?: (state: PaywallLockedOverlayState) => ReactNode
}

export function PaywallGate({
  resourceUrl,
  requestInit,
  priceLabel,
  title = 'Continue reading',
  description = 'Pay once to unlock this article for this session.',
  agentInstructions,
  agentDiscovery = true,
  appearance,
  className,
  teaserClassName,
  overlayClassName,
  cardClassName,
  unlockedClassName,
  onUnlocked,
  children,
  inspectOnMount = true,
  renderLockedOverlay,
}: PaywallGateProps) {
  const { slot } = usePaywallAppearance(appearance)
  const {
    inspect,
    unlock,
    walletAddress,
    connectedWalletName,
    wallets,
    refreshWallets,
    connectWallet,
  } = usePaywall()
  const [unlocked, setUnlocked] = useState(false)
  const [parsedContent, setParsedContent] = useState<unknown>(null)
  const [displayPrice, setDisplayPrice] = useState(priceLabel ?? '')
  const [loading, setLoading] = useState<'inspect' | 'pay' | 'connect' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showWalletPicker, setShowWalletPicker] = useState(false)
  const [pickerWallets, setPickerWallets] = useState(wallets)
  const [inspectSnapshot, setInspectSnapshot] = useState<
    Pick<InspectResult, 'paymentRequired' | 'selection' | 'status'> | undefined
  >()

  const runInspect = useCallback(async () => {
    setLoading('inspect')
    setError(null)
    try {
      const result = await inspect(resourceUrl, requestInit)
      setInspectSnapshot({
        status: result.status,
        paymentRequired: result.paymentRequired,
        selection: result.selection,
      })
      if (result.selection?.selected && !priceLabel) {
        setDisplayPrice(formatRequirementPrice(result.selection.selected))
      }
      if (result.status === 200) {
        let parsed: unknown = result.bodyText
        try {
          parsed = JSON.parse(result.bodyText)
        } catch {
          /* plain text */
        }
        setParsedContent(parsed)
        setUnlocked(true)
        onUnlocked?.(
          {
            status: result.status,
            bodyText: result.bodyText,
            headers: [],
          },
          parsed,
        )
      }
    } catch (e) {
      setError(formatFetchError(e, resourceUrl))
    } finally {
      setLoading(null)
    }
  }, [inspect, onUnlocked, priceLabel, requestInit, resourceUrl])

  useEffect(() => {
    if (inspectOnMount) {
      void runInspect()
    }
  }, [inspectOnMount, runInspect])

  const openWalletPicker = async () => {
    const list = await refreshWallets({ timeoutMs: 1500 })
    if (list.length === 0) {
      throw new Error('No browser wallet detected. Install an EIP-1193 wallet extension.')
    }
    setPickerWallets(list)
    setShowWalletPicker(true)
  }

  const handleConnectClick = async () => {
    if (walletAddress) {
      return
    }
    setLoading('connect')
    setError(null)
    try {
      await openWalletPicker()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  const handleWalletSelect = async (walletId: string) => {
    setLoading('connect')
    setError(null)
    try {
      await connectWallet(walletId)
      setShowWalletPicker(false)
    } catch (e) {
      setError(formatFetchError(e, resourceUrl))
    } finally {
      setLoading(null)
    }
  }

  const handlePay = async () => {
    setLoading('pay')
    setError(null)
    try {
      if (!walletAddress) {
        await openWalletPicker()
        return
      }
      const result = await unlock(resourceUrl, requestInit)
      if (result.status >= 400) {
        throw new Error(`Payment failed: HTTP ${result.status}`)
      }
      let parsed: unknown = result.bodyText
      try {
        parsed = JSON.parse(result.bodyText)
      } catch {
        /* plain */
      }
      setParsedContent(parsed)
      setUnlocked(true)
      onUnlocked?.(result, parsed)
    } catch (e) {
      setError(formatFetchError(e, resourceUrl))
    } finally {
      setLoading(null)
    }
  }

  if (unlocked) {
    return (
      <div className={[className, unlockedClassName].filter(Boolean).join(' ') || undefined}>
        {parsedContent !== null ? (
          <ArticleBody data={parsedContent} appearance={appearance} />
        ) : (
          children
        )}
      </div>
    )
  }

  const busy = loading !== null
  const overlayState: PaywallLockedOverlayState = {
    title,
    description,
    displayPrice,
    error,
    busy,
    loading,
    walletAddress,
    connectedWalletName,
    showWalletPicker,
    pickerWallets,
    onConnect: () => void handleConnectClick(),
    onPay: () => void handlePay(),
    onWalletSelect: (id) => void handleWalletSelect(id),
    onPickerCancel: () => setShowWalletPicker(false),
  }

  return (
    <div className={slot('gate', className)}>
      <div className={slot('teaser', teaserClassName)}>{children}</div>
      <PaywallLockedOverlay
        state={overlayState}
        overlayClassName={overlayClassName}
        cardClassName={cardClassName}
        appearance={appearance}
        renderOverlay={renderLockedOverlay}
      />
      <PaywallAgentDiscovery
        resourceUrl={resourceUrl}
        requestInit={requestInit}
        instructions={agentInstructions}
        inspect={inspectSnapshot}
        enabled={agentDiscovery}
        appearance={appearance}
      />
    </div>
  )
}

function formatFetchError(error: unknown, resourceUrl: string): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg !== 'Failed to fetch') {
    return msg
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const target = new URL(resourceUrl, origin || 'http://localhost')
    if (origin && target.origin !== origin) {
      return `${msg}: cross-origin request blocked (CORS). Proxy the gateway through your dev server or add Access-Control-Allow-Origin on the seller.`
    }
  } catch {
    /* ignore */
  }
  return msg
}

function ArticleBody({
  data,
  appearance,
}: {
  data: unknown
  appearance?: Partial<PaywallAppearance>
}) {
  const { slot } = usePaywallAppearance(appearance)
  if (typeof data === 'object' && data !== null && 'body' in data) {
    const article = data as { title?: string; body?: string }
    return (
      <article className={slot('article')}>
        {article.title ? <h1>{article.title}</h1> : null}
        {article.body ? <p>{article.body}</p> : null}
      </article>
    )
  }
  return (
    <pre className={slot('raw')}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
  )
}
