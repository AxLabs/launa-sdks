# @axlabs/ax402-payload

Buyer-side Payload CMS plugin — gate documents behind Ax402 gateway URLs.

## Install

```bash
pnpm add @axlabs/ax402-payload @axlabs/x402-react-paywall
```

Peer dependencies: `payload` ^3, `@payloadcms/ui`, React 18+.

Import paywall styles in your frontend layout:

```tsx
import '@axlabs/x402-react-paywall/styles.css'
```

## Payload config

```ts
import { ax402PayloadPlugin } from '@axlabs/ax402-payload'

export default buildConfig({
  plugins: [
    ax402PayloadPlugin({
      collections: ['posts', 'pages'],
    }),
  ],
})
```

## Frontend (Next.js website)

Wrap the root layout once:

```tsx
import { Ax402PaywallProvider } from '@axlabs/ax402-payload/rsc'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Ax402PaywallProvider policy={{ preferredNetworks: 'eip155:84532' }}>
          {children}
        </Ax402PaywallProvider>
      </body>
    </html>
  )
}
```

Gate a document:

```tsx
import { Ax402PaywallBlock } from '@axlabs/ax402-payload/rsc'

export function PostPage({ post }) {
  return (
    <Ax402PaywallBlock doc={post}>
      <article>{post.body}</article>
    </Ax402PaywallBlock>
  )
}
```

## Low-level buyer hooks

```tsx
import { usePaidFetch, usePaywall } from '@axlabs/ax402-payload/client'
```

## Admin fields

Each configured collection gets an **Ax402 Paywall** group:

| Field | Purpose |
|-------|---------|
| `paywallEnabled` | Enable gateway gating |
| `gatewayResourceUrl` | Full gateway URL |
| `paywallPolicy` | Optional policy JSON |
| `paywallTeaser` | Teaser before payment |
| Inspect gateway | Admin UI button (402 preview) |

Sellers create gateway URLs in the [Ax402 dashboard](https://ax402.io/docs) — this plugin is buyer-side only.
