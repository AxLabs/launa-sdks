import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  defaultPaywallClassNames,
  defaultPaywallLabels,
  mergePaywallAppearance,
  paywallThemeToCssProperties,
  type PaywallAppearance,
  type PaywallClassNames,
  type PaywallLabels,
} from './appearance.js'

export type PaywallAppearanceContextValue = {
  appearance: PaywallAppearance
  labels: PaywallLabels
  style: CSSProperties
  slot: (key: keyof PaywallClassNames, ...extra: Array<string | undefined>) => string
}

const PaywallAppearanceContext = createContext<PaywallAppearanceContextValue | null>(null)

export type PaywallAppearanceProviderProps = {
  children: ReactNode
  appearance?: PaywallAppearance
}

export function PaywallAppearanceProvider({
  children,
  appearance = {},
}: PaywallAppearanceProviderProps) {
  const value = useMemo(() => buildAppearanceValue(appearance), [appearance])
  return (
    <PaywallAppearanceContext.Provider value={value}>
      <div className={value.slot('root')} style={value.style}>
        {children}
      </div>
    </PaywallAppearanceContext.Provider>
  )
}

function buildAppearanceValue(appearance: PaywallAppearance): PaywallAppearanceContextValue {
  const merged = mergePaywallAppearance({ unstyled: false }, appearance)
  const labels: PaywallLabels = { ...defaultPaywallLabels, ...merged.labels }
  const unstyled = merged.unstyled === true
  const classNames = merged.classNames ?? {}

  const slot = (key: keyof PaywallClassNames, ...extra: Array<string | undefined>): string => {
    const parts: string[] = []
    if (!unstyled) {
      parts.push(defaultPaywallClassNames[key])
    }
    const custom = classNames[key]
    if (custom) {
      parts.push(custom)
    }
    for (const e of extra) {
      if (e) {
        parts.push(e)
      }
    }
    return parts.join(' ').trim()
  }

  return {
    appearance: merged,
    labels,
    style: paywallThemeToCssProperties(merged.theme),
    slot,
  }
}

export function usePaywallAppearance(
  override?: Partial<PaywallAppearance>,
): PaywallAppearanceContextValue {
  const parent = useContext(PaywallAppearanceContext)
  return useMemo(() => {
    const baseAppearance = parent?.appearance ?? {}
    return buildAppearanceValue(mergePaywallAppearance(baseAppearance, override))
  }, [parent, override])
}
