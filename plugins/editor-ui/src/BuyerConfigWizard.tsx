import { useCallback, useState, type CSSProperties } from "react"
import type { BuyerPaywallConfig, BuyerInspectSummary } from "@axlabs/x402-buyer-plugin-core"
import {
  DEFAULT_BUYER_POLICY,
  inspectBuyerGateway,
  mergeBuyerConfig,
  validateBuyerConfig,
} from "@axlabs/x402-buyer-plugin-core"

export type BuyerConfigWizardProps = {
  value: Partial<BuyerPaywallConfig>
  onChange: (config: BuyerPaywallConfig) => void
  requireHttps?: boolean
  style?: CSSProperties
  className?: string
}

type Tab = "gateway" | "policy" | "advanced" | "appearance"

export function BuyerConfigWizard({
  value,
  onChange,
  requireHttps = true,
  style,
  className = "launa-wizard",
}: BuyerConfigWizardProps) {
  const [tab, setTab] = useState<Tab>("gateway")
  const [inspect, setInspect] = useState<BuyerInspectSummary | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const config = mergeBuyerConfig(
    { resourceUrl: "", policy: DEFAULT_BUYER_POLICY },
    value as BuyerPaywallConfig,
  )

  const update = useCallback(
    (patch: Partial<BuyerPaywallConfig>) => {
      const next = mergeBuyerConfig(config, patch)
      onChange(next)
    },
    [config, onChange],
  )

  const runInspect = useCallback(async () => {
    setInspecting(true)
    setErrors([])
    const validation = validateBuyerConfig(config, { requireHttps: false })
    if (!validation.ok) {
      setErrors(validation.errors)
      setInspecting(false)
      return
    }
    const summary = await inspectBuyerGateway(config.resourceUrl)
    setInspect(summary)
    if (!summary.ok && summary.error) setErrors([summary.error])
    setInspecting(false)
  }, [config])

  const save = useCallback(() => {
    const validation = validateBuyerConfig(config, { requireHttps })
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    onChange(config)
  }, [config, onChange, requireHttps])

  return (
    <div className={className} style={style}>
      <div className="launa-wizard__tabs">
        {(["gateway", "policy", "advanced", "appearance"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`launa-wizard__tab${tab === t ? " launa-wizard__tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "gateway" && (
        <>
          <label>
            Gateway resource URL
            <input
              value={config.resourceUrl}
              onChange={(e) => update({ resourceUrl: e.target.value })}
              placeholder="https://my-api.launa.io/v1/article"
            />
          </label>
          <label>
            Title
            <input value={config.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
          </label>
          <label>
            Description
            <textarea
              value={config.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
            />
          </label>
          <div className="launa-wizard__actions">
            <button type="button" className="launa-wizard__btn launa-wizard__btn--secondary" onClick={runInspect} disabled={inspecting}>
              {inspecting ? "Inspecting…" : "Test inspect"}
            </button>
            <button type="button" className="launa-wizard__btn" onClick={save}>
              Save config
            </button>
          </div>
          {inspect && (
            <div className="launa-wizard__inspect">
              {inspect.ok ? (
                <>
                  <div>402 OK — schemes: {inspect.schemes.join(", ") || "—"}</div>
                  <div>Networks: {inspect.networks.join(", ") || "—"}</div>
                  <div>Amounts: {inspect.amounts.join(", ") || "—"}</div>
                </>
              ) : (
                <div>Inspect failed: {inspect.error ?? `HTTP ${inspect.status}`}</div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "policy" && (
        <>
          <label>
            Preferred networks (comma-separated CAIP-2)
            <input
              value={config.policy?.preferredNetworks ?? ""}
              onChange={(e) => update({ policy: { ...config.policy, preferredNetworks: e.target.value } })}
              placeholder="eip155:84532"
            />
          </label>
          <label>
            Allowed assets (comma-separated addresses)
            <input
              value={config.policy?.allowedAssets ?? ""}
              onChange={(e) => update({ policy: { ...config.policy, allowedAssets: e.target.value } })}
            />
          </label>
          <label>
            Allowed schemes
            <input
              value={config.policy?.allowedSchemes ?? "exact,batch-settlement"}
              onChange={(e) => update({ policy: { ...config.policy, allowedSchemes: e.target.value } })}
            />
          </label>
          <label>
            Max amount (atomic)
            <input
              value={config.policy?.maxAmount ?? ""}
              onChange={(e) => update({ policy: { ...config.policy, maxAmount: e.target.value } })}
            />
          </label>
          <label>
            Strategy
            <select
              value={config.policy?.strategy ?? "server-order"}
              onChange={(e) =>
                update({
                  policy: {
                    ...config.policy,
                    strategy: e.target.value as "server-order" | "preference-first",
                  },
                })
              }
            >
              <option value="server-order">server-order</option>
              <option value="preference-first">preference-first</option>
            </select>
          </label>
        </>
      )}

      {tab === "advanced" && (
        <>
          <label>
            Default RPC URL
            <input
              value={config.rpc?.defaultUrl ?? ""}
              onChange={(e) => update({ rpc: { ...config.rpc, defaultUrl: e.target.value } })}
              placeholder="https://sepolia.base.org"
            />
          </label>
          <label>
            Batch deposit multiplier
            <input
              type="number"
              min={1}
              value={config.batch?.depositMultiplier ?? ""}
              onChange={(e) =>
                update({
                  batch: {
                    ...config.batch,
                    depositMultiplier: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
            />
          </label>
        </>
      )}

      {tab === "appearance" && (
        <>
          <label>
            Accent color
            <input
              value={config.appearance?.theme?.accent ?? ""}
              onChange={(e) =>
                update({
                  appearance: {
                    ...config.appearance,
                    theme: { ...config.appearance?.theme, accent: e.target.value },
                  },
                })
              }
              placeholder="#0052ff"
            />
          </label>
          <label>
            Pay button label
            <input
              value={config.appearance?.labels?.payToRead ?? ""}
              onChange={(e) =>
                update({
                  appearance: {
                    ...config.appearance,
                    labels: { ...config.appearance?.labels, payToRead: e.target.value },
                  },
                })
              }
            />
          </label>
        </>
      )}

      {errors.length > 0 && (
        <ul className="launa-wizard__error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
