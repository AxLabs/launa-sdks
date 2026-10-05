'use client'

import type { ReactNode } from 'react'
import { LaunaPaywall, PaywallProvider } from '@axlabs/x402-buyer-plugin-react'
import type { BuyerPaywallPolicy } from '@axlabs/x402-buyer-plugin-core'
import { DEFAULT_BUYER_POLICY } from '@axlabs/x402-buyer-plugin-core'
import { paywallFieldsFromDoc, PAYWALL_FIELD_NAME } from '../fields.js'

export {
  LaunaPaywall,
  PaywallProvider,
  PaywallGate,
  usePaywall,
  usePaidFetch,
} from '@axlabs/x402-buyer-plugin-react'
export type { PaywallPolicy, PaywallAppearance } from '@axlabs/x402-buyer-plugin-react'
export { InspectGatewayField } from './InspectGatewayField.js'

export type LaunaPaywallBlockProps = {
  doc: Record<string, unknown>
  rpc?: { defaultUrl?: string; byNetwork?: Record<string, string> }
  children?: ReactNode
  className?: string
}

/** Renders paywall when doc has launaPaywall.paywallEnabled. */
export function LaunaPaywallBlock({ doc, rpc, children, className }: LaunaPaywallBlockProps) {
  const paywall = paywallFieldsFromDoc(doc)
  if (!paywall.enabled || !paywall.gatewayResourceUrl) {
    return <>{children}</>
  }

  return (
    <LaunaPaywall
      resourceUrl={paywall.gatewayResourceUrl}
      policy={paywall.policy ?? DEFAULT_BUYER_POLICY}
      rpc={rpc}
      className={className}
    >
      {paywall.teaser ? <p>{paywall.teaser}</p> : children}
    </LaunaPaywall>
  )
}

export type LaunaPaywallProviderProps = {
  children: ReactNode
  policy?: BuyerPaywallPolicy
  rpc?: { defaultUrl?: string; byNetwork?: Record<string, string> }
}

/** Site-wide provider — wrap root layout once (Next.js single React tree). */
export function LaunaPaywallProvider({ children, policy, rpc }: LaunaPaywallProviderProps) {
  return (
    <PaywallProvider policy={policy ?? DEFAULT_BUYER_POLICY} rpc={rpc}>
      {children}
    </PaywallProvider>
  )
}

export { paywallFieldsFromDoc, PAYWALL_FIELD_NAME }
