import type { ReactNode } from "react"
import { PaywallGate, PaywallProvider } from "@axlabs/x402-react-paywall"
import type { BuyerPaywallConfig } from "@axlabs/x402-buyer-plugin-core"
import { DEFAULT_BUYER_POLICY, mergeBuyerConfig } from "@axlabs/x402-buyer-plugin-core"

export type Ax402PaywallProps = Partial<BuyerPaywallConfig> & {
  resourceUrl: string
  children?: ReactNode
  className?: string
}

/**
 * Self-contained paywall: embeds PaywallProvider + PaywallGate.
 * Required for platforms with isolated React roots (Framer, Webflow code components).
 */
export function Ax402Paywall({
  resourceUrl,
  title = "Continue reading",
  description = "Pay once to unlock this content.",
  priceLabel,
  policy,
  rpc,
  batch,
  appearance,
  requestInit,
  agentDiscovery = true,
  children,
  className,
}: Ax402PaywallProps) {
  const merged = mergeBuyerConfig(
    { resourceUrl, title, description, policy: DEFAULT_BUYER_POLICY },
    {
      resourceUrl,
      title,
      description,
      priceLabel,
      policy,
      rpc,
      batch,
      appearance,
      requestInit,
      agentDiscovery,
    },
  )

  return (
    <PaywallProvider policy={merged.policy} batch={merged.batch} rpc={merged.rpc} appearance={merged.appearance}>
      <PaywallGate
        resourceUrl={merged.resourceUrl}
        requestInit={merged.requestInit}
        title={merged.title}
        description={merged.description}
        priceLabel={merged.priceLabel}
        agentDiscovery={merged.agentDiscovery}
        appearance={merged.appearance}
        className={className}
      >
        {children}
      </PaywallGate>
    </PaywallProvider>
  )
}

export { PaywallProvider, PaywallGate, usePaywall, usePaidFetch } from "@axlabs/x402-react-paywall"
export type { PaywallPolicy, PaywallAppearance } from "@axlabs/x402-react-paywall"
