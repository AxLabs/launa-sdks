import type { PaymentRequirements } from '@x402/fetch'

const USDC_BASE_SEPOLIA = '0x036cbd53842c5426634e7929541eC2318f3dCF7e'.toLowerCase()
const HBAR = '0.0.0'
const HEDERA_USDC = new Set(['0.0.429274', '0.0.456858'])

export function formatRequirementPrice(req: PaymentRequirements): string {
  try {
    const amount = BigInt(req.amount)
    const asset = req.asset.toLowerCase()
    if (asset === USDC_BASE_SEPOLIA || HEDERA_USDC.has(asset)) {
      const human = Number(amount) / 1_000_000
      return `$${human.toFixed(human < 0.01 ? 4 : 2)} USDC`
    }
    if (asset === HBAR) {
      const hbar = Number(amount) / 100_000_000
      return `${hbar.toFixed(hbar < 0.01 ? 4 : 2)} HBAR`
    }
    const extraName = req.extra?.name
    if (typeof extraName === 'string' && extraName.length > 0) {
      return `${amount.toString()} ${extraName}`
    }
    return `${amount.toString()} (smallest units)`
  } catch {
    return req.amount
  }
}
