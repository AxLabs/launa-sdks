import type { PaymentRequirements } from '@x402/fetch'
import type { PaywallPolicy, SelectionResult, SelectionStrategy } from './types.js'

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function createSelectionResult(
  accepts: PaymentRequirements[],
  policy: PaywallPolicy = {},
): SelectionResult {
  const maxAmount =
    policy.maxAmount?.trim() && policy.maxAmount.trim().length > 0
      ? BigInt(policy.maxAmount.trim())
      : null
  const allowedSchemes = parseCsv(policy.allowedSchemes ?? 'exact,batch-settlement').map((s) =>
    s.toLowerCase(),
  )
  const preferredSchemes = parseCsv(policy.preferredSchemes ?? '').map((s) => s.toLowerCase())
  const allowedChains = parseCsv(policy.allowedChains ?? '').map((c) => c.toLowerCase())
  const allowedAssets = parseCsv(policy.allowedAssets ?? '').map((a) => a.toLowerCase())
  const allowedPayTo = parseCsv(policy.allowedPayTo ?? '').map((a) => a.toLowerCase())
  const preferredNetworks = parseCsv(policy.preferredNetworks ?? '').map((n) => n.toLowerCase())
  const preferredAssets = parseCsv(policy.preferredAssets ?? '').map((a) => a.toLowerCase())
  const preferredTransferMethods = parseCsv(policy.preferredTransferMethods ?? '').map((m) =>
    m.toLowerCase(),
  )
  const strategy: SelectionStrategy = policy.strategy ?? 'preference-first'

  const evaluated = accepts.map((requirement, index) => {
    const rejectionReasons: string[] = []
    const scheme = requirement.scheme.toLowerCase()
    if (allowedSchemes.length > 0 && !allowedSchemes.includes(scheme)) {
      rejectionReasons.push(`scheme "${requirement.scheme}" not in allowed list`)
    }
    if (maxAmount !== null) {
      try {
        const amount = BigInt(requirement.amount)
        if (amount > maxAmount) {
          rejectionReasons.push(`amount ${requirement.amount} exceeds maxAmount ${maxAmount}`)
        }
      } catch {
        rejectionReasons.push(`invalid amount "${requirement.amount}"`)
      }
    }
    if (allowedChains.length > 0 && !allowedChains.includes(requirement.network.toLowerCase())) {
      rejectionReasons.push(`network ${requirement.network} not in allowed list`)
    }
    if (allowedAssets.length > 0 && !allowedAssets.includes(requirement.asset.toLowerCase())) {
      rejectionReasons.push(`asset ${requirement.asset} not in allowed list`)
    }
    if (allowedPayTo.length > 0 && !allowedPayTo.includes(requirement.payTo.toLowerCase())) {
      rejectionReasons.push(`payTo ${requirement.payTo} not in allowed list`)
    }

    const transferMethodRaw = requirement.extra?.assetTransferMethod
    const transferMethod =
      typeof transferMethodRaw === 'string'
        ? transferMethodRaw.toLowerCase()
        : 'eip3009'

    let score = 0
    const schemeRank = preferredSchemes.indexOf(scheme)
    if (schemeRank >= 0) {
      score += (preferredSchemes.length - schemeRank) * 10_000
    }
    const networkRank = preferredNetworks.indexOf(requirement.network.toLowerCase())
    if (networkRank >= 0) {
      score += (preferredNetworks.length - networkRank) * 1000
    }
    const assetRank = preferredAssets.indexOf(requirement.asset.toLowerCase())
    if (assetRank >= 0) {
      score += (preferredAssets.length - assetRank) * 100
    }
    const methodRank = preferredTransferMethods.indexOf(transferMethod)
    if (methodRank >= 0) {
      score += (preferredTransferMethods.length - methodRank) * 10
    }

    return { index, requirement, score, rejectionReasons }
  })

  const accepted = evaluated.filter((item) => item.rejectionReasons.length === 0)
  if (strategy === 'preference-first') {
    accepted.sort((left, right) => right.score - left.score || left.index - right.index)
  }

  const selected = accepted[0]
  return {
    selected: selected?.requirement ?? null,
    selectedIndex: selected?.index ?? -1,
    rejected: evaluated
      .filter((item) => item.rejectionReasons.length > 0)
      .map((item) => ({
        index: item.index,
        reason: item.rejectionReasons.join('; '),
        requirement: item.requirement,
      })),
  }
}
