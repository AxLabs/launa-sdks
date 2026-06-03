# Examples

## Staging echo (demo)

```tsx
<PaywallGate resourceUrl="/echo/get?test=1" title="Unlock response" />
```

Proxy `/echo` → `https://echo.staging.ax402.io` in Vite (see `x402-react-paywall` demo).

## Branded publisher

```tsx
<PaywallProvider
  appearance={{
    theme: {
      accent: '#b45309',
      cardBg: '#fffbeb',
      border: '#fde68a',
      fontFamily: 'Georgia, serif',
    },
    brand: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/herald.svg" alt="" width={28} height={28} />
        <span style={{ fontWeight: 700 }}>The Herald</span>
      </div>
    ),
    labels: {
      payToRead: 'Read for $0.01',
      connectWallet: 'Sign in with wallet',
    },
  }}
  policy={{ preferredNetworks: 'eip155:84532' }}
  rpc={{ defaultUrl: 'https://sepolia.base.org' }}
>
  <PaywallGate
    resourceUrl="https://api.publisher.com/v1/story/42"
    title="Subscriber-only"
    description="Support journalism with a single USDC micropayment."
  >
    <p>Lead paragraph…</p>
  </PaywallGate>
</PaywallProvider>
```

## Dark theme

```tsx
const darkAppearance = {
  theme: {
    accent: '#38bdf8',
    title: '#f4f4f5',
    muted: '#a1a1aa',
    cardBg: '#18181b',
    secondaryBg: '#27272a',
    border: '#3f3f46',
    agentBg: '#09090b',
    overlayStart: 'rgba(0,0,0,0.35)',
    overlayEnd: 'rgba(9,9,11,0.92)',
  },
} satisfies PaywallAppearance
```

## Tailwind card

```tsx
appearance={{
  classNames: {
    card: 'w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl',
    title: 'text-xl font-semibold text-white',
    desc: 'text-sm text-slate-400',
    btnPrimary: 'mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2.5 font-medium text-white hover:bg-indigo-400 disabled:opacity-50',
  },
}}
```

## Custom overlay (Material-style)

```tsx
<PaywallGate
  resourceUrl={url}
  appearance={{ unstyled: true }}
  renderLockedOverlay={(s) => (
    <div className="MuiPaper-root" style={{ padding: 24, maxWidth: 400, margin: 'auto' }}>
      <Typography variant="h5">{s.title}</Typography>
      <Typography color="textSecondary">{s.description}</Typography>
      {s.displayPrice && <Chip label={s.displayPrice} color="primary" />}
      <Stack spacing={1} sx={{ mt: 2 }}>
        {!s.walletAddress && (
          <Button variant="outlined" onClick={s.onConnect} disabled={s.busy}>
            Connect
          </Button>
        )}
        <Button variant="contained" onClick={s.onPay} disabled={s.busy}>
          {s.loading === 'pay' ? 'Confirming…' : 'Unlock'}
        </Button>
      </Stack>
    </div>
  )}
>
  {preview}
</PaywallGate>
```

## Programmatic unlock

```tsx
const { unlock, inspect } = usePaywall()

async function payAndShow() {
  const preview = await inspect(url)
  console.log('accepts', preview.paymentRequired?.accepts)
  const result = await unlock(url)
  setBody(JSON.parse(result.bodyText))
}
```

## Hide agent block

```tsx
<PaywallGate resourceUrl={url} agentDiscovery={false} />
```

## Multiple gates, one brand

```tsx
<PaywallProvider appearance={{ theme: { accent: '#6366f1' }, brand: <Logo /> }}>
  <PaywallGate resourceUrl="/api/a" … />
  <PaywallGate resourceUrl="/api/b" appearance={{ labels: { payToRead: 'Unlock B' } }} … />
</PaywallProvider>
```
