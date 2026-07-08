import { framer } from "@framer/plugin"
import { StrictMode, useCallback, useState } from "react"
import { createRoot } from "react-dom/client"
import type { BuyerPaywallConfig } from "@axlabs/x402-buyer-plugin-core"
import { DEFAULT_BUYER_POLICY, serializeBuyerConfig } from "@axlabs/x402-buyer-plugin-core"
import { BuyerConfigWizard } from "@axlabs/x402-buyer-plugin-editor-ui"
import "@axlabs/x402-buyer-plugin-editor-ui/styles.css"

import framerImplSource from "./Ax402PaywallFramer.template.tsx?raw"

const FRAMER_IMPL_FILE = "Ax402PaywallFramer.tsx"

const COMPONENT_FILE = "Ax402Paywall.tsx"

const COMPONENT_SOURCE = `import { addPropertyControls, ControlType } from "framer"
import Ax402PaywallFramer from "./Ax402PaywallFramer"

export default Ax402PaywallFramer

addPropertyControls(Ax402PaywallFramer, {
  resourceUrl: { type: ControlType.String, title: "Gateway URL", defaultValue: "https://echo.staging.ax402.io/echo/get?test=1" },
  title: { type: ControlType.String, title: "Title", defaultValue: "Continue reading" },
  description: { type: ControlType.String, title: "Description", defaultValue: "Pay once to unlock this content." },
  preferredNetworks: { type: ControlType.String, title: "Preferred networks", defaultValue: "eip155:84532" },
  allowedAssets: { type: ControlType.String, title: "Allowed assets", defaultValue: "" },
  allowedSchemes: { type: ControlType.String, title: "Allowed schemes", defaultValue: "exact,batch-settlement" },
  rpcUrl: { type: ControlType.String, title: "RPC URL", defaultValue: "https://sepolia.base.org" },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#0052ff" },
  payLabel: { type: ControlType.String, title: "Pay button label", defaultValue: "Pay to read" },
})
`

framer.showUI({
  position: "top right",
  width: 420,
  height: 560,
})

function App() {
  const [config, setConfig] = useState<BuyerPaywallConfig>({
    resourceUrl: "https://echo.staging.ax402.io/echo/get?test=1",
    policy: DEFAULT_BUYER_POLICY,
    title: "Continue reading",
    description: "Pay once to unlock this content.",
  })
  const [status, setStatus] = useState<string | null>(null)

  const insertComponent = useCallback(async () => {
    setStatus(null)
    try {
      const files = await framer.getCodeFiles()
      let codeFile = files.find((f) => f.name === COMPONENT_FILE)
      const implFile = files.find((f) => f.name === FRAMER_IMPL_FILE)
      if (implFile) {
        await implFile.setFileContent(framerImplSource)
      } else {
        await framer.createCodeFile(FRAMER_IMPL_FILE, framerImplSource, { editViaPlugin: true })
      }

      if (codeFile) {
        codeFile = await codeFile.setFileContent(COMPONENT_SOURCE)
      } else {
        codeFile = await framer.createCodeFile(COMPONENT_FILE, COMPONENT_SOURCE, { editViaPlugin: true })
      }

      const componentExport = codeFile.exports.find(
        (e): e is { type: "component"; insertURL: string } => e.type === "component",
      )
      if (!componentExport?.insertURL) {
        setStatus("Code file created but no component export found. Open the code file in Framer and save once.")
        return
      }

      await framer.addComponentInstance({
        url: componentExport.insertURL,
        attributes: {
          controls: {
            resourceUrl: config.resourceUrl,
            title: config.title ?? "Continue reading",
            description: config.description ?? "",
            preferredNetworks: config.policy?.preferredNetworks ?? "eip155:84532",
            allowedAssets: config.policy?.allowedAssets ?? "",
            allowedSchemes: config.policy?.allowedSchemes ?? "exact,batch-settlement",
            rpcUrl: config.rpc?.defaultUrl ?? "https://sepolia.base.org",
            accent: config.appearance?.theme?.accent ?? "#0052ff",
            payLabel: config.appearance?.labels?.payToRead ?? "Pay to read",
          },
        },
      })

      await framer.setCustomCode({
        html: `<link rel="stylesheet" href="https://unpkg.com/@axlabs/x402-react-paywall/styles.css" />`,
        location: "headEnd",
      })

      setStatus("Paywall component inserted. Adjust props in the properties panel.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    }
  }, [config])

  return (
    <StrictMode>
      <div style={{ padding: 12 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Ax402 Paywall</h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, opacity: 0.7 }}>
          Buyer-side gateway paywall — routes payments through Ax402.
        </p>
        <BuyerConfigWizard value={config} onChange={setConfig} requireHttps={false} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={insertComponent}>
            Insert paywall on canvas
          </button>
          <details>
            <summary style={{ fontSize: 12, cursor: "pointer" }}>Serialized config</summary>
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
