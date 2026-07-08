import { inspectGatewayUrl, type InspectGatewayResult } from "@axlabs/ax402-sdk/shell"

export type { InspectGatewayResult }

export type BuyerInspectSummary = {
  ok: boolean
  status: number
  url: string
  schemes: string[]
  networks: string[]
  amounts: string[]
  error?: string
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export async function inspectBuyerGateway(
  url: string,
  fetchFn?: typeof fetch,
): Promise<BuyerInspectSummary> {
  try {
    const result = await inspectGatewayUrl(url, "GET", fetchFn)
    if (result.status !== 402) {
      return {
        ok: false,
        status: result.status,
        url,
        schemes: [],
        networks: [],
        amounts: [],
        error: `Expected HTTP 402, got ${result.status}`,
      }
    }
    const paymentRequired = result.paymentRequired as
      | { accepts?: Array<{ scheme?: string; network?: string; maxAmountRequired?: string }> }
      | undefined
    const accepts = paymentRequired?.accepts ?? []
    return {
      ok: true,
      status: result.status,
      url,
      schemes: unique(accepts.map((a) => a.scheme ?? "")),
      networks: unique(accepts.map((a) => a.network ?? "")),
      amounts: unique(accepts.map((a) => a.maxAmountRequired ?? "")),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      status: 0,
      url,
      schemes: [],
      networks: [],
      amounts: [],
      error: message,
    }
  }
}

export { inspectGatewayUrl }
