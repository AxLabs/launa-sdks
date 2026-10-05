import type { BuyerPaywallConfig } from "./config.js"

const STORAGE_VERSION = 1

export type StoredBuyerPaywallConfig = {
  v: typeof STORAGE_VERSION
  config: BuyerPaywallConfig
}

export function serializeBuyerConfig(config: BuyerPaywallConfig): string {
  const payload: StoredBuyerPaywallConfig = { v: STORAGE_VERSION, config }
  return JSON.stringify(payload)
}

export function deserializeBuyerConfig(raw: string): BuyerPaywallConfig {
  const parsed = JSON.parse(raw) as StoredBuyerPaywallConfig | BuyerPaywallConfig
  if (typeof parsed === "object" && parsed !== null && "v" in parsed && "config" in parsed) {
    const stored = parsed as StoredBuyerPaywallConfig
    if (stored.v !== STORAGE_VERSION) {
      throw new Error(`Unsupported buyer config version: ${stored.v}`)
    }
    return stored.config
  }
  return parsed as BuyerPaywallConfig
}

export function configToDataAttributes(config: BuyerPaywallConfig): Record<string, string> {
  return {
    "data-launa-resource-url": config.resourceUrl,
    "data-launa-config": serializeBuyerConfig(config),
  }
}

export function configFromDataAttributes(attrs: Record<string, string | undefined>): BuyerPaywallConfig | null {
  const inline = attrs["data-launa-config"]
  if (inline) {
    return deserializeBuyerConfig(inline)
  }
  const url = attrs["data-launa-resource-url"]
  if (!url) return null
  return { resourceUrl: url }
}
