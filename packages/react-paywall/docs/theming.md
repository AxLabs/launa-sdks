# Theming & branding

Customization is layered:

1. **CSS variables** (`appearance.theme`) — colors, radii, fonts
2. **Labels** (`appearance.labels`) — button and picker copy
3. **Brand slot** (`appearance.brand`) — logo or header node
4. **Class names** (`appearance.classNames`) — hook into Tailwind / CSS modules
5. **Per-gate overrides** — `PaywallGate` `appearance` prop merges with provider

Set global defaults on `PaywallProvider`:

```tsx
<PaywallProvider
  appearance={{
    theme: {
      accent: '#e11d48',
      title: '#fafafa',
      muted: '#a1a1aa',
      cardBg: '#18181b',
      secondaryBg: '#27272a',
      border: '#3f3f46',
      overlayStart: 'rgba(0,0,0,0.2)',
      overlayEnd: 'rgba(24,24,27,0.95)',
      cardRadius: '16px',
      buttonRadius: '10px',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
    brand: <img src="/brand.svg" alt="" height={32} />,
    labels: {
      connectWallet: 'Link wallet',
      payToRead: 'Unlock now',
      paying: 'Confirm in wallet…',
    },
  }}
>
```

## CSS variables reference

Applied on `.x402-paywall-root` (wraps all paywall UI when using `PaywallProvider`):

| Variable | Default role |
|----------|----------------|
| `--x402-accent` | Primary button, price highlight |
| `--x402-title` | Headings, wallet row text |
| `--x402-muted` | Descriptions, footer |
| `--x402-border` | Card and picker borders |
| `--x402-card-bg` | Overlay card background |
| `--x402-secondary-bg` | Secondary button, picker rows |
| `--x402-error` | Error text |
| `--x402-agent-bg` | Agent instructions panel |
| `--x402-overlay-start` / `--x402-overlay-end` | Teaser gradient |
| `--x402-card-radius` | Card corner radius |
| `--x402-button-radius` | Button corner radius |
| `--x402-font-family` | Paywall typography |

Override globally without React:

```css
.my-app {
  --x402-accent: #059669;
}
```

## Tailwind

Pass Tailwind classes via `classNames`:

```tsx
appearance={{
  classNames: {
    card: 'rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl',
    btnPrimary: 'w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500',
    btnSecondary: 'w-full rounded-lg border border-zinc-600 py-3 text-zinc-200',
  },
}}
```

Default `x402-*` classes are still applied unless `unstyled: true`.

## Teaser blur

Control teaser via gate props:

```tsx
<PaywallGate teaserClassName="max-h-32 blur-md" … />
```

Or target `.x402-paywall-teaser` in your CSS.

## Agent block styling

```tsx
appearance={{
  classNames: {
    agent: 'mt-4 rounded-lg border border-dashed border-zinc-600 p-4 text-sm text-zinc-400',
    agentTitle: 'text-zinc-200 font-medium',
  },
  labels: { agentTitle: 'API / agent access (x402)' },
}}
```

See [AI agents](./agents.md).
