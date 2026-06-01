import type { BuyerClientOptions, BuyerSigner } from "./types.js";
import { BuyerDepsError } from "./types.js";

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

export async function buyerClientFromPrivateKey(
  privateKey: string,
  opts?: BuyerClientOptions,
) {
  const { BuyerClient } = await import("./index.js");
  const signer = await createEvmSignerFromPrivateKey(privateKey);
  return BuyerClient.create(signer, opts);
}

export async function buyerClientFromEnv(opts?: BuyerClientOptions) {
  const key = process.env.AX402_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
  if (!key) {
    throw new BuyerDepsError("AX402_EVM_PRIVATE_KEY or EVM_PRIVATE_KEY required");
  }
  return buyerClientFromPrivateKey(key, opts);
}
