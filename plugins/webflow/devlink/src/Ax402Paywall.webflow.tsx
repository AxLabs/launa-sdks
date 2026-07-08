import { props } from "@webflow/data-types"
import { declareComponent } from "@webflow/react"
import { Ax402Paywall } from "@axlabs/x402-buyer-plugin-react"
import "@axlabs/x402-react-paywall/styles.css"

function Ax402PaywallWebflow({
  resourceUrl,
  title,
  description,
  preferredNetworks,
  allowedAssets,
  allowedSchemes,
  rpcUrl,
  accent,
  payLabel,
}: {
  resourceUrl: string
  title: string
  description: string
  preferredNetworks: string
  allowedAssets: string
  allowedSchemes: string
  rpcUrl: string
  accent: string
  payLabel: string
}) {
  if (!resourceUrl?.trim()) {
    return (
      <div style={{ padding: 16, border: "1px dashed #ccc" }}>
        Configure gateway URL in Webflow props.
      </div>
    )
  }

  return (
    <Ax402Paywall
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

export default declareComponent(Ax402PaywallWebflow, {
  name: "Ax402 Paywall",
  description: "Buyer-side x402 paywall routed through Ax402 gateway",
  props: {
    resourceUrl: props.Text({
      name: "Gateway URL",
      defaultValue: "https://echo.staging.ax402.io/echo/get?test=1",
    }),
    title: props.Text({ name: "Title", defaultValue: "Continue reading" }),
    description: props.Text({
      name: "Description",
      defaultValue: "Pay once to unlock this content.",
    }),
    preferredNetworks: props.Text({
      name: "Preferred networks",
      defaultValue: "eip155:84532",
    }),
    allowedAssets: props.Text({ name: "Allowed assets", defaultValue: "" }),
    allowedSchemes: props.Text({
      name: "Allowed schemes",
      defaultValue: "exact,batch-settlement",
    }),
    rpcUrl: props.Text({ name: "RPC URL", defaultValue: "https://sepolia.base.org" }),
    accent: props.Text({ name: "Accent color", defaultValue: "#0052ff" }),
    payLabel: props.Text({ name: "Pay button label", defaultValue: "Pay to read" }),
  },
})
