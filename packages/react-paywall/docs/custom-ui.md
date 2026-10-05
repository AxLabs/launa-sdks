# Custom UI

## Class name slots

Every visual part has a slot in `PaywallClassNames`. Export `defaultPaywallClassNames` to extend defaults:

```tsx
import {
  PaywallProvider,
  defaultPaywallClassNames,
} from '@launa/react-paywall'

<PaywallProvider
  appearance={{
    classNames: {
      gate: `${defaultPaywallClassNames.gate} my-paywall`,
      btnPrimary: 'my-btn my-btn--primary',
    },
  }}
/>
```

Full slot list: `root`, `gate`, `teaser`, `overlay`, `card`, `title`, `desc`, `price`, `error`, `actions`, `btnPrimary`, `btnSecondary`, `wallet`, `article`, `raw`, `agent*`, `walletPicker*`.

`PaywallGate` also accepts: `className`, `teaserClassName`, `overlayClassName`, `cardClassName`, `unlockedClassName`.

## Unstyled mode

Use your design system only:

```tsx
<PaywallProvider
  appearance={{
    unstyled: true,
    classNames: {
      gate: 'relative',
      overlay: 'absolute inset-0 flex items-center justify-center bg-black/80',
      card: 'max-w-md p-8 bg-neutral-900 rounded-xl',
      btnPrimary: 'btn btn-lg btn-primary w-full',
      btnSecondary: 'btn btn-lg btn-ghost w-full',
    },
  }}
/>
```

Import `styles.css` only if you still want agent-block defaults, or style agent slots too.

## Replace the locked overlay

`renderLockedOverlay` receives state and handlers — full UI control:

```tsx
<PaywallGate
  resourceUrl={url}
  renderLockedOverlay={(s) => (
    <div className="my-modal">
      <h2>{s.title}</h2>
      <p>{s.displayPrice}</p>
      {s.error && <p role="alert">{s.error}</p>}
      {!s.walletAddress && (
        <button onClick={s.onConnect} disabled={s.busy}>
          Connect
        </button>
      )}
      <button onClick={s.onPay} disabled={s.busy}>
        Pay
      </button>
      {s.showWalletPicker &&
        s.pickerWallets.map((w) => (
          <button key={w.id} onClick={() => s.onWalletSelect(w.id)}>
            {w.name}
          </button>
        ))}
    </div>
  )}
/>
```

`PaywallLockedOverlayState` fields: `title`, `description`, `displayPrice`, `error`, `busy`, `loading`, `walletAddress`, `connectedWalletName`, `showWalletPicker`, `pickerWallets`, `onConnect`, `onPay`, `onWalletSelect`, `onPickerCancel`.

## Headless composition

Use `usePaywall()` + presentational `PaywallOverlay` / `WalletPicker`:

```tsx
const { inspect, unlock, connectWallet, walletAddress } = usePaywall()

<PaywallOverlay
  title="Premium"
  priceLabel="$0.01"
  walletAddress={walletAddress}
  onConnectWallet={() => connectWallet()}
  onPay={() => unlock(url)}
  appearance={…}
/>
```

`usePaidFetch(url)` wraps fetch with payment for custom layouts.

## `PaywallAppearanceProvider`

Use without `PaywallProvider` if you only need styling context:

```tsx
<PaywallAppearanceProvider appearance={{ theme: { accent: '#000' } }}>
  <WalletPicker wallets={w} onSelect={…} />
</PaywallAppearanceProvider>
```

`usePaywallAppearance(partial)` merges provider + local overrides.
