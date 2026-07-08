/** Serializable paywall policy (mirrors @axlabs/x402-react-paywall PaywallPolicy). */
export type BuyerPaywallPolicy = {
  maxAmount?: string
  allowedSchemes?: string
  preferredSchemes?: string
  allowedChains?: string
  allowedAssets?: string
  allowedPayTo?: string
  preferredNetworks?: string
  preferredAssets?: string
  preferredTransferMethods?: string
  strategy?: "server-order" | "preference-first"
}

export type BuyerRpcConfig = {
  defaultUrl?: string
  byNetwork?: Record<string, string>
}

export type BuyerBatchOptions = {
  channelSalt?: `0x${string}`
  depositMultiplier?: number
  withdrawDelaySecs?: number
  persistChannels?: boolean
  debugChannel?: boolean
}

export type BuyerPaywallTheme = {
  accent?: string
  title?: string
  muted?: string
  border?: string
  cardBg?: string
  secondaryBg?: string
  error?: string
  agentBg?: string
  overlayStart?: string
  overlayEnd?: string
  cardRadius?: string
  buttonRadius?: string
  fontFamily?: string
}

export type BuyerPaywallLabels = {
  connectWallet?: string
  connectWalletLoading?: string
  payToRead?: string
  payToReadDeposit?: string
  payToReadTopUp?: string
  payToReadVoucher?: string
  paying?: string
  walletPickerTitle?: string
  walletPickerCancel?: string
  agentTitle?: string
}

/** Serializable appearance (no ReactNode brand). */
export type BuyerPaywallAppearance = {
  theme?: BuyerPaywallTheme
  labels?: BuyerPaywallLabels
  unstyled?: boolean
}

export type BuyerRequestInit = {
  method?: string
  headers?: Record<string, string>
}

export type BuyerPaywallConfig = {
  resourceUrl: string
  title?: string
  description?: string
  priceLabel?: string
  policy?: BuyerPaywallPolicy
  rpc?: BuyerRpcConfig
  batch?: BuyerBatchOptions
  appearance?: BuyerPaywallAppearance
  requestInit?: BuyerRequestInit
  agentDiscovery?: boolean
}

export type BuyerPaywallGateProps = BuyerPaywallConfig & {
  children?: unknown
}

export const DEFAULT_BUYER_POLICY: BuyerPaywallPolicy = {
  allowedSchemes: "exact,batch-settlement",
  preferredNetworks: "eip155:84532",
  strategy: "server-order",
}

export function mergeBuyerConfig(
  base: Partial<BuyerPaywallConfig>,
  override: Partial<BuyerPaywallConfig>,
): BuyerPaywallConfig {
  return {
    ...base,
    ...override,
    policy: { ...base.policy, ...override.policy },
    rpc: { ...base.rpc, ...override.rpc },
    batch: { ...base.batch, ...override.batch },
    appearance: {
      ...base.appearance,
      ...override.appearance,
      theme: { ...base.appearance?.theme, ...override.appearance?.theme },
      labels: { ...base.appearance?.labels, ...override.appearance?.labels },
    },
    requestInit: {
      ...base.requestInit,
      ...override.requestInit,
      headers: { ...base.requestInit?.headers, ...override.requestInit?.headers },
    },
  } as BuyerPaywallConfig
}
