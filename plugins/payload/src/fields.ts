import type { Field, GroupField } from "payload"
import type { BuyerPaywallPolicy } from "@axlabs/x402-buyer-plugin-core"

export const PAYWALL_FIELD_NAME = "ax402Paywall"

export type Ax402PaywallDocFields = {
  paywallEnabled?: boolean
  gatewayResourceUrl?: string
  paywallPolicy?: BuyerPaywallPolicy
  paywallTeaser?: unknown
}

export function createPaywallGroupField(): GroupField {
  return {
    name: PAYWALL_FIELD_NAME,
    type: "group",
    label: "Ax402 Paywall",
    admin: {
      description: "Gate this document behind an Ax402 gateway URL (buyer-side x402 payment).",
    },
    fields: [
      {
        name: "paywallEnabled",
        type: "checkbox",
        label: "Enable paywall",
        defaultValue: false,
      },
      {
        name: "gatewayResourceUrl",
        type: "text",
        label: "Gateway resource URL",
        admin: {
          condition: (_, siblingData) => siblingData?.paywallEnabled === true,
          description: "Full gateway URL, e.g. https://my-api.ax402.io/v1/posts/slug",
        },
      },
      {
        name: "paywallPolicy",
        type: "json",
        label: "Paywall policy override",
        admin: {
          condition: (_, siblingData) => siblingData?.paywallEnabled === true,
          description: "Optional PaywallPolicy JSON (networks, assets, schemes).",
        },
      },
      {
        name: "paywallTeaser",
        type: "textarea",
        label: "Teaser (shown before payment)",
        admin: {
          condition: (_, siblingData) => siblingData?.paywallEnabled === true,
        },
      },
      {
        name: "inspectGateway",
        type: "ui",
        admin: {
          condition: (_, siblingData) => siblingData?.paywallEnabled === true,
          components: {
            Field: "@axlabs/ax402-payload/client#InspectGatewayField",
          },
        },
      },
    ] as Field[],
  }
}

export function paywallFieldsFromDoc(doc: Record<string, unknown>): {
  enabled: boolean
  gatewayResourceUrl?: string
  policy?: BuyerPaywallPolicy
  teaser?: string
} {
  const group = doc[PAYWALL_FIELD_NAME] as Ax402PaywallDocFields | undefined
  return {
    enabled: group?.paywallEnabled === true,
    gatewayResourceUrl: group?.gatewayResourceUrl,
    policy: group?.paywallPolicy,
    teaser: typeof group?.paywallTeaser === "string" ? group.paywallTeaser : undefined,
  }
}
