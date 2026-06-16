import type { CSSProperties, ReactNode } from 'react'

/** Design tokens mapped to CSS custom properties on the paywall root. */
export type PaywallTheme = {
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

/** Override default BEM classes per UI slot. */
export type PaywallClassNames = {
  root?: string
  gate?: string
  teaser?: string
  overlay?: string
  card?: string
  title?: string
  desc?: string
  price?: string
  error?: string
  actions?: string
  btn?: string
  btnPrimary?: string
  btnSecondary?: string
  wallet?: string
  article?: string
  raw?: string
  agent?: string
  agentTitle?: string
  agentSummary?: string
  agentResource?: string
  agentSteps?: string
  agentOffer?: string
  agentLibs?: string
  walletPicker?: string
  walletPickerLabel?: string
  walletPickerList?: string
  walletPickerOption?: string
  walletPickerIcon?: string
  walletPickerIconPlaceholder?: string
  walletPickerName?: string
  walletPickerCancel?: string
}

export type PaywallLabels = {
  connectWallet?: string
  connectWalletLoading?: string
  payToRead?: string
  /** Batch: first deposit to open a channel. */
  payToReadDeposit?: string
  /** Batch: additional escrow when balance is too low. */
  payToReadTopUp?: string
  /** Batch: voucher-only (existing on-chain escrow). */
  payToReadVoucher?: string
  paying?: string
  walletPickerTitle?: string
  walletPickerCancel?: string
  agentTitle?: string
}

export type PaywallAppearance = {
  theme?: PaywallTheme
  classNames?: Partial<PaywallClassNames>
  labels?: Partial<PaywallLabels>
  /** Logo, wordmark, or header row shown above the paywall title. */
  brand?: ReactNode
  /** Use only `classNames` (no bundled `x402-*` classes). Import styles.css only if you set tokens yourself. */
  unstyled?: boolean
}

export const defaultPaywallLabels: Required<PaywallLabels> = {
  connectWallet: 'Connect wallet',
  connectWalletLoading: 'Connecting…',
  payToRead: 'Pay to read',
  payToReadDeposit: 'Deposit & unlock',
  payToReadTopUp: 'Top up & unlock',
  payToReadVoucher: 'Unlock',
  paying: 'Paying…',
  walletPickerTitle: 'Choose a wallet',
  walletPickerCancel: 'Cancel',
  agentTitle: 'For AI agents and automated clients',
}

export const defaultPaywallClassNames: Required<PaywallClassNames> = {
  root: 'x402-paywall-root',
  gate: 'x402-paywall-gate',
  teaser: 'x402-paywall-teaser',
  overlay: 'x402-paywall-overlay',
  card: 'x402-paywall-card',
  title: 'x402-paywall-title',
  desc: 'x402-paywall-desc',
  price: 'x402-paywall-price',
  error: 'x402-paywall-error',
  actions: 'x402-paywall-actions',
  btn: 'x402-paywall-btn',
  btnPrimary: 'x402-paywall-btn x402-paywall-btn-primary',
  btnSecondary: 'x402-paywall-btn x402-paywall-btn-secondary',
  wallet: 'x402-paywall-wallet',
  article: 'x402-paywall-article',
  raw: 'x402-paywall-raw',
  agent: 'x402-paywall-agent',
  agentTitle: 'x402-paywall-agent-title',
  agentSummary: 'x402-paywall-agent-summary',
  agentResource: 'x402-paywall-agent-resource',
  agentSteps: 'x402-paywall-agent-steps',
  agentOffer: 'x402-paywall-agent-offer',
  agentLibs: 'x402-paywall-agent-libs',
  walletPicker: 'x402-wallet-picker',
  walletPickerLabel: 'x402-wallet-picker-label',
  walletPickerList: 'x402-wallet-picker-list',
  walletPickerOption: 'x402-wallet-picker-option',
  walletPickerIcon: 'x402-wallet-picker-icon',
  walletPickerIconPlaceholder: 'x402-wallet-picker-icon-placeholder',
  walletPickerName: 'x402-wallet-picker-name',
  walletPickerCancel: 'x402-wallet-picker-cancel',
}

const themeVarMap: Record<keyof PaywallTheme, string> = {
  accent: '--x402-accent',
  title: '--x402-title',
  muted: '--x402-muted',
  border: '--x402-border',
  cardBg: '--x402-card-bg',
  secondaryBg: '--x402-secondary-bg',
  error: '--x402-error',
  agentBg: '--x402-agent-bg',
  overlayStart: '--x402-overlay-start',
  overlayEnd: '--x402-overlay-end',
  cardRadius: '--x402-card-radius',
  buttonRadius: '--x402-button-radius',
  fontFamily: '--x402-font-family',
}

export function paywallThemeToCssProperties(theme?: PaywallTheme): CSSProperties {
  if (!theme) {
    return {}
  }
  const style: Record<string, string> = {}
  for (const key of Object.keys(theme) as (keyof PaywallTheme)[]) {
    const value = theme[key]
    if (value !== undefined) {
      style[themeVarMap[key]] = value
    }
  }
  return style as CSSProperties
}

export function mergePaywallAppearance(
  base: PaywallAppearance,
  override?: Partial<PaywallAppearance>,
): PaywallAppearance {
  if (!override) {
    return base
  }
  return {
    unstyled: override.unstyled ?? base.unstyled,
    brand: override.brand ?? base.brand,
    theme: { ...base.theme, ...override.theme },
    classNames: { ...base.classNames, ...override.classNames },
    labels: { ...base.labels, ...override.labels },
  }
}
