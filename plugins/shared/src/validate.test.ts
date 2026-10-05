import { describe, expect, it } from "vitest"
import { validateBuyerConfig, validateResourceUrl } from "./validate.js"

describe("validateResourceUrl", () => {
  it("accepts https URLs", () => {
    expect(validateResourceUrl("https://echo.staging.launa.io/echo/get")).toEqual({ ok: true })
  })

  it("rejects http in production mode", () => {
    const result = validateResourceUrl("http://localhost/echo", true)
    expect(result.ok).toBe(false)
  })

  it("allows http when requireHttps is false", () => {
    expect(validateResourceUrl("http://localhost/echo", false)).toEqual({ ok: true })
  })
})

describe("validateBuyerConfig", () => {
  it("requires resourceUrl", () => {
    const result = validateBuyerConfig({})
    expect(result.ok).toBe(false)
  })
})
