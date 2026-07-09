import type { ReactNode } from 'react'
import type { PaywallAppearance } from './appearance.js'
import { usePaywallAppearance } from './appearanceContext.js'

export type PaywallOverlayProps = {
  title?: string
  description?: string
  priceLabel?: string
  error?: string | null
  loading?: boolean
  walletAddress?: string | null
  onConnectWallet?: () => void
  onPay?: () => void
  children?: ReactNode
  className?: string
  cardClassName?: string
  appearance?: Partial<PaywallAppearance>
}

/** Presentational overlay; pair with `usePaywall` or `usePaidFetch` for behavior. */
export function PaywallOverlay({
  title = 'Continue reading',
  description,
  priceLabel,
  error,
  loading,
  walletAddress,
  onConnectWallet,
  onPay,
  children,
  className,
  cardClassName,
  appearance,
}: PaywallOverlayProps) {
  const { slot, labels, appearance: resolved } = usePaywallAppearance(appearance)

  return (
    <div className={slot('overlay', className)} role="dialog" aria-label={title}>
      <div className={slot('card', cardClassName)}>
        {resolved.brand ? <div className="x402-paywall-brand">{resolved.brand}</div> : null}
        <h2 className={slot('title')}>{title}</h2>
        {description ? <p className={slot('desc')}>{description}</p> : null}
        {priceLabel ? <p className={slot('price')}>{priceLabel}</p> : null}
        {children}
        {error ? <p className={slot('error')}>{error}</p> : null}
        <div className={slot('actions')}>
          {!walletAddress && onConnectWallet ? (
            <button
              type="button"
              className={slot('btnSecondary')}
              disabled={loading}
              onClick={onConnectWallet}
            >
              {labels.connectWallet}
            </button>
          ) : null}
          {onPay ? (
            <button
              type="button"
              className={slot('btnPrimary')}
              disabled={loading}
              onClick={onPay}
            >
              {loading ? labels.paying : labels.payToRead}
            </button>
          ) : null}
        </div>
        {walletAddress ? (
          <p className={slot('wallet')}>
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
