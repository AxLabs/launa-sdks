# @axlabs/launa-payload

Buyer-side Payload CMS plugin — gate documents behind Launa gateway URLs.

## Install

```bash
pnpm add @axlabs/launa-payload @axlabs/x402-react-paywall
```

Peer dependencies: `payload` ^3, `@payloadcms/ui`, React 18+.

Import paywall styles in your frontend layout:

```tsx
import '@axlabs/x402-react-paywall/styles.css'
```

## Payload config

```ts
import { launaPayloadPlugin } from '@axlabs/launa-payload'

export default buildConfig({
  plugins: [
    launaPayloadPlugin({
      collections: ['posts', 'pages'],
    }),
  ],
})
```

## Frontend (Next.js website)

Wrap the root layout once:

```tsx
import { LaunaPaywallProvider } from '@axlabs/launa-payload/rsc'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LaunaPaywallProvider policy={{ preferredNetworks: 'eip155:84532' }}>
          {children}
        </LaunaPaywallProvider>
      </body>
    </html>
  )
}
```

Gate a document:

```tsx
import { LaunaPaywallBlock } from '@axlabs/launa-payload/rsc'

export function PostPage({ post }) {
  return (
    <LaunaPaywallBlock doc={post}>
      <article>{post.body}</article>
    </LaunaPaywallBlock>
  )
}
```

## Low-level buyer hooks

```tsx
import { usePaidFetch, usePaywall } from '@axlabs/launa-payload/client'
```

## Admin fields

Each configured collection gets an **Launa Paywall** group:

| Field | Purpose |
|-------|---------|
| `paywallEnabled` | Enable gateway gating |
| `gatewayResourceUrl` | Full gateway URL |
| `paywallPolicy` | Optional policy JSON |
| `paywallTeaser` | Teaser before payment |
| Inspect gateway | Admin UI button (402 preview) |

Sellers create gateway URLs in the [Launa dashboard](https://launa.io/docs) — this plugin is buyer-side only.
