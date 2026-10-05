import { LaunaClient } from "@axlabs/launa-sdk";
import type { ShopCredentials } from "./crypto.server.js";

export type LaunaPluginConfig = {
  baseUrl: string;
  encryptionSecret: string;
  devMode: boolean;
};

export function getLaunaConfig(): LaunaPluginConfig {
  return {
    baseUrl: process.env.LAUNA_BASE_URL ?? "http://api.localhost:8090",
    encryptionSecret: process.env.SHOPIFY_ENCRYPTION_SECRET ?? "dev-secret-change-me",
    devMode: process.env.SHOPIFY_DEV_MODE !== "0",
  };
}

export function createLaunaClient(apiKey: string, baseUrl?: string): LaunaClient {
  return new LaunaClient({
    baseUrl: baseUrl ?? getLaunaConfig().baseUrl,
    apiKey,
  });
}

export function clientFromCredentials(
  creds: ShopCredentials,
  baseUrl?: string,
): LaunaClient {
  return createLaunaClient(creds.apiKey, baseUrl);
}
