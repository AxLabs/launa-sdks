import type { PaymentRequired, PaymentRequirements } from '@x402/fetch'

export type SelectionStrategy = 'server-order' | 'preference-first'

export type PaywallPolicy = {
  maxAmount?: string
  allowedChains?: string
  allowedAssets?: string
  allowedPayTo?: string
  preferredNetworks?: string
  preferredAssets?: string
  preferredTransferMethods?: string
  strategy?: SelectionStrategy
}

export type SelectionResult = {
  selected: PaymentRequirements | null
  selectedIndex: number
  rejected: Array<{ index: number; reason: string; requirement: PaymentRequirements }>
}

export type InspectResult = {
  status: number
  paymentRequired?: PaymentRequired
  selection?: SelectionResult
  bodyText: string
}

export type UnlockResult = {
  status: number
  bodyText: string
  headers: Array<[string, string]>
  paymentRequired?: PaymentRequired
  selection?: SelectionResult
}

export type RpcConfig = {
  defaultUrl?: string
  byNetwork?: Record<string, string>
}
