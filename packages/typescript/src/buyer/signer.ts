import type { BuyerClientOptions, BuyerSigner } from "./types.js";
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
      "No wallet detected. Connect MetaMask or use the CLI: launa pay url --url ... with LAUNA_EVM_PRIVATE_KEY",
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

export async function buyerClientFromPrivateKey(
  privateKey: string,
  opts?: BuyerClientOptions,
) {
  const { BuyerClient } = await import("./index.js");
  const signer = await createEvmSignerFromPrivateKey(privateKey);
  return BuyerClient.create(signer, opts);
}

export async function buyerClientFromEnv(opts?: BuyerClientOptions) {
  const key = process.env.LAUNA_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
  if (!key) {
    throw new BuyerDepsError("LAUNA_EVM_PRIVATE_KEY or EVM_PRIVATE_KEY required");
  }
  return buyerClientFromPrivateKey(key, opts);
}
