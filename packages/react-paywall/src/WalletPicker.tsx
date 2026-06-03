import type { DiscoveredWallet } from './discoverWallets.js'
import type { PaywallAppearance } from './appearance.js'
import { usePaywallAppearance } from './appearanceContext.js'

export type WalletPickerProps = {
  wallets: DiscoveredWallet[]
  onSelect: (walletId: string) => void
  onCancel?: () => void
  disabled?: boolean
  appearance?: Partial<PaywallAppearance>
  className?: string
}

export function WalletPicker({
  wallets,
  onSelect,
  onCancel,
  disabled,
  appearance,
  className,
}: WalletPickerProps) {
  const { slot, labels } = usePaywallAppearance(appearance)

  return (
    <div className={slot('walletPicker', className)} role="listbox" aria-label={labels.walletPickerTitle}>
      <p className={slot('walletPickerLabel')}>{labels.walletPickerTitle}</p>
      <ul className={slot('walletPickerList')}>
        {wallets.map((wallet) => (
          <li key={wallet.id}>
            <button
              type="button"
              className={slot('walletPickerOption')}
              disabled={disabled}
              onClick={() => onSelect(wallet.id)}
            >
              {wallet.icon ? (
                <img className={slot('walletPickerIcon')} src={wallet.icon} alt="" />
              ) : (
                <span className={slot('walletPickerIconPlaceholder')} aria-hidden />
              )}
              <span className={slot('walletPickerName')}>{wallet.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {onCancel ? (
        <button
          type="button"
          className={slot('walletPickerCancel')}
          disabled={disabled}
          onClick={onCancel}
        >
          {labels.walletPickerCancel}
        </button>
      ) : null}
    </div>
  )
}
