/**
 * Inlined paywall component source written alongside LaunaPaywall.tsx by the editor plugin.
 * Copy from @axlabs/x402-framer-component when publishing to Framer Marketplace.
 */
import { LaunaPaywall } from "@axlabs/x402-buyer-plugin-react"
import "@axlabs/x402-react-paywall/styles.css"

type Props = {
  resourceUrl: string
  title: string
  description: string
  preferredNetworks: string
  allowedAssets: string
  allowedSchemes: string
  rpcUrl: string
  accent: string
  payLabel: string
}

export default function LaunaPaywallFramer({
  resourceUrl,
  title,
  description,
  preferredNetworks,
  allowedAssets,
  allowedSchemes,
  rpcUrl,
  accent,
  payLabel,
}: Props) {
  if (!resourceUrl?.trim()) {
    return (
      <div style={{ padding: 16, border: "1px dashed #ccc", borderRadius: 8 }}>
        Set a gateway resource URL in the properties panel.
      </div>
    )
  }

  return (
    <LaunaPaywall
      resourceUrl={resourceUrl}
      title={title}
      description={description}
      policy={{
        preferredNetworks,
        allowedAssets: allowedAssets || undefined,
        allowedSchemes: allowedSchemes || "exact,batch-settlement",
      }}
      rpc={rpcUrl ? { defaultUrl: rpcUrl } : undefined}
      appearance={{
        theme: accent ? { accent } : undefined,
        labels: payLabel ? { payToRead: payLabel } : undefined,
      }}
    />
  )
}
