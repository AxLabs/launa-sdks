import type { ReactNode } from 'react'
import type { DiscoveredWallet } from './discoverWallets.js'
import { usePaywallAppearance } from './appearanceContext.js'
import { WalletPicker } from './WalletPicker.js'
import type { PaywallAppearance } from './appearance.js'

export type PaywallLockedOverlayState = {
  title: string
  description: string
  displayPrice: string
  error: string | null
  busy: boolean
  loading: 'inspect' | 'pay' | 'connect' | null
  walletAddress: string | null
  connectedWalletName: string | null
  /** When true, show Hedera connect instead of EIP-1193 wallet picker. */
  hederaMode?: boolean
  showWalletPicker: boolean
  pickerWallets: DiscoveredWallet[]
  onConnect: () => void
  onPay: () => void
  onWalletSelect: (walletId: string) => void
  onPickerCancel: () => void
}

export type PaywallLockedOverlayProps = {
  state: PaywallLockedOverlayState
  overlayClassName?: string
  cardClassName?: string
  appearance?: Partial<PaywallAppearance>
  /** Replace the default card UI entirely. */
  renderOverlay?: (state: PaywallLockedOverlayState) => ReactNode
}

function formatWalletLabel(address: string): string {
  if (address.startsWith('0x') && address.length >= 10) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }
  return address
}

export function PaywallLockedOverlay({
  state,
  overlayClassName,
  cardClassName,
  appearance,
  renderOverlay,
}: PaywallLockedOverlayProps) {
  const { slot, labels, appearance: resolved } = usePaywallAppearance(appearance)

  if (renderOverlay) {
    return (
      <div
        className={slot('overlay', overlayClassName)}
        role="dialog"
        aria-label={state.title}
      >
        {renderOverlay(state)}
      </div>
    )
  }

  const {
    title,
    description,
    displayPrice,
    error,
    busy,
    loading,
    walletAddress,
    connectedWalletName,
    hederaMode,
    showWalletPicker,
    pickerWallets,
    onConnect,
    onPay,
    onWalletSelect,
    onPickerCancel,
  } = state

  const connectLabel =
    loading === 'connect'
      ? hederaMode
        ? labels.connectHederaWalletLoading
        : labels.connectWalletLoading
      : hederaMode
        ? labels.connectHederaWallet
        : labels.connectWallet

  return (
    <div className={slot('overlay', overlayClassName)} role="dialog" aria-label={title}>
      <div className={slot('card', cardClassName)}>
        {resolved.brand ? <div className="x402-paywall-brand">{resolved.brand}</div> : null}
        <h2 className={slot('title')}>{title}</h2>
        <p className={slot('desc')}>{description}</p>
        {displayPrice ? <p className={slot('price')}>{displayPrice}</p> : null}
        {error ? <p className={slot('error')}>{error}</p> : null}

        {!hederaMode && showWalletPicker && pickerWallets.length > 0 ? (
          <WalletPicker
            wallets={pickerWallets}
            disabled={busy}
            onSelect={onWalletSelect}
            onCancel={onPickerCancel}
            appearance={appearance}
          />
        ) : (
          <div className={slot('actions')}>
            {!walletAddress ? (
              <button
                type="button"
                className={slot('btnSecondary')}
                disabled={busy}
                onClick={onConnect}
              >
                {connectLabel}
              </button>
            ) : null}
            <button type="button" className={slot('btnPrimary')} disabled={busy} onClick={onPay}>
              {loading === 'pay' ? labels.paying : labels.payToRead}
            </button>
          </div>
        )}

        {walletAddress ? (
          <p className={slot('wallet')}>
            {connectedWalletName ? `${connectedWalletName} · ` : ''}
            {formatWalletLabel(walletAddress)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
