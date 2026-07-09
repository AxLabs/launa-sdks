import { useCallback, useState } from 'react'
import { usePaywall } from './PaywallContext.js'
import type { UnlockResult } from './types.js'

export function usePaidFetch() {
  const { inspect, unlock, walletAddress, connectWallet } = usePaywall()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<UnlockResult | null>(null)

  const paidFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      setLoading(true)
      setError(null)
      try {
        if (!walletAddress) {
          await connectWallet()
        }
        const result = await unlock(url, init)
        setLastResult(result)
        if (result.status >= 400) {
          throw new Error(`Request failed: HTTP ${result.status}`)
        }
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [connectWallet, unlock, walletAddress],
  )

  return {
    inspect,
    paidFetch,
    unlock,
    walletAddress,
    connectWallet,
    loading,
    error,
    lastResult,
  }
}
