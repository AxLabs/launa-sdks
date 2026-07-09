import { useEffect, useMemo } from 'react'
import { buildPaywallAgentManifest, resolveResourceUrl } from './agentDiscovery.js'
import { formatRequirementPrice } from './formatPrice.js'
import type { InspectResult } from './types.js'
import type { PaywallAppearance } from './appearance.js'
import { usePaywallAppearance } from './appearanceContext.js'

export type PaywallAgentDiscoveryProps = {
  resourceUrl: string
  requestInit?: RequestInit
  instructions?: string
  inspect?: Pick<InspectResult, 'paymentRequired' | 'selection' | 'status'>
  enabled?: boolean
  appearance?: Partial<PaywallAppearance>
  className?: string
}

export function PaywallAgentDiscovery({
  resourceUrl,
  requestInit,
  instructions,
  inspect,
  enabled = true,
  appearance,
  className,
}: PaywallAgentDiscoveryProps) {
  const { slot, labels } = usePaywallAppearance(appearance)
  const method = (requestInit?.method ?? 'GET').toUpperCase()
  const absoluteUrl = resolveResourceUrl(resourceUrl)
  const manifest = useMemo(
    () => buildPaywallAgentManifest({ resourceUrl, method, instructions, inspect }),
    [resourceUrl, method, instructions, inspect],
  )

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return
    }
    const metas: HTMLMetaElement[] = []
    const add = (name: string, content: string) => {
      const el = document.createElement('meta')
      el.setAttribute('name', name)
      el.setAttribute('content', content)
      document.head.appendChild(el)
      metas.push(el)
    }
    add('x402:protected', 'true')
    add('x402:resource', absoluteUrl)
    add('x402:protocol', 'x402')
    add('x402:payment-required', '402')
    return () => {
      for (const el of metas) {
        el.remove()
      }
    }
  }, [enabled, absoluteUrl])

  if (!enabled) {
    return null
  }

  const recommended = manifest.payment?.recommended

  return (
    <aside
      id="x402-agent-instructions"
      className={slot('agent', className)}
      data-x402-protected="true"
      data-x402-resource={absoluteUrl}
      aria-label="x402 payment instructions for automated clients"
    >
      <h3 className={slot('agentTitle')}>{labels.agentTitle}</h3>
      <p className={slot('agentSummary')}>{manifest.message}</p>
      <p className={slot('agentResource')}>
        <strong>Protected resource:</strong>{' '}
        <code>
          {method} {absoluteUrl}
        </code>
      </p>
      <ol className={slot('agentSteps')}>
        {manifest.access.flow.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {recommended ? (
        <p className={slot('agentOffer')}>
          <strong>Observed payment offer (from 402 inspect):</strong>{' '}
          {formatRequirementPrice(recommended)} on {recommended.network}
        </p>
      ) : (
        <p className={slot('agentOffer')}>
          <strong>Payment details:</strong> fetch the resource URL to receive 402 accepts[] (not yet
          loaded in this page).
        </p>
      )}
      <p className={slot('agentLibs')}>
        <strong>Buyer libraries:</strong> {manifest.access.clientLibraries.join('; ')}
      </p>
      <script
        type="application/json"
        id="x402-agent-manifest"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(manifest) }}
      />
    </aside>
  )
}
