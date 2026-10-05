import { describe, expect, it } from "vitest"
import {
  configFromDataAttributes,
  configToDataAttributes,
  deserializeBuyerConfig,
  serializeBuyerConfig,
} from "./serialize.js"
import type { BuyerPaywallConfig } from "./config.js"

const sample: BuyerPaywallConfig = {
  resourceUrl: "https://echo.staging.launa.io/echo/get?test=1",
  policy: { preferredNetworks: "eip155:84532" },
  title: "Unlock",
}

describe("serializeBuyerConfig", () => {
  it("round-trips config", () => {
    const raw = serializeBuyerConfig(sample)
    expect(deserializeBuyerConfig(raw)).toEqual(sample)
  })

  it("maps data attributes", () => {
    const attrs = configToDataAttributes(sample)
    expect(configFromDataAttributes(attrs)).toEqual(sample)
  })

  it("falls back to resource URL only", () => {
    expect(
      configFromDataAttributes({ "data-launa-resource-url": sample.resourceUrl }),
    ).toEqual({ resourceUrl: sample.resourceUrl })
  })
})
