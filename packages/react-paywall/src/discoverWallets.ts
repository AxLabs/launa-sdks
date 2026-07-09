import type { Eip1193Provider } from './permit2.js'

export type DiscoveredWallet = {
  id: string
  name: string
  icon?: string
  rdns?: string
  provider: Eip1193Provider
}

export type DiscoverWalletsOptions = {
  /** Longer window when the user opens the wallet picker (default 800ms). */
  timeoutMs?: number
  /** Log discovery steps to the console (prefix `[x402-paywall:wallets]`). */
  debug?: boolean
}

let globalWalletDiscoveryDebug = false

export function setWalletDiscoveryDebug(enabled: boolean): void {
  globalWalletDiscoveryDebug = enabled
}

function walletDebugLog(debug: boolean, ...args: unknown[]): void {
  if (!debug) return
  console.log('[x402-paywall:wallets]', ...args)
}

function legacyProviderFlags(provider: LegacyProvider) {
  return {
    isMetaMask: !!provider.isMetaMask,
    isTrust: !!(provider.isTrust || provider.isTrustWallet),
    isCoinbaseWallet: !!provider.isCoinbaseWallet,
    isRabby: !!provider.isRabby,
    isBraveWallet: !!provider.isBraveWallet,
    providerInfo: provider.providerInfo,
  }
}

function summarizeWallet(wallet: DiscoveredWallet, index?: number) {
  const p = wallet.provider as LegacyProvider
  return {
    index,
    id: wallet.id,
    name: wallet.name,
    rdns: wallet.rdns,
    identityKey: walletIdentityKey(wallet),
    score: walletEntryScore(wallet),
    flags: legacyProviderFlags(p),
    providerRef: p,
  }
}

type Eip6963ProviderInfo = {
  uuid: string
  name: string
  icon: string
  rdns: string
}

type Eip6963AnnounceEvent = CustomEvent<{
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
}>

type LegacyProvider = Eip1193Provider & {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isRabby?: boolean
  isBraveWallet?: boolean
  isTrust?: boolean
  isTrustWallet?: boolean
  providerInfo?: { name?: string; rdns?: string; uuid?: string }
}

const DEFAULT_DISCOVERY_MS = 800

function walletIdentityKey(wallet: DiscoveredWallet): string {
  const rdns = wallet.rdns?.toLowerCase() ?? ''
  if (rdns.includes('metamask')) return 'metamask'
  if (rdns.includes('trustwallet') || rdns.includes('trust')) return 'trust'
  if (rdns.includes('coinbase')) return 'coinbase'
  if (rdns.includes('rabby')) return 'rabby'
  if (rdns.includes('neoline') || rdns.includes('neon')) return 'neoline'
  if (rdns.includes('phantom')) return 'phantom'
  if (rdns) return `rdns:${rdns}`

  const name = wallet.name.toLowerCase()
  if (name.includes('metamask')) return 'metamask'
  if (name.includes('trust')) return 'trust'
  if (name.includes('coinbase')) return 'coinbase'
  if (name.includes('rabby')) return 'rabby'
  if (name.includes('neoline') || name.includes('neo line')) return 'neoline'
  return `name:${name}`
}

function walletEntryScore(wallet: DiscoveredWallet): number {
  let score = 0
  if (wallet.icon) score += 4
  if (wallet.rdns) score += 2
  if (!wallet.id.startsWith('legacy-')) score += 1
  return score
}

function upsertWallet(map: Map<string, DiscoveredWallet>, wallet: DiscoveredWallet): void {
  const key = walletIdentityKey(wallet)
  const existing = map.get(key)
  if (!existing || walletEntryScore(wallet) > walletEntryScore(existing)) {
    map.set(key, wallet)
  }
}

/** Trust/Rabby often set isMetaMask for dapp compatibility — check them first. */
function legacyWalletName(provider: LegacyProvider, index: number): string {
  const fromInfo = provider.providerInfo?.name?.trim()
  if (fromInfo) {
    return fromInfo
  }
  if (provider.isTrust || provider.isTrustWallet) return 'Trust Wallet'
  if (provider.isRabby) return 'Rabby'
  if (provider.isCoinbaseWallet) return 'Coinbase Wallet'
  if (provider.isBraveWallet) return 'Brave Wallet'
  if (provider.isMetaMask) return 'MetaMask'
  return `Wallet ${index + 1}`
}

function discoverEip6963(timeoutMs: number, debug: boolean): Promise<DiscoveredWallet[]> {
  if (typeof window === 'undefined') {
    return Promise.resolve([])
  }

  const byIdentity = new Map<string, DiscoveredWallet>()

  const onAnnounce = (event: Event) => {
    const detail = (event as Eip6963AnnounceEvent).detail
    if (!detail?.info?.uuid || !detail.provider) {
      walletDebugLog(debug, 'eip6963: ignored announce (missing uuid/provider)')
      return
    }
    const entry: DiscoveredWallet = {
      id: detail.info.uuid,
      name: detail.info.name,
      icon: detail.info.icon,
      rdns: detail.info.rdns,
      provider: detail.provider,
    }
    walletDebugLog(debug, 'eip6963: announceProvider', summarizeWallet(entry))
    upsertWallet(byIdentity, entry)
  }

  window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener)
  const request = () => window.dispatchEvent(new Event('eip6963:requestProvider'))
  request()
  window.setTimeout(request, 100)
  window.setTimeout(request, 300)

  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener)
      resolve([...byIdentity.values()])
    }, timeoutMs)
  })
}

function collectLegacyProviderList(debug: boolean): LegacyProvider[] {
  const win = window as {
    ethereum?: LegacyProvider & { providers?: LegacyProvider[] }
  }
  const eth = win.ethereum
  if (!eth) {
    walletDebugLog(debug, 'legacy: no window.ethereum')
    return []
  }
  const topFlags = legacyProviderFlags(eth)
  const hasProvidersArray = Array.isArray(eth.providers) && eth.providers.length > 0
  walletDebugLog(debug, 'legacy: window.ethereum', {
    hasProvidersArray,
    providersLength: hasProvidersArray ? eth.providers!.length : 0,
    topLevelFlags: topFlags,
    using: hasProvidersArray ? 'ethereum.providers[]' : 'ethereum (single)',
  })
  if (hasProvidersArray) {
    eth.providers!.forEach((p, i) => {
      walletDebugLog(debug, `legacy: providers[${i}]`, legacyProviderFlags(p))
    })
    return [...eth.providers!]
  }
  return [eth]
}

function discoverLegacyProviders(debug: boolean): DiscoveredWallet[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = collectLegacyProviderList(debug)
  const seen = new Set<Eip1193Provider>()
  const out: DiscoveredWallet[] = []

  for (let i = 0; i < raw.length; i++) {
    const provider = raw[i]
    if (!provider || seen.has(provider)) {
      continue
    }
    seen.add(provider)
    const name = legacyWalletName(provider, i)
    const uuid = provider.providerInfo?.uuid
    const entry: DiscoveredWallet = {
      id: uuid ?? `legacy-${name.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      name,
      rdns: provider.providerInfo?.rdns,
      provider,
    }
    walletDebugLog(debug, 'legacy: mapped entry', summarizeWallet(entry, i))
    out.push(entry)
  }
  return out
}

function mergeDiscovered(
  eip6963: DiscoveredWallet[],
  legacy: DiscoveredWallet[],
  debug: boolean,
): DiscoveredWallet[] {
  const byIdentity = new Map<string, DiscoveredWallet>()
  const announcedKeys = new Set(eip6963.map((w) => walletIdentityKey(w)))
  const hasEip6963MetaMask = announcedKeys.has('metamask')
  const hasEip6963Trust = announcedKeys.has('trust')

  walletDebugLog(debug, 'merge: eip6963 keys', [...announcedKeys])
  walletDebugLog(
    debug,
    'merge: eip6963 entries',
    eip6963.map((w, i) => summarizeWallet(w, i)),
  )

  for (const wallet of eip6963) {
    upsertWallet(byIdentity, wallet)
  }
  for (const wallet of legacy) {
    const key = walletIdentityKey(wallet)
    const flags = legacyProviderFlags(wallet.provider as LegacyProvider)
    if (announcedKeys.has(key)) {
      walletDebugLog(debug, 'merge: skip legacy (same identity as eip6963)', { key, name: wallet.name })
      continue
    }
    if (hasEip6963MetaMask && flags.isMetaMask && !flags.isTrust) {
      walletDebugLog(debug, 'merge: skip legacy isMetaMask (eip6963 MetaMask present)', {
        name: wallet.name,
        key,
        flags,
      })
      continue
    }
    if (hasEip6963Trust && flags.isTrust) {
      walletDebugLog(debug, 'merge: skip legacy Trust (eip6963 Trust present)', {
        name: wallet.name,
        key,
        flags,
      })
      continue
    }
    walletDebugLog(debug, 'merge: add legacy', { key, name: wallet.name, flags })
    upsertWallet(byIdentity, wallet)
  }

  const merged = [...byIdentity.values()].sort((a, b) => a.name.localeCompare(b.name))
  walletDebugLog(debug, 'merge: final list', merged.map((w, i) => summarizeWallet(w, i)))
  return merged
}

/** EIP-6963 + `window.ethereum.providers`; skips legacy duplicates of announced wallets. */
export async function discoverWallets(opts: DiscoverWalletsOptions = {}): Promise<DiscoveredWallet[]> {
  const debug = opts.debug ?? globalWalletDiscoveryDebug
  const timeoutMs = opts.timeoutMs ?? DEFAULT_DISCOVERY_MS
  walletDebugLog(debug, 'discoverWallets start', { timeoutMs })
  const legacy = discoverLegacyProviders(debug)
  const eip6963 = await discoverEip6963(timeoutMs, debug)
  walletDebugLog(
    debug,
    'eip6963: raw announcements',
    eip6963.map((w, i) => summarizeWallet(w, i)),
  )
  const merged = mergeDiscovered(eip6963, legacy, debug)
  walletDebugLog(debug, 'discoverWallets done', { count: merged.length })
  return merged
}

export class WalletSelectionRequiredError extends Error {
  readonly wallets: DiscoveredWallet[]

  constructor(wallets: DiscoveredWallet[]) {
    super('Multiple wallets detected. Pass a wallet id to connectWallet.')
    this.name = 'WalletSelectionRequiredError'
    this.wallets = wallets
  }
}
