'use client'

import type { ReactNode } from 'react'
import { Ax402Paywall, PaywallProvider } from '@axlabs/x402-buyer-plugin-react'
import type { BuyerPaywallPolicy } from '@axlabs/x402-buyer-plugin-core'
import { DEFAULT_BUYER_POLICY } from '@axlabs/x402-buyer-plugin-core'
import { paywallFieldsFromDoc, PAYWALL_FIELD_NAME } from '../fields.js'

export {
  Ax402Paywall,
  PaywallProvider,
  PaywallGate,
  usePaywall,
  usePaidFetch,
} from '@axlabs/x402-buyer-plugin-react'
export type { PaywallPolicy, PaywallAppearance } from '@axlabs/x402-buyer-plugin-react'
export { InspectGatewayField } from './InspectGatewayField.js'

export type Ax402PaywallBlockProps = {
  doc: Record<string, unknown>
  rpc?: { defaultUrl?: string; byNetwork?: Record<string, string> }
  children?: ReactNode
  className?: string
}

/** Renders paywall when doc has ax402Paywall.paywallEnabled. */
export function Ax402PaywallBlock({ doc, rpc, children, className }: Ax402PaywallBlockProps) {
  const paywall = paywallFieldsFromDoc(doc)
  if (!paywall.enabled || !paywall.gatewayResourceUrl) {
    return <>{children}</>
  }

  return (
    <Ax402Paywall
      resourceUrl={paywall.gatewayResourceUrl}
      policy={paywall.policy ?? DEFAULT_BUYER_POLICY}
      rpc={rpc}
      className={className}
    >
      {paywall.teaser ? <p>{paywall.teaser}</p> : children}
    </Ax402Paywall>
  )
}

export type Ax402PaywallProviderProps = {
  children: ReactNode
  policy?: BuyerPaywallPolicy
  rpc?: { defaultUrl?: string; byNetwork?: Record<string, string> }
}

/** Site-wide provider — wrap root layout once (Next.js single React tree). */
export function Ax402PaywallProvider({ children, policy, rpc }: Ax402PaywallProviderProps) {
  return (
    <PaywallProvider policy={policy ?? DEFAULT_BUYER_POLICY} rpc={rpc}>
      {children}
    </PaywallProvider>
  )
}

export { paywallFieldsFromDoc, PAYWALL_FIELD_NAME }
