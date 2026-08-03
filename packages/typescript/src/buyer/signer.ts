import type { BuyerClientOptions, BuyerSigner, HederaBuyerCredentials } from "./types.js";
import { BuyerDepsError } from "./types.js";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type TypedDataMessage = {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
};

function normalizePrivateKey(key: string): `0x${string}` {
  const trimmed = key.trim();
  if (trimmed.startsWith("0x")) return trimmed as `0x${string}`;
  return `0x${trimmed}` as `0x${string}`;
}

export async function createEvmSignerFromPrivateKey(privateKey: string): Promise<BuyerSigner> {
  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const evmMod = (await import("@x402/evm")) as {
      toClientEvmSigner?: (account: unknown) => BuyerSigner;
    };
    const account = privateKeyToAccount(normalizePrivateKey(privateKey));
    if (evmMod.toClientEvmSigner) {
      return evmMod.toClientEvmSigner(account);
    }
    return account;
  } catch {
    throw new BuyerDepsError(
      "Private key signer requires optional deps: npm install @x402/evm viem",
    );
  }
}

export async function createEvmSignerFromBrowserProvider(
  provider?: Eip1193Provider,
): Promise<BuyerSigner> {
  const eth = provider ?? (globalThis as { ethereum?: Eip1193Provider }).ethereum;
  if (!eth) {
    throw new BuyerDepsError(
      "No wallet detected. Connect MetaMask or use the CLI: ax402 pay url --url ... with AX402_EVM_PRIVATE_KEY",
    );
  }

  try {
    const { createWalletClient, custom } = await import("viem");
    const evmMod = (await import("@x402/evm")) as {
      toClientEvmSigner?: (signer: unknown) => BuyerSigner;
    };
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const address = accounts[0] as `0x${string}` | undefined;
    if (!address) throw new BuyerDepsError("Wallet returned no account");

    const signer = {
      address,
      async signTypedData(message: TypedDataMessage) {
        const walletClient = createWalletClient({
          account: address,
          transport: custom(eth),
        });
        return walletClient.signTypedData({
          account: address,
          domain: message.domain,
          types: message.types,
          primaryType: message.primaryType,
          message: message.message,
        });
      },
    };

    if (evmMod.toClientEvmSigner) {
      return evmMod.toClientEvmSigner(signer);
    }
    return signer;
  } catch (err) {
    if (err instanceof BuyerDepsError) throw err;
    throw new BuyerDepsError(
      "Browser wallet signer requires optional deps: npm install @x402/evm viem",
    );
  }
}

export async function parseHederaPrivateKey(raw: string): Promise<unknown> {
  try {
    const hederaMod = (await import("@x402/hedera")) as {
      PrivateKey: {
        fromStringECDSA: (hex: string) => unknown;
        fromString: (s: string) => unknown;
      };
    };
    const trimmed = raw.trim();
    const hex = trimmed.replace(/^0x/i, "");
    if (/^[0-9a-fA-F]{64}$/.test(hex)) {
      return hederaMod.PrivateKey.fromStringECDSA(hex);
    }
    return hederaMod.PrivateKey.fromString(trimmed);
  } catch {
    throw new BuyerDepsError(
      "Hedera signer requires optional deps: npm install @x402/hedera",
    );
  }
}

export async function createHederaSignerFromCredentials(
  creds: HederaBuyerCredentials,
): Promise<BuyerSigner> {
  try {
    const hederaMod = (await import("@x402/hedera")) as {
      createClientHederaSigner: (
        accountId: string,
        privateKey: unknown,
        config?: { network?: string; nodeUrl?: string },
      ) => BuyerSigner;
    };
    const privateKey = await parseHederaPrivateKey(creds.privateKey);
    return hederaMod.createClientHederaSigner(creds.accountId, privateKey, {
      network: creds.network,
      nodeUrl: creds.nodeUrl,
    });
  } catch (err) {
    if (err instanceof BuyerDepsError) throw err;
    throw new BuyerDepsError(
      "Hedera signer requires optional deps: npm install @x402/hedera",
    );
  }
}

export async function buyerClientFromPrivateKey(
  privateKey: string,
  opts?: BuyerClientOptions,
) {
  const { BuyerClient } = await import("./index.js");
  const signer = await createEvmSignerFromPrivateKey(privateKey);
  return BuyerClient.create(signer, opts);
}

export async function buyerClientFromHederaCredentials(
  creds: HederaBuyerCredentials,
  opts?: BuyerClientOptions,
) {
  const { BuyerClient } = await import("./index.js");
  return BuyerClient.create(undefined, { ...opts, hedera: creds });
}

export async function buyerClientFromEnv(opts?: BuyerClientOptions) {
  const evmKey = process.env.AX402_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
  const hederaAccountId = process.env.HEDERA_ACCOUNT_ID?.trim();
  const hederaPrivateKey = process.env.HEDERA_PRIVATE_KEY?.trim();
  const hederaNetwork = process.env.HEDERA_NETWORK?.trim();

  const envHedera =
    hederaAccountId && hederaPrivateKey
      ? {
          accountId: hederaAccountId,
          privateKey: hederaPrivateKey,
          ...(hederaNetwork ? { network: hederaNetwork } : {}),
        }
      : undefined;

  const merged: BuyerClientOptions = {
    ...opts,
    hedera: opts?.hedera ?? envHedera,
  };

  if (evmKey) {
    const signer = await createEvmSignerFromPrivateKey(evmKey);
    return (await import("./index.js")).BuyerClient.create(signer, merged);
  }

  if (merged.hederaSigner || merged.hedera) {
    return (await import("./index.js")).BuyerClient.create(undefined, merged);
  }

  throw new BuyerDepsError(
    "AX402_EVM_PRIVATE_KEY (or EVM_PRIVATE_KEY) and/or HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY required",
  );
}
