import type { Config, Plugin } from "payload"
import { createPaywallGroupField } from "./fields.js"

export type Ax402PayloadPluginOptions = {
  enabled?: boolean
  /** Collection slugs to inject paywall fields into. */
  collections?: string[]
}

export const ax402PayloadPlugin =
  (pluginOptions: Ax402PayloadPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig

    const targetSlugs = new Set(pluginOptions.collections ?? ["posts", "pages"])
    const paywallField = createPaywallGroupField()

    const collections = (incomingConfig.collections ?? []).map((collection) => {
      if (!targetSlugs.has(collection.slug)) return collection
      return {
        ...collection,
        fields: [...(collection.fields ?? []), paywallField],
      }
    })

    return {
      ...incomingConfig,
      collections,
    }
  }

export { createPaywallGroupField, paywallFieldsFromDoc, PAYWALL_FIELD_NAME } from "./fields.js"
export type { Ax402PaywallDocFields } from "./fields.js"
