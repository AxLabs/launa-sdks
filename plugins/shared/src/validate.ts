import type { BuyerPaywallConfig } from "./config.js"

export type ConfigValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] }

export function validateResourceUrl(url: string, requireHttps = true): ConfigValidationResult {
  const errors: string[] = []
  if (!url.trim()) {
    errors.push("resourceUrl is required")
    return { ok: false, errors }
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    errors.push("resourceUrl must be a valid URL")
    return { ok: false, errors }
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    errors.push("resourceUrl must use http or https")
  }
  if (requireHttps && parsed.protocol !== "https:") {
    errors.push("resourceUrl must use https in production")
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}

export function validateBuyerConfig(
  config: Partial<BuyerPaywallConfig>,
  opts?: { requireHttps?: boolean },
): ConfigValidationResult {
  const errors: string[] = []
  if (!config.resourceUrl) {
    errors.push("resourceUrl is required")
  } else {
    const urlCheck = validateResourceUrl(config.resourceUrl, opts?.requireHttps ?? true)
    if (!urlCheck.ok) errors.push(...urlCheck.errors)
  }
  if (config.batch?.depositMultiplier !== undefined && config.batch.depositMultiplier < 1) {
    errors.push("batch.depositMultiplier must be >= 1")
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}
