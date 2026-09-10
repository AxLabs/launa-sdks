import { describe, expect, it } from 'vitest'
import { formatRequirementPrice } from './formatPrice.js'
import type { PaymentRequirements } from '@x402/fetch'

function req(asset: string, amount: string, extra?: Record<string, unknown>): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'eip155:8453',
    asset,
    amount,
    payTo: '0x0000000000000000000000000000000000000001',
    maxTimeoutSeconds: 300,
    extra,
  } as PaymentRequirements
}

describe('formatRequirementPrice', () => {
  it('formats Base mainnet / sandbox-fork USDC as dollars', () => {
    expect(
      formatRequirementPrice(req('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', '10000')),
    ).toBe('$0.01 USDC')
  })

  it('formats Base Sepolia USDC as dollars', () => {
    expect(
      formatRequirementPrice(req('0x036CbD53842c5426634e7929541eC2318f3dCF7e', '100000')),
    ).toBe('$0.10 USDC')
  })
})
