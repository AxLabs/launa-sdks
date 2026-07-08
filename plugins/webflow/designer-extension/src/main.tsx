import { StrictMode, useCallback, useState } from "react"
import { createRoot } from "react-dom/client"
import type { BuyerPaywallConfig } from "@axlabs/x402-buyer-plugin-core"
import {
  configToDataAttributes,
  DEFAULT_BUYER_POLICY,
  serializeBuyerConfig,
} from "@axlabs/x402-buyer-plugin-core"
import { BuyerConfigWizard } from "@axlabs/x402-buyer-plugin-editor-ui"
import "@axlabs/x402-buyer-plugin-editor-ui/styles.css"

declare global {
  interface Window {
    webflow?: {
      getSelectedElement: () => Promise<{ setCustomAttribute?: (k: string, v: string) => Promise<void> } | null>
      notify: (opts: { type: string; message: string }) => void
    }
  }
}

function App() {
  const [config, setConfig] = useState<BuyerPaywallConfig>({
    resourceUrl: "https://echo.staging.ax402.io/echo/get?test=1",
    policy: DEFAULT_BUYER_POLICY,
    title: "Continue reading",
    description: "Pay once to unlock this content.",
  })
  const [status, setStatus] = useState<string | null>(null)

  const attachToSelection = useCallback(async () => {
    setStatus(null)
    const webflow = window.webflow
    if (!webflow) {
      setStatus("Webflow Designer API not available.")
      return
    }
    try {
      const el = await webflow.getSelectedElement()
      if (!el?.setCustomAttribute) {
        setStatus("Select an element on the canvas first.")
        return
      }
      const attrs = configToDataAttributes(config)
      for (const [key, value] of Object.entries(attrs)) {
        await el.setCustomAttribute(key, value)
      }
      webflow.notify({ type: "Success", message: "Ax402 paywall config attached." })
      setStatus("Config stored on selected element. Insert Ax402 Paywall DevLink component for runtime UI.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    }
  }, [config])

  return (
    <StrictMode>
      <div style={{ padding: 12, fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Ax402 Paywall</h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, opacity: 0.7 }}>
          Configure buyer-side gateway paywall. Import DevLink library for canvas component.
        </p>
        <BuyerConfigWizard value={config} onChange={setConfig} requireHttps={false} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={attachToSelection}>
            Attach config to selected element
          </button>
          <details>
            <summary style={{ fontSize: 12 }}>Config JSON</summary>
            <pre style={{ fontSize: 10, overflow: "auto" }}>{serializeBuyerConfig(config)}</pre>
          </details>
          {status && <p style={{ fontSize: 12 }}>{status}</p>}
        </div>
      </div>
    </StrictMode>
  )
}

const root = document.getElementById("root")
if (root) createRoot(root).render(<App />)
