import type { PaymentRequirements } from '@x402/fetch'
import type { InspectResult } from './types.js'

export type PaywallAgentManifest = {
  protocol: 'x402'
  role: 'buyer-instructions'
  message: string
  resource: { url: string; method: string }
  access: {
    unpaidHttpStatus: 402
    flow: string[]
    clientLibraries: string[]
    retryHeaders: string[]
  }
  payment?: {
    status: number
    accepts: PaymentRequirements[]
    recommended: PaymentRequirements | null
  }
}

export type BuildAgentManifestOptions = {
  resourceUrl: string
  method?: string
  instructions?: string
  inspect?: Pick<InspectResult, 'paymentRequired' | 'selection' | 'status'>
}

export const DEFAULT_AGENT_MESSAGE =
  'This content is protected by the x402 payment protocol. Automated agents and scripts can unlock it by paying via x402: HTTP GET the resource URL; on 402 Payment Required, parse payment requirements, sign with an x402 buyer client, and retry the same request with the payment signature header.'

export function resolveResourceUrl(resourceUrl: string): string {
  if (typeof window === 'undefined') {
    return resourceUrl
  }
  try {
    return new URL(resourceUrl, window.location.origin).href
  } catch {
    return resourceUrl
  }
}

export function buildPaywallAgentManifest(opts: BuildAgentManifestOptions): PaywallAgentManifest {
  const url = resolveResourceUrl(opts.resourceUrl)
  const method = (opts.method ?? 'GET').toUpperCase()
  const manifest: PaywallAgentManifest = {
    protocol: 'x402',
    role: 'buyer-instructions',
    message: opts.instructions?.trim() || DEFAULT_AGENT_MESSAGE,
    resource: { url, method },
    access: {
      unpaidHttpStatus: 402,
      flow: [
        `${method} ${url}`,
        'If the response is 402 Payment Required, read PAYMENT-REQUIRED (response body and/or headers) for accepts[]',
        'Pick an acceptable option (scheme, network, asset, amount, payTo)',
        'Sign payment with a wallet or configured EVM private key',
        'Retry the same request with PAYMENT-SIGNATURE or X-PAYMENT headers',
      ],
      clientLibraries: [
        '@x402/fetch (TypeScript)',
        'github.com/x402-foundation/x402/go (Go)',
        '@launaio/sdk buyer (TypeScript/Python)',
      ],
      retryHeaders: ['PAYMENT-SIGNATURE', 'X-PAYMENT'],
    },
  }

  if (opts.inspect?.paymentRequired) {
    manifest.payment = {
      status: opts.inspect.status,
      accepts: opts.inspect.paymentRequired.accepts ?? [],
      recommended: opts.inspect.selection?.selected ?? null,
    }
  }

  return manifest
}
