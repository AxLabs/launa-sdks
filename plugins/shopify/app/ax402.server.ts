import { Ax402Client } from "@axlabs/ax402-sdk";
import type { ShopCredentials } from "./crypto.server.js";

export type Ax402PluginConfig = {
  baseUrl: string;
  encryptionSecret: string;
  devMode: boolean;
};

export function getAx402Config(): Ax402PluginConfig {
  return {
    baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
    encryptionSecret: process.env.SHOPIFY_ENCRYPTION_SECRET ?? "dev-secret-change-me",
    devMode: process.env.SHOPIFY_DEV_MODE !== "0",
  };
}

export function createAx402Client(apiKey: string, baseUrl?: string): Ax402Client {
  return new Ax402Client({
    baseUrl: baseUrl ?? getAx402Config().baseUrl,
    apiKey,
  });
}

export function clientFromCredentials(
  creds: ShopCredentials,
  baseUrl?: string,
): Ax402Client {
  return createAx402Client(creds.apiKey, baseUrl);
}
