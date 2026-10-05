'use client'

import { useCallback, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'
import { inspectBuyerGateway } from '@axlabs/x402-buyer-plugin-core'
import { PAYWALL_FIELD_NAME } from '../fields.js'

export function InspectGatewayField() {
  const gatewayUrl = useFormFields(([fields]) => {
    const path = `${PAYWALL_FIELD_NAME}.gatewayResourceUrl`
    return fields[path]?.value as string | undefined
  })

  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const inspect = useCallback(async () => {
    if (!gatewayUrl?.trim()) {
      setSummary('Enter a gateway resource URL first.')
      return
    }
    setLoading(true)
    const result = await inspectBuyerGateway(gatewayUrl)
    if (result.ok) {
      setSummary(
        `402 OK — schemes: ${result.schemes.join(', ') || '—'}; networks: ${result.networks.join(', ') || '—'}`,
      )
    } else {
      setSummary(result.error ?? `Expected 402, got HTTP ${result.status}`)
    }
    setLoading(false)
  }, [gatewayUrl])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <button type="button" onClick={inspect} disabled={loading}>
        {loading ? 'Inspecting…' : 'Inspect gateway'}
      </button>
      {summary && <p style={{ margin: 0, fontSize: 13 }}>{summary}</p>}
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Sellers create gateway URLs in the{' '}
        <a href="https://launa.io/docs" target="_blank" rel="noreferrer">
          Launa dashboard
        </a>
        .
      </p>
    </div>
  )
}
