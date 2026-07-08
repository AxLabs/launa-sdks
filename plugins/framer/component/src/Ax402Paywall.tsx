import { addPropertyControls, ControlType } from "framer"
import type { ReactNode } from "react"
import { Ax402Paywall } from "@axlabs/x402-buyer-plugin-react"
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
  children?: ReactNode
}

export default function Ax402PaywallFramer({
  resourceUrl,
  title,
  description,
  preferredNetworks,
  allowedAssets,
  allowedSchemes,
  rpcUrl,
  accent,
  payLabel,
  children,
}: Props) {
  if (!resourceUrl?.trim()) {
    return (
      <div style={{ padding: 16, border: "1px dashed #ccc", borderRadius: 8 }}>
        Set a gateway resource URL in the Framer properties panel.
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
    >
      {children}
    </Ax402Paywall>
  )
}

addPropertyControls(Ax402PaywallFramer, {
  resourceUrl: {
    type: ControlType.String,
    title: "Gateway URL",
    defaultValue: "https://echo.staging.ax402.io/echo/get?test=1",
  },
  title: { type: ControlType.String, title: "Title", defaultValue: "Continue reading" },
  description: {
    type: ControlType.String,
    title: "Description",
    defaultValue: "Pay once to unlock this content.",
    displayTextArea: true,
  },
  preferredNetworks: {
    type: ControlType.String,
    title: "Preferred networks",
    defaultValue: "eip155:84532",
  },
  allowedAssets: { type: ControlType.String, title: "Allowed assets", defaultValue: "" },
  allowedSchemes: {
    type: ControlType.String,
    title: "Allowed schemes",
    defaultValue: "exact,batch-settlement",
  },
  rpcUrl: {
    type: ControlType.String,
    title: "RPC URL",
    defaultValue: "https://sepolia.base.org",
  },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#0052ff" },
  payLabel: { type: ControlType.String, title: "Pay button label", defaultValue: "Pay to read" },
})
